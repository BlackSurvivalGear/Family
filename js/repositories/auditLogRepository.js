/**
 * Audit Log Repository Module
 * Provides support to record, retrieve, and search audit logs.
 */

import { db, handleBackendError } from "../firebase/firebase.js";
import { getCurrentUser } from "../firebase/auth.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = "auditLogs";
const LOCAL_STORAGE_KEY = "lawal_audit_logs";

function getLocalLogs() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated audit logs:", e);
    return [];
  }
}

function saveLocalLogs(logs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Error writing simulated audit logs:", e);
  }
}

/**
 * Creates a new audit log.
 *
 * @param {object} data - Log data { action, collection, documentId, oldValue, newValue, userId, timestamp }
 * @returns {Promise<string>} The generated audit log document ID.
 */
export async function create(data) {
  const user = getCurrentUser();
  const userId = data.userId || (user ? user.uid : "system");
  const timestamp = data.timestamp || new Date().toISOString();

  const auditData = {
    userId,
    action: data.action || "UNKNOWN",
    collection: data.collection || "UNKNOWN",
    documentId: data.documentId || "",
    oldValue: data.oldValue !== undefined ? JSON.parse(JSON.stringify(data.oldValue)) : null,
    newValue: data.newValue !== undefined ? JSON.parse(JSON.stringify(data.newValue)) : null,
    timestamp
  };

  try {
    if (db) {
      console.log(`[Audit Log Repository] Writing audit log to Firestore for document [${auditData.documentId}]...`);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), auditData);
      return docRef.id;
    }
  } catch (error) {
    handleBackendError("auditLogRepository.create", error);
  }

  // Local/Offline Fallback
  console.log(`[Audit Log Repository] (Simulated) Writing audit log for document [${auditData.documentId}]...`);
  const logs = getLocalLogs();
  const simulatedId = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const localRecord = { auditLogId: simulatedId, ...auditData };
  logs.unshift(localRecord);
  saveLocalLogs(logs);
  return simulatedId;
}

/**
 * Finds an audit log by ID.
 *
 * @param {string} id - Audit log ID.
 * @returns {Promise<object|null>} The audit log object or null.
 */
export async function findById(id) {
  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { auditLogId: snap.id, ...snap.data() };
      }
      return null;
    }
  } catch (error) {
    handleBackendError("auditLogRepository.findById", error);
  }

  const logs = getLocalLogs();
  return logs.find(l => l.auditLogId === id) || null;
}

/**
 * Retrieves all audit logs.
 *
 * @returns {Promise<object[]>} Array of audit logs.
 */
export async function findAll() {
  try {
    if (db) {
      const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ auditLogId: doc.id, ...doc.data() });
      });
      return results;
    }
  } catch (error) {
    handleBackendError("auditLogRepository.findAll", error);
  }

  return getLocalLogs();
}

/**
 * Searches audit logs by a set of filters.
 *
 * @param {object} criteria - Filters like { userId, collection, action }
 * @returns {Promise<object[]>} Matching audit logs.
 */
export async function search(criteria = {}) {
  try {
    if (db) {
      let q = collection(db, COLLECTION_NAME);
      const constraints = [];

      if (criteria.userId) {
        constraints.push(where("userId", "==", criteria.userId));
      }
      if (criteria.collection) {
        constraints.push(where("collection", "==", criteria.collection));
      }
      if (criteria.action) {
        constraints.push(where("action", "==", criteria.action));
      }

      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ auditLogId: doc.id, ...doc.data() });
      });

      // Sort programmatically in client since composite index might be missing
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return results;
    }
  } catch (error) {
    handleBackendError("auditLogRepository.search", error);
  }

  // Local/Offline search fallback
  let logs = getLocalLogs();
  if (criteria.userId) {
    logs = logs.filter(l => l.userId === criteria.userId);
  }
  if (criteria.collection) {
    logs = logs.filter(l => l.collection === criteria.collection);
  }
  if (criteria.action) {
    logs = logs.filter(l => l.action === criteria.action);
  }
  return logs;
}

/**
 * Helper to wrap write actions and automatically log them.
 *
 * @param {string} action - e.g., "CREATE", "UPDATE", "DELETE"
 * @param {string} colName - e.g., "familyMembers"
 * @param {string} docId - The ID of target document
 * @param {object} oldValue - The previous state of document
 * @param {object} newValue - The new state of document
 * @returns {Promise<string>} Created audit log ID
 */
export async function logAction(action, colName, docId, oldValue = null, newValue = null) {
  return await create({
    action,
    collection: colName,
    documentId: docId,
    oldValue,
    newValue
  });
}
