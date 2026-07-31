/**
 * Timeline Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'timeline' collection.
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
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = "timeline";
const LOCAL_STORAGE_KEY = "lawal_timeline_records";

function getLocalTimeline() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated timeline:", e);
    return [];
  }
}

function saveLocalTimeline(timeline) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(timeline));
  } catch (e) {
    console.error("Error writing simulated timeline:", e);
  }
}

/**
 * Creates a new timeline record.
 *
 * @param {object} data - Timeline record { year, title, description, category, etc. }
 * @returns {Promise<string>} Created timeline ID.
 */
export async function create(data) {
  if (!data || !data.year || !data.title) {
    throw new Error("Year and title are required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const timelineId = data.timelineId || `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    timelineId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, timelineId), finalData);
      await logAction("CREATE", COLLECTION_NAME, timelineId, null, finalData);
      return timelineId;
    }
  } catch (error) {
    handleBackendError("timelineRepository.create", error);
  }

  // Local Storage Fallback
  const timeline = getLocalTimeline();
  timeline.push(finalData);
  saveLocalTimeline(timeline);
  await logAction("CREATE", COLLECTION_NAME, timelineId, null, finalData);
  return timelineId;
}

/**
 * Updates an existing timeline record.
 *
 * @param {string} id - Timeline record ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error("Timeline record not found.");
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
    handleBackendError("timelineRepository.update", error);
  }

  // Local Storage Fallback
  const timeline = getLocalTimeline();
  const idx = timeline.findIndex(t => t.timelineId === id);
  if (idx > -1) {
    const updatedFull = { ...timeline[idx], ...finalUpdate };
    timeline[idx] = updatedFull;
    saveLocalTimeline(timeline);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes a timeline record.
 *
 * @param {string} id - Timeline record ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteTimeline(id) {
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
    handleBackendError("timelineRepository.delete", error);
  }

  // Local Storage Fallback
  const timeline = getLocalTimeline();
  const filtered = timeline.filter(t => t.timelineId !== id);
  saveLocalTimeline(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds a timeline record by ID.
 *
 * @param {string} id - Timeline record ID.
 * @returns {Promise<object|null>} Timeline record or null.
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
    handleBackendError("timelineRepository.findById", error);
  }

  const timeline = getLocalTimeline();
  return timeline.find(t => t.timelineId === id) || null;
}

/**
 * Retrieves all timeline records, ordered by year.
 *
 * @returns {Promise<object[]>} Array of timeline records.
 */
export async function findAll() {
  try {
    if (db) {
      const q = query(collection(db, COLLECTION_NAME), orderBy("year"));
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data());
      });
      return results;
    }
  } catch (error) {
    handleBackendError("timelineRepository.findAll", error);
  }

  // Simulated fallback sort
  const timeline = getLocalTimeline();
  return timeline.sort((a, b) => String(a.year).localeCompare(String(b.year)));
}

/**
 * Searches timeline records.
 *
 * @param {object} criteria - Search criteria { queryStr, year }
 * @returns {Promise<object[]>} Matching timeline records.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.year) {
    filtered = filtered.filter(t => String(t.year) === String(criteria.year));
  }

  if (criteria.queryStr) {
    const qStr = criteria.queryStr.toLowerCase().trim();
    filtered = filtered.filter(t => {
      const title = (t.title || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      return title.includes(qStr) || desc.includes(qStr);
    });
  }

  return filtered;
}
