/**
 * Branch Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'branches' collection.
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

const COLLECTION_NAME = "branches";
const LOCAL_STORAGE_KEY = "lawal_branches";

function getLocalBranches() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated branches:", e);
    return [];
  }
}

function saveLocalBranches(branches) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(branches));
  } catch (e) {
    console.error("Error writing simulated branches:", e);
  }
}

/**
 * Creates a new branch.
 *
 * @param {object} data - Branch data { name, region, description, etc. }
 * @returns {Promise<string>} Created branch ID.
 */
export async function create(data) {
  if (!data || !data.name) {
    throw new Error("Branch name is required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const branchId = data.branchId || `branch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    branchId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, branchId), finalData);
      await logAction("CREATE", COLLECTION_NAME, branchId, null, finalData);
      return branchId;
    }
  } catch (error) {
    handleBackendError("branchRepository.create", error);
  }

  // Local Storage Fallback
  const branches = getLocalBranches();
  branches.push(finalData);
  saveLocalBranches(branches);
  await logAction("CREATE", COLLECTION_NAME, branchId, null, finalData);
  return branchId;
}

/**
 * Updates an existing branch.
 *
 * @param {string} id - Branch ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error(`Branch with ID [${id}] not found.`);
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
    handleBackendError("branchRepository.update", error);
  }

  // Local Storage Fallback
  const branches = getLocalBranches();
  const idx = branches.findIndex(b => b.branchId === id);
  if (idx > -1) {
    const updatedFull = { ...branches[idx], ...finalUpdate };
    branches[idx] = updatedFull;
    saveLocalBranches(branches);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a branch.
 *
 * @param {string} id - Branch ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteBranch(id) {
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
    handleBackendError("branchRepository.delete", error);
  }

  // Local Storage Fallback
  const branches = getLocalBranches();
  const filtered = branches.filter(b => b.branchId !== id);
  saveLocalBranches(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds a branch by ID.
 *
 * @param {string} id - Branch ID.
 * @returns {Promise<object|null>} Branch details or null.
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
    handleBackendError("branchRepository.findById", error);
  }

  const branches = getLocalBranches();
  return branches.find(b => b.branchId === id) || null;
}

/**
 * Retrieves all branches.
 *
 * @returns {Promise<object[]>} Array of branches.
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
    handleBackendError("branchRepository.findAll", error);
  }

  return getLocalBranches();
}

/**
 * Searches branches.
 *
 * @param {object} criteria - Search criteria { name, region }
 * @returns {Promise<object[]>} Matching branches.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.name) {
    const nameQuery = criteria.name.toLowerCase();
    filtered = filtered.filter(b => b.name && b.name.toLowerCase().includes(nameQuery));
  }

  if (criteria.region) {
    const regionQuery = criteria.region.toLowerCase();
    filtered = filtered.filter(b => b.region && b.region.toLowerCase().includes(regionQuery));
  }

  return filtered;
}
