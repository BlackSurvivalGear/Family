/**
 * Document Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'documents' collection.
 */

import { db, handleBackendError } from "../firebase/firebase.js";
import { getCurrentUser } from "../firebase/auth.js";
import { logAction } from "./auditLogRepository.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = "documents";
const LOCAL_STORAGE_KEY = "lawal_documents_records";

function getLocalDocuments() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated documents:", e);
    return [];
  }
}

function saveLocalDocuments(docs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error("Error writing simulated documents:", e);
  }
}

/**
 * Creates a new document record.
 *
 * @param {object} data - Document details { title, fileUrl, category, size, type, etc. }
 * @returns {Promise<string>} Created document ID.
 */
export async function create(data) {
  if (!data || !data.title || !data.fileUrl) {
    throw new Error("Document title and fileUrl are required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const documentId = data.documentId || `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    documentId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, documentId), finalData);
      await logAction("CREATE", COLLECTION_NAME, documentId, null, finalData);
      return documentId;
    }
  } catch (error) {
    handleBackendError("documentRepository.create", error);
  }

  // Local Storage Fallback
  const docs = getLocalDocuments();
  docs.push(finalData);
  saveLocalDocuments(docs);
  await logAction("CREATE", COLLECTION_NAME, documentId, null, finalData);
  return documentId;
}

/**
 * Updates an existing document record.
 *
 * @param {string} id - Document record ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error("Document record not found.");
  }

  const updatedAt = new Date().toISOString();
  const finalUpdate = {
    ...updateData,
    updatedAt
  };

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, finalUpdate);
      const updatedFull = { ...current, ...finalUpdate };
      await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
      return true;
    }
  } catch (error) {
    handleBackendError("documentRepository.update", error);
  }

  // Local Storage Fallback
  const docs = getLocalDocuments();
  const idx = docs.findIndex(d => d.documentId === id);
  if (idx > -1) {
    const updatedFull = { ...docs[idx], ...finalUpdate };
    docs[idx] = updatedFull;
    saveLocalDocuments(docs);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a document record.
 *
 * @param {string} id - Document record ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteDocument(id) {
  const current = await findById(id);
  if (!current) {
    return false;
  }

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      await logAction("DELETE", COLLECTION_NAME, id, current, null);
      return true;
    }
  } catch (error) {
    handleBackendError("documentRepository.delete", error);
  }

  // Local Storage Fallback
  const docs = getLocalDocuments();
  const filtered = docs.filter(d => d.documentId !== id);
  saveLocalDocuments(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds a document record by ID.
 *
 * @param {string} id - Document record ID.
 * @returns {Promise<object|null>} Document record or null.
 */
export async function findById(id) {
  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    }
  } catch (error) {
    handleBackendError("documentRepository.findById", error);
  }

  const docs = getLocalDocuments();
  return docs.find(d => d.documentId === id) || null;
}

/**
 * Retrieves all document records.
 *
 * @returns {Promise<object[]>} Array of document records.
 */
export async function findAll() {
  try {
    if (db) {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data());
      });
      return results;
    }
  } catch (error) {
    handleBackendError("documentRepository.findAll", error);
  }

  return getLocalDocuments();
}

/**
 * Searches document records.
 *
 * @param {object} criteria - Search criteria { queryStr, category, type }
 * @returns {Promise<object[]>} Matching document records.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.category) {
    filtered = filtered.filter(d => d.category === criteria.category);
  }

  if (criteria.type) {
    filtered = filtered.filter(d => d.type && d.type.toLowerCase() === criteria.type.toLowerCase());
  }

  if (criteria.queryStr) {
    const qStr = criteria.queryStr.toLowerCase().trim();
    filtered = filtered.filter(d => {
      const title = (d.title || "").toLowerCase();
      const desc = (d.description || "").toLowerCase();
      return title.includes(qStr) || desc.includes(qStr);
    });
  }

  return filtered;
}
