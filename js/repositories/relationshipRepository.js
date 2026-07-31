/**
 * Relationship Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'relationships' collection.
 */

import { db, handleBackendError } from "../firebase/firebase.js";
import { getCurrentUser } from "../firebase/auth.js";
import { logAction } from "./auditLogRepository.js";
import { validateRelationship, detectCircularAncestry, getParentChild } from "../validators/relationshipValidator.js";
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

const COLLECTION_NAME = "relationships";
const LOCAL_STORAGE_KEY = "lawal_relationships";

function getLocalRelationships() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated relationships:", e);
    return [];
  }
}

function saveLocalRelationships(rels) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rels));
  } catch (e) {
    console.error("Error writing simulated relationships:", e);
  }
}

/**
 * Creates a new relationship.
 *
 * @param {object} data - Relationship details.
 * @returns {Promise<string>} Created relationship ID.
 */
export async function create(data) {
  const validation = validateRelationship(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Pre-emptive circular dependency checks
  const pc = getParentChild(data);
  if (pc) {
    const existing = await findAll();
    const hasCycle = detectCircularAncestry(pc.child, pc.parent, existing);
    if (hasCycle) {
      throw new Error(`Invalid relationship: Circular ancestry path detected between [${pc.parent}] and [${pc.child}].`);
    }
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const relationshipId = data.relationshipId || `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    relationshipId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, relationshipId), finalData);
      await logAction("CREATE", COLLECTION_NAME, relationshipId, null, finalData);
      clearCache();
      return relationshipId;
    }
  } catch (error) {
    handleBackendError("relationshipRepository.create", error);
  }

  // Local Storage Fallback
  const rels = getLocalRelationships();
  rels.push(finalData);
  saveLocalRelationships(rels);
  await logAction("CREATE", COLLECTION_NAME, relationshipId, null, finalData);
  clearCache();
  return relationshipId;
}

/**
 * Updates an existing relationship.
 *
 * @param {string} id - Relationship ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error(`Relationship with ID [${id}] not found.`);
  }

  const merged = { ...current, ...updateData };
  const validation = validateRelationship(merged);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Check circular ancestry with proposed update
  const pc = getParentChild(merged);
  if (pc) {
    const existing = await findAll();
    // Filter out the current relationship from the list of existing relationships to prevent self-matching during the check
    const filteredExisting = existing.filter(r => r.relationshipId !== id);
    const hasCycle = detectCircularAncestry(pc.child, pc.parent, filteredExisting);
    if (hasCycle) {
      throw new Error(`Invalid relationship update: Circular ancestry path detected between [${pc.parent}] and [${pc.child}].`);
    }
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
    handleBackendError("relationshipRepository.update", error);
  }

  // Local Storage Fallback
  const rels = getLocalRelationships();
  const idx = rels.findIndex(r => r.relationshipId === id);
  if (idx > -1) {
    const updatedFull = { ...rels[idx], ...finalUpdate };
    rels[idx] = updatedFull;
    saveLocalRelationships(rels);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    clearCache();
    return true;
  }
  return false;
}

/**
 * Deletes a relationship.
 *
 * @param {string} id - Relationship ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteRelationship(id) {
  const current = await findById(id);
  if (!current) {
    return false;
  }

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      await logAction("DELETE", COLLECTION_NAME, id, current, null);
      clearCache();
      return true;
    }
  } catch (error) {
    handleBackendError("relationshipRepository.delete", error);
  }

  // Local Storage Fallback
  const rels = getLocalRelationships();
  const filtered = rels.filter(r => r.relationshipId !== id);
  saveLocalRelationships(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  clearCache();
  return true;
}

/**
 * Finds a relationship by ID.
 *
 * @param {string} id - Relationship ID.
 * @returns {Promise<object|null>} Relationship details or null.
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
    handleBackendError("relationshipRepository.findById", error);
  }

  const rels = getLocalRelationships();
  return rels.find(r => r.relationshipId === id) || null;
}

/**
 * Retrieves all relationships.
 *
 * @returns {Promise<object[]>} Array of all relationships.
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
    handleBackendError("relationshipRepository.findAll", error);
  }

  return getLocalRelationships();
}

/**
 * Searches relationships.
 *
 * @param {object} criteria - Search criteria { personId, relationshipType }
 * @returns {Promise<object[]>} Matching relationships.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.personId) {
    const pId = criteria.personId;
    filtered = filtered.filter(r => r.personA === pId || r.personB === pId);
  }

  if (criteria.relationshipType) {
    const rType = criteria.relationshipType.toUpperCase().trim();
    filtered = filtered.filter(r => r.relationshipType === rType);
  }

  return filtered;
}
