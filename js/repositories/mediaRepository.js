/**
 * Media Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'media' collection.
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

const COLLECTION_NAME = "media";
const LOCAL_STORAGE_KEY = "lawal_media_records";

function getLocalMedia() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated media:", e);
    return [];
  }
}

function saveLocalMedia(media) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(media));
  } catch (e) {
    console.error("Error writing simulated media:", e);
  }
}

/**
 * Creates a new media record.
 *
 * @param {object} data - Media record { url, caption, memberId, type, branchId, etc. }
 * @returns {Promise<string>} Created media ID.
 */
export async function create(data) {
  if (!data || !data.url) {
    throw new Error("Media URL is required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const mediaId = data.mediaId || `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    mediaId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, mediaId), finalData);
      await logAction("CREATE", COLLECTION_NAME, mediaId, null, finalData);
      return mediaId;
    }
  } catch (error) {
    handleBackendError("mediaRepository.create", error);
  }

  // Local Storage Fallback
  const media = getLocalMedia();
  media.push(finalData);
  saveLocalMedia(media);
  await logAction("CREATE", COLLECTION_NAME, mediaId, null, finalData);
  return mediaId;
}

/**
 * Updates an existing media record.
 *
 * @param {string} id - Media record ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error("Media record not found.");
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
    handleBackendError("mediaRepository.update", error);
  }

  // Local Storage Fallback
  const media = getLocalMedia();
  const idx = media.findIndex(m => m.mediaId === id);
  if (idx > -1) {
    const updatedFull = { ...media[idx], ...finalUpdate };
    media[idx] = updatedFull;
    saveLocalMedia(media);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a media record.
 *
 * @param {string} id - Media record ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteMedia(id) {
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
    handleBackendError("mediaRepository.delete", error);
  }

  // Local Storage Fallback
  const media = getLocalMedia();
  const filtered = media.filter(m => m.mediaId !== id);
  saveLocalMedia(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds a media record by ID.
 *
 * @param {string} id - Media record ID.
 * @returns {Promise<object|null>} Media record or null.
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
    handleBackendError("mediaRepository.findById", error);
  }

  const media = getLocalMedia();
  return media.find(m => m.mediaId === id) || null;
}

/**
 * Retrieves all media records.
 *
 * @returns {Promise<object[]>} Array of media records.
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
    handleBackendError("mediaRepository.findAll", error);
  }

  return getLocalMedia();
}

/**
 * Searches media records.
 *
 * @param {object} criteria - Search criteria { memberId, branchId, type }
 * @returns {Promise<object[]>} Matching media records.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.memberId) {
    filtered = filtered.filter(m => m.memberId === criteria.memberId);
  }

  if (criteria.branchId) {
    filtered = filtered.filter(m => m.branchId === criteria.branchId);
  }

  if (criteria.type) {
    filtered = filtered.filter(m => m.type && m.type.toLowerCase() === criteria.type.toLowerCase());
  }

  return filtered;
}
