/**
 * Family Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'familyMembers' collection.
 */

import { db, handleBackendError } from "../firebase/firebase.js";
import { getCurrentUser } from "../firebase/auth.js";
import { logAction } from "./auditLogRepository.js";
import { validateMember } from "../validators/memberValidator.js";
import { clearCache } from "../genealogy/relationshipCache.js";
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

const COLLECTION_NAME = "familyMembers";
const LOCAL_STORAGE_KEY = "lawal_family_members";

function getLocalMembers() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated family members:", e);
    return [];
  }
}

function saveLocalMembers(members) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));
  } catch (e) {
    console.error("Error writing simulated family members:", e);
  }
}

/**
 * Creates a new family member document.
 *
 * @param {object} data - The member data.
 * @returns {Promise<string>} The created member ID.
 */
export async function create(data) {
  const validation = validateMember(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const memberId = data.memberId || `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    memberId,
    createdBy,
    createdAt,
    updatedAt: createdAt,
    deleted: false
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, memberId), finalData);
      await logAction("CREATE", COLLECTION_NAME, memberId, null, finalData);
      clearCache();
      return memberId;
    }
  } catch (error) {
    handleBackendError("familyRepository.create", error);
  }

  // Local Storage Fallback
  const members = getLocalMembers();
  members.push(finalData);
  saveLocalMembers(members);
  await logAction("CREATE", COLLECTION_NAME, memberId, null, finalData);
  clearCache();
  return memberId;
}

/**
 * Updates an existing family member.
 *
 * @param {string} id - The family member ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error(`Member with ID [${id}] not found.`);
  }

  const merged = { ...current, ...updateData };
  const validation = validateMember(merged);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
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
      clearCache();
      return true;
    }
  } catch (error) {
    handleBackendError("familyRepository.update", error);
  }

  // Local Storage Fallback
  const members = getLocalMembers();
  const idx = members.findIndex(m => m.memberId === id);
  if (idx > -1) {
    const updatedFull = { ...members[idx], ...finalUpdate };
    members[idx] = updatedFull;
    saveLocalMembers(members);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    clearCache();
    return true;
  }
  return false;
}

/**
 * Deletes a family member (soft-delete).
 *
 * @param {string} id - Family member ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteMember(id) {
  const current = await findById(id);
  if (!current) {
    return false;
  }

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      // Soft-delete strategy
      const finalUpdate = { deleted: true, updatedAt: new Date().toISOString() };
      await updateDoc(docRef, finalUpdate);
      const updatedFull = { ...current, ...finalUpdate };
      await logAction("DELETE", COLLECTION_NAME, id, current, updatedFull);
      clearCache();
      return true;
    }
  } catch (error) {
    handleBackendError("familyRepository.delete", error);
  }

  // Local Storage Fallback
  const members = getLocalMembers();
  const idx = members.findIndex(m => m.memberId === id);
  if (idx > -1) {
    const finalUpdate = { deleted: true, updatedAt: new Date().toISOString() };
    const updatedFull = { ...members[idx], ...finalUpdate };
    members[idx] = updatedFull;
    saveLocalMembers(members);
    await logAction("DELETE", COLLECTION_NAME, id, current, updatedFull);
    clearCache();
    return true;
  }
  return false;
}

/**
 * Finds a family member by ID.
 *
 * @param {string} id - Member ID.
 * @returns {Promise<object|null>} Member details or null.
 */
export async function findById(id) {
  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return data.deleted ? null : data;
      }
      return null;
    }
  } catch (error) {
    handleBackendError("familyRepository.findById", error);
  }

  const members = getLocalMembers();
  const match = members.find(m => m.memberId === id);
  return (match && !match.deleted) ? match : null;
}

/**
 * Retrieves all active (non-deleted) family members.
 *
 * @returns {Promise<object[]>} Array of active members.
 */
export async function findAll() {
  try {
    if (db) {
      const q = query(collection(db, COLLECTION_NAME), where("deleted", "==", false));
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data());
      });
      return results;
    }
  } catch (error) {
    handleBackendError("familyRepository.findAll", error);
  }

  const members = getLocalMembers();
  return members.filter(m => !m.deleted);
}

/**
 * Searches family members.
 *
 * @param {object} criteria - Search criteria { queryStr, branchId, gender }
 * @returns {Promise<object[]>} Array of matching family members.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.branchId) {
    filtered = filtered.filter(m => m.branchId === criteria.branchId);
  }

  if (criteria.gender) {
    filtered = filtered.filter(m => m.gender && m.gender.toLowerCase() === criteria.gender.toLowerCase());
  }

  if (criteria.queryStr) {
    const q = criteria.queryStr.toLowerCase().trim();
    filtered = filtered.filter(m => {
      const first = (m.firstName || "").toLowerCase();
      const last = (m.lastName || "").toLowerCase();
      const preferred = (m.preferredName || "").toLowerCase();
      return first.includes(q) || last.includes(q) || preferred.includes(q);
    });
  }

  return filtered;
}
