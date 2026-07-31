/**
 * Firebase Initialization Module
 * Loaded directly from the official Google CDN.
 *
 * This module initializes and exports key Firebase SDK references.
 * It also encapsulates reusable error handling utilities.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

/**
 * Reusable backend error logger and handler utility.
 * Logs meaningful structured messages to the browser console.
 *
 * @param {string} context - The context or component where the error occurred.
 * @param {Error|string} error - The error details or message.
 */
export function handleBackendError(context, error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  console.error(`[House of Lawal Backend] Error in [${context}]:`, {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString()
  });
}

// Variables for exports
let app = null;
let auth = null;
let db = null;

const isTestEnv = typeof window !== 'undefined' && window.location.pathname.includes('test_backend.html');

try {
  // Only use simulation mode if Firebase initialization actually fails,
  // or if explicitly running local unit tests in test_backend.html.
  if (firebaseConfig && firebaseConfig.apiKey && !isTestEnv) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✓ Connected to Firebase project: house-of-lawal");
  } else {
    throw new Error("Firebase configuration is incomplete or missing in config.js");
  }
} catch (error) {
  if (!isTestEnv) {
    handleBackendError("Firebase Initialization", error);
  }
  console.warn(
    "[House of Lawal Backend] Firebase configuration is incomplete or missing in config.js. " +
    "Falling back to local simulation."
  );
  app = null;
  auth = null;
  db = null;
}

export { app, auth, db };
