/**
 * Tree Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'trees' collection.
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

const COLLECTION_NAME = "trees";
const LOCAL_STORAGE_KEY = "lawal_trees";

function getLocalTrees() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated trees:", e);
    return [];
  }
}

function saveLocalTrees(trees) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trees));
  } catch (e) {
    console.error("Error writing simulated trees:", e);
  }
}

/**
 * Creates a new tree.
 *
 * @param {object} data - Tree data { name, description, coverImage, themeColor }
 * @returns {Promise<string>} Created tree ID.
 */
export async function create(data) {
  if (!data || !data.name) {
    throw new Error("Tree name is required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const treeId = data.treeId || data.id || `tree-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    id: treeId,
    treeId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, treeId), finalData);
      await logAction("CREATE", COLLECTION_NAME, treeId, null, finalData);
      return treeId;
    }
  } catch (error) {
    handleBackendError("treeRepository.create", error);
  }

  // Local Storage Fallback
  const trees = getLocalTrees();
  trees.push(finalData);
  saveLocalTrees(trees);
  await logAction("CREATE", COLLECTION_NAME, treeId, null, finalData);
  return treeId;
}

/**
 * Updates an existing tree.
 *
 * @param {string} id - Tree ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error(`Tree with ID [${id}] not found.`);
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
    handleBackendError("treeRepository.update", error);
  }

  // Local Storage Fallback
  const trees = getLocalTrees();
  const idx = trees.findIndex(t => t.treeId === id || t.id === id);
  if (idx > -1) {
    const updatedFull = { ...trees[idx], ...finalUpdate };
    trees[idx] = updatedFull;
    saveLocalTrees(trees);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a tree.
 *
 * @param {string} id - Tree ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteTree(id) {
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
    handleBackendError("treeRepository.deleteTree", error);
  }

  // Local Storage Fallback
  const trees = getLocalTrees();
  const filtered = trees.filter(t => t.treeId !== id && t.id !== id);
  saveLocalTrees(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds a tree by ID.
 *
 * @param {string} id - Tree ID.
 * @returns {Promise<object|null>} Tree details or null.
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
    handleBackendError("treeRepository.findById", error);
  }

  const trees = getLocalTrees();
  return trees.find(t => t.treeId === id || t.id === id) || null;
}

/**
 * Retrieves all trees.
 *
 * @returns {Promise<object[]>} Array of trees.
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
    handleBackendError("treeRepository.findAll", error);
  }

  return getLocalTrees();
}
