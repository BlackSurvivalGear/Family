/**
 * Event Repository Module
 * Provides Firestore & Offline/Simulated CRUD operations for the 'events' collection.
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

const COLLECTION_NAME = "events";
const LOCAL_STORAGE_KEY = "lawal_events_records";

function getLocalEvents() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated events:", e);
    return [];
  }
}

function saveLocalEvents(events) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Error writing simulated events:", e);
  }
}

/**
 * Creates a new event record.
 *
 * @param {object} data - Event details { title, date, description, category, etc. }
 * @returns {Promise<string>} Created event ID.
 */
export async function create(data) {
  if (!data || !data.title || !data.date) {
    throw new Error("Event title and date are required.");
  }

  const user = getCurrentUser();
  const createdBy = user ? user.uid : "system";
  const createdAt = new Date().toISOString();
  const eventId = data.eventId || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const finalData = {
    ...data,
    eventId,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  try {
    if (db) {
      await setDoc(doc(db, COLLECTION_NAME, eventId), finalData);
      await logAction("CREATE", COLLECTION_NAME, eventId, null, finalData);
      return eventId;
    }
  } catch (error) {
    handleBackendError("eventRepository.create", error);
  }

  // Local Storage Fallback
  const events = getLocalEvents();
  events.push(finalData);
  saveLocalEvents(events);
  await logAction("CREATE", COLLECTION_NAME, eventId, null, finalData);
  return eventId;
}

/**
 * Updates an existing event record.
 *
 * @param {string} id - Event ID.
 * @param {object} updateData - Key-values to update.
 * @returns {Promise<boolean>} True if update is successful.
 */
export async function update(id, updateData) {
  const current = await findById(id);
  if (!current) {
    throw new Error("Event not found.");
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
    handleBackendError("eventRepository.update", error);
  }

  // Local Storage Fallback
  const events = getLocalEvents();
  const idx = events.findIndex(e => e.eventId === id);
  if (idx > -1) {
    const updatedFull = { ...events[idx], ...finalUpdate };
    events[idx] = updatedFull;
    saveLocalEvents(events);
    await logAction("UPDATE", COLLECTION_NAME, id, current, updatedFull);
    return true;
  }
  return false;
}

/**
 * Deletes an event record.
 *
 * @param {string} id - Event ID.
 * @returns {Promise<boolean>} True if delete is successful.
 */
export async function deleteEvent(id) {
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
    handleBackendError("eventRepository.delete", error);
  }

  // Local Storage Fallback
  const events = getLocalEvents();
  const filtered = events.filter(e => e.eventId !== id);
  saveLocalEvents(filtered);
  await logAction("DELETE", COLLECTION_NAME, id, current, null);
  return true;
}

/**
 * Finds an event by ID.
 *
 * @param {string} id - Event ID.
 * @returns {Promise<object|null>} Event details or null.
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
    handleBackendError("eventRepository.findById", error);
  }

  const events = getLocalEvents();
  return events.find(e => e.eventId === id) || null;
}

/**
 * Retrieves all events.
 *
 * @returns {Promise<object[]>} Array of events.
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
    handleBackendError("eventRepository.findAll", error);
  }

  return getLocalEvents();
}

/**
 * Searches events.
 *
 * @param {object} criteria - Search criteria { queryStr, category }
 * @returns {Promise<object[]>} Matching events.
 */
export async function search(criteria = {}) {
  const all = await findAll();
  let filtered = [...all];

  if (criteria.category) {
    filtered = filtered.filter(e => e.category === criteria.category);
  }

  if (criteria.queryStr) {
    const qStr = criteria.queryStr.toLowerCase().trim();
    filtered = filtered.filter(e => {
      const title = (e.title || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      return title.includes(qStr) || desc.includes(qStr);
    });
  }

  return filtered;
}
