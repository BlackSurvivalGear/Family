/**
 * User Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'users' collection.
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

const COLLECTION_NAME = "users";
const LOCAL_STORAGE_KEY = "lawal_users_records";

function getLocalUsers() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated users:", e);
    return [];
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Error writing simulated users:", e);
  }
}

/**
 * Creates a new user record.
 *
 * @param {object} data - User details { email, displayName, role, etc. }
 * @returns {Promise<string>} Created user ID (uid).
 */
export async function create(data) {
  if (!data || !data.uid || !data.email) {
    throw new Error("UID and Email are required to create a user.");
  }

  const createdAt = new Date().toISOString();
  const finalData = {
    ...data,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, data.uid), finalData);
      await logAction("CREATE", COLLECTION_NAME, data.uid, null, finalData);
      return data.uid;
    }
  } catch (error) {
    handleBackendError("userRepository.create", error);
  }

  // Local Storage Fallback
  const users = getLocalUsers();
  users.push(finalData);
  saveLocalUsers(users);
  await logAction("CREATE", COLLECTION_NAME, data.uid, null, finalData);
  return data.uid;
}

/**
 * Updates an existing user record.
 *
 * @param {string} uid - User ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(uid, updateData) {
  const current = await findById(uid);
  if (!current) {
    throw new Error("User not found.");
  }

  const updatedAt = new Date().toISOString();
  const finalUpdate = {
    ...updateData,
    updatedAt
  };

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, uid);
      await updateDoc(docRef, finalUpdate);
      const updatedFull = { ...current, ...finalUpdate };
      await logAction("UPDATE", COLLECTION_NAME, uid, current, updatedFull);
      return true;
    }
  } catch (error) {
    handleBackendError("userRepository.update", error);
  }

  // Local Storage Fallback
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx > -1) {
    const updatedFull = { ...users[idx], ...finalUpdate };
    users[idx] = updatedFull;
    saveLocalUsers(users);
    await logAction("UPDATE", COLLECTION_NAME, uid, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a user record.
 *
 * @param {string} uid - User ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteUser(uid) {
  const current = await findById(uid);
  if (!current) {
    return false;
  }

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, uid);
      await deleteDoc(docRef);
      await logAction("DELETE", COLLECTION_NAME, uid, current, null);
      return true;
    }
  } catch (error) {
    handleBackendError("userRepository.delete", error);
  }

  // Local Storage Fallback
  const users = getLocalUsers();
  const filtered = users.filter(u => u.uid !== uid);
  saveLocalUsers(filtered);
  await logAction("DELETE", COLLECTION_NAME, uid, current, null);
  return true;
}

/**
 * Finds a user by ID.
 *
 * @param {string} uid - User ID.
 * @returns {Promise<object|null>} User or null.
 */
export async function findById(uid) {
  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    }
  } catch (error) {
    handleBackendError("userRepository.findById", error);
  }

  const users = getLocalUsers();
  return users.find(u => u.uid === uid) || null;
}

/**
 * Retrieves all users.
 *
 * @returns {Promise<object[]>} Array of users.
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
    handleBackendError("userRepository.findAll", error);
  }

  return getLocalUsers();
}

/**
 * Searches users.
 *
 * @param {object} criteria - Search criteria { email, role, displayName }
 * @returns {Promise<object[]>} Matching users.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.email) {
    filtered = filtered.filter(u => u.email && u.email.toLowerCase() === criteria.email.toLowerCase());
  }

  if (criteria.role) {
    filtered = filtered.filter(u => u.role && u.role.toUpperCase() === criteria.role.toUpperCase());
  }

  if (criteria.displayName) {
    const qStr = criteria.displayName.toLowerCase().trim();
    filtered = filtered.filter(u => u.displayName && u.displayName.toLowerCase().includes(qStr));
  }

  return filtered;
}
