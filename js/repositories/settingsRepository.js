/**
 * Settings Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'settings' collection.
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

const COLLECTION_NAME = "settings";
const LOCAL_STORAGE_KEY = "lawal_settings_records";

function getLocalSettings() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Error reading simulated settings:", e);
    return {};
  }
}

function saveLocalSettings(settings) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error writing simulated settings:", e);
  }
}

/**
 * Creates or updates settings configurations.
 *
 * @param {object} data - Settings payload { settingsId, siteName, theme, etc. }
 * @returns {Promise<string>} Settings document ID.
 */
export async function create(data) {
  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const settingsId = data.settingsId || "global_settings";

  const finalData = {
    ...data,
    settingsId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, settingsId), finalData);
      await logAction("CREATE", COLLECTION_NAME, settingsId, null, finalData);
      return settingsId;
    }
  } catch (error) {
    handleBackendError("settingsRepository.create", error);
  }

  // Local Storage Fallback
  const settingsMap = getLocalSettings();
  settingsMap[settingsId] = finalData;
  saveLocalSettings(settingsMap);
  await logAction("CREATE", COLLECTION_NAME, settingsId, null, finalData);
  return settingsId;
}

/**
 * Updates settings record.
 *
 * @param {string} id - Settings identifier (e.g., 'global_settings').
 * @param {object} updateData - Key-value configurations to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  const existing = current || {};

  const updatedAt = new Date().toISOString();
  const finalUpdate = {
    ...updateData,
    updatedAt
  };

  try {
    if (db) {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, finalUpdate);
      const updatedFull = { ...existing, ...finalUpdate };
      await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
      return true;
    }
  } catch (error) {
    handleBackendError("settingsRepository.update", error);
  }

  // Local Storage Fallback
  const settingsMap = getLocalSettings();
  const updatedFull = { ...(settingsMap[id] || {}), ...finalUpdate, settingsId: id };
  settingsMap[id] = updatedFull;
  saveLocalSettings(settingsMap);
  await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
  return true;
}

/**
 * Deletes settings configuration.
 *
 * @param {string} id - Settings identifier.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteSettings(id) {
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
    handleBackendError("settingsRepository.delete", error);
  }

  // Local Storage Fallback
  const settingsMap = getLocalSettings();
  delete settingsMap[id];
  saveLocalSettings(settingsMap);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds settings by ID.
 *
 * @param {string} id - Settings ID.
 * @returns {Promise<object|null>} Settings object or null.
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
    handleBackendError("settingsRepository.findById", error);
  }

  const settingsMap = getLocalSettings();
  return settingsMap[id] || null;
}

/**
 * Retrieves all configurations.
 *
 * @returns {Promise<object[]>} Array of configurations.
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
    handleBackendError("settingsRepository.findAll", error);
  }

  const settingsMap = getLocalSettings();
  return Object.values(settingsMap);
}

/**
 * Searches settings configurations.
 *
 * @param {object} criteria - Settings criteria (currently simple passthrough query).
 * @returns {Promise<object[]>} Matching items.
 */
export async function search(criteria = {}) {
  return await findAll();
}
