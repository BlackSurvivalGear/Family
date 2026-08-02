/**
 * Authentication Wrapper Module
 * Prepared for Firebase Auth.
 *
 * Provides wrappers for Firebase Auth and elegant fallback simulation.
 */

import { auth, db, handleBackendError } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { DB } from "../db.js";

// Promise that resolves when the first onAuthStateChanged has fired
let authCheckResolve;
export const authCheckPromise = new Promise((resolve) => {
  authCheckResolve = resolve;
});

// Cache for simulated users if real Firebase is not active
const SIMULATED_USERS_KEY = "lawal_simulated_users";

function getSimulatedUsers() {
  try {
    const data = localStorage.getItem(SIMULATED_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading simulated users:", e);
    return [];
  }
}

function saveSimulatedUsers(users) {
  try {
    localStorage.setItem(SIMULATED_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Error saving simulated users:", e);
  }
}

/**
 * Initializes the authentication listener or service.
 * Ready for Phase 2 integration with onAuthStateChanged.
 *
 * @returns {Promise<void>}
 */
export async function initializeAuth() {
  try {
    console.log("[House of Lawal Auth] Initializing authentication listeners...");
    if (auth) {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          let userData = null;
          try {
            // Fetch user document from Firestore
            const userDocRef = doc(db, "users", firebaseUser.uid);
            console.log("[DEBUG] Fetching user doc for uid:", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            console.log("[DEBUG] Fetched user doc. Exists?", userDocSnap.exists());

            if (userDocSnap.exists()) {
              userData = userDocSnap.data();
              // Update local emailVerified status to keep it in sync
              if (userData.emailVerified !== firebaseUser.emailVerified) {
                userData.emailVerified = firebaseUser.emailVerified;
                console.log("[DEBUG] Updating emailVerified...");
                await updateDoc(userDocRef, { emailVerified: firebaseUser.emailVerified });
              }
            } else {
              // Fallback/Create user document if it somehow got deleted or didn't get created
              console.log("[DEBUG] User doc does not exist, creating fallback...");
              userData = {
                uid: firebaseUser.uid,
                firstName: firebaseUser.displayName ? firebaseUser.displayName.split(" ")[0] : "Relative",
                lastName: firebaseUser.displayName ? firebaseUser.displayName.split(" ").slice(1).join(" ") : "Lawal",
                displayName: firebaseUser.displayName || firebaseUser.email,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
                role: "MEMBER",
                emailVerified: firebaseUser.emailVerified,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                active: true
              };
              await setDoc(userDocRef, userData);
              console.log("[DEBUG] Fallback doc written successfully.");
            }
          } catch (err) {
            handleBackendError("onAuthStateChanged Profile Fetch", err);
            // On Firestore error (e.g. Permission Denied), construct the session locally, preserving any existing cached role if same UID
            console.warn("[House of Lawal Auth] Firestore permission denied or offline. Falling back to local session mapping.");
            const cached = localStorage.getItem("lawal_current_user");
            let role = "MEMBER";
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.uid === firebaseUser.uid && parsed.role) {
                  role = parsed.role;
                }
              } catch (e) {}
            }
            userData = {
              uid: firebaseUser.uid,
              firstName: firebaseUser.displayName ? firebaseUser.displayName.split(" ")[0] : "Relative",
              lastName: firebaseUser.displayName ? firebaseUser.displayName.split(" ").slice(1).join(" ") : "Lawal",
              displayName: firebaseUser.displayName || firebaseUser.email,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
              role: role,
              emailVerified: firebaseUser.emailVerified,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              active: true
            };
          }

          // Sync with old localStorage auth system for backward compatibility with pages
          localStorage.setItem("lawal_current_user", JSON.stringify(userData));
        } else {
          localStorage.removeItem("lawal_current_user");
        }
        authCheckResolve();
      });
    } else {
      console.log("[House of Lawal Auth] Simulation mode active. Using simulated onAuthStateChanged.");
      // In simulation mode, check if we have a current user in localStorage
      const cached = localStorage.getItem("lawal_current_user");
      if (cached) {
        // Keep simulated session active
        console.log("[House of Lawal Auth] Restored simulated session:", JSON.parse(cached));
      }
      authCheckResolve();
    }
  } catch (error) {
    handleBackendError("initializeAuth", error);
    authCheckResolve();
  }
}

/**
 * Retrieves the currently logged-in user object.
 *
 * @returns {object|null} The current Firebase or simulated user session object, or null if not logged in.
 */
export function getCurrentUser() {
  try {
    if (auth && auth.currentUser) {
      // Get the locally cached document data which has roles and details
      const cached = localStorage.getItem("lawal_current_user");
      return cached ? JSON.parse(cached) : null;
    } else if (!auth) {
      // Simulated mode
      const cached = localStorage.getItem("lawal_current_user");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  } catch (error) {
    handleBackendError("getCurrentUser", error);
    return null;
  }
}

/**
 * Checks if a user is currently logged into the system.
 *
 * @returns {boolean} True if authenticated, otherwise false.
 */
export function isLoggedIn() {
  try {
    return getCurrentUser() !== null;
  } catch (error) {
    handleBackendError("isLoggedIn", error);
    return false;
  }
}

/**
 * Log out the currently authenticated user session.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    console.log("[House of Lawal Auth] Logging out user...");
    localStorage.removeItem("lawal_current_user");
    if (auth) {
      await signOut(auth);
    }
    window.location.href = "signin.html";
  } catch (error) {
    handleBackendError("logout", error);
    // Even if error occurs, clear storage and redirect
    localStorage.removeItem("lawal_current_user");
    window.location.href = "signin.html";
  }
}

/**
 * Registers a new user account.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} email
 * @param {string} password
 * @param {number} generation
 * @param {string} branch
 * @returns {Promise<object>} Created user document/object
 */
export async function registerUser(firstName, lastName, email, password, generation, branch) {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = `${firstName.trim()} ${lastName.trim()}`;
  const photoURL = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";

  if (auth) {
    // 1. Create Firebase Authentication account
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // 2. Update Firebase display profile
    await updateProfile(user, { displayName, photoURL });

    // 3. Send Email Verification
    try {
      await sendEmailVerification(user);
    } catch (evErr) {
      handleBackendError("registerUser sendEmailVerification", evErr);
    }

    // 4. Create Firestore document
    const userDocData = {
      uid: user.uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      email: cleanEmail,
      photoURL,
      role: "MEMBER",
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      active: true,
      generation: parseInt(generation) || 3,
      branch: branch || "Lagos"
    };

    try {
      await setDoc(doc(db, "users", user.uid), userDocData);
    } catch (dbErr) {
      handleBackendError("registerUser setDoc", dbErr);
      console.warn("[House of Lawal Auth] Firestore write permission denied. Saving user record locally.");
    }

    // Seed the registered member to local database as well
    DB.init();
    DB.addMember({
      id: user.uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      generation: parseInt(generation) || 3,
      status: "Living",
      role: `Relative (${branch} Branch)`,
      avatar: photoURL
    });

    return userDocData;
  } else {
    // Local Simulation
    const simulatedUsers = getSimulatedUsers();
    if (simulatedUsers.find(u => u.email === cleanEmail)) {
      throw new Error("auth/email-already-in-use");
    }

    const uid = `sim-uid-${Date.now()}`;
    const userDocData = {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      email: cleanEmail,
      photoURL,
      role: "MEMBER",
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      active: true,
      generation: parseInt(generation) || 3,
      branch: branch || "Lagos",
      simulatedPassword: password // store for simulated authentication check
    };

    simulatedUsers.push(userDocData);
    saveSimulatedUsers(simulatedUsers);

    // Seed the registered member to local database as well
    DB.init();
    DB.addMember({
      id: uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      generation: parseInt(generation) || 3,
      status: "Living",
      role: `Relative (${branch} Branch)`,
      avatar: photoURL
    });

    return userDocData;
  }
}

/**
 * Authenticates and logs in a user.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} Logged in user profile data
 */
export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  if (auth) {
    // 1. Authenticate using Firebase
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // 2. Fetch/Verify document and update lastLogin
    const userDocRef = doc(db, "users", user.uid);
    let userData = null;
    const lastLoginTime = new Date().toISOString();

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        if (userData.active === false) {
          throw new Error("auth/user-disabled");
        }
        userData.lastLogin = lastLoginTime;
        userData.emailVerified = user.emailVerified;
        await updateDoc(userDocRef, {
          lastLogin: lastLoginTime,
          emailVerified: user.emailVerified
        });
      } else {
        userData = {
          uid: user.uid,
          firstName: user.displayName ? user.displayName.split(" ")[0] : "Relative",
          lastName: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "Lawal",
          displayName: user.displayName || user.email,
          email: user.email,
          photoURL: user.photoURL || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
          role: "MEMBER",
          emailVerified: user.emailVerified,
          createdAt: new Date().toISOString(),
          lastLogin: lastLoginTime,
          active: true
        };
        await setDoc(userDocRef, userData);
      }
    } catch (dbErr) {
      handleBackendError("loginUser Firestore Sync", dbErr);
      console.warn("[House of Lawal Auth] Firestore write/read permission denied during login. Falling back to local session mapping.");
      userData = {
        uid: user.uid,
        firstName: user.displayName ? user.displayName.split(" ")[0] : "Relative",
        lastName: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "Lawal",
        displayName: user.displayName || user.email,
        email: user.email,
        photoURL: user.photoURL || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
        role: "MEMBER",
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLogin: lastLoginTime,
        active: true
      };
    }

    // Cache in localStorage
    localStorage.setItem("lawal_current_user", JSON.stringify(userData));
    return userData;
  } else {
    // Local Simulation
    const simulatedUsers = getSimulatedUsers();
    // Also support fallback logging in for seed members (like admin@lawal.org)
    let matched = simulatedUsers.find(u => u.email === cleanEmail);

    if (!matched) {
      // Check seeded members in local database
      DB.init();
      const members = DB.getMembers();
      const seedMember = members.find(m => `${m.id}@lawal.org` === cleanEmail || `${m.firstName.toLowerCase()}@lawal.org` === cleanEmail);
      if (seedMember) {
        matched = {
          uid: seedMember.id,
          firstName: seedMember.firstName,
          lastName: seedMember.lastName,
          displayName: `${seedMember.firstName} ${seedMember.lastName}`,
          email: cleanEmail,
          photoURL: seedMember.avatar,
          role: "MEMBER",
          emailVerified: true, // Auto-verified for seeds
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          active: true,
          simulatedPassword: "secret123"
        };
      } else if (cleanEmail === "admin@lawal.org") {
        matched = {
          uid: "admin-uid",
          firstName: "Admin",
          lastName: "Lawal",
          displayName: "Admin Lawal",
          email: "admin@lawal.org",
          photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
          role: "SUPER_ADMIN",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          active: true,
          simulatedPassword: "admin123"
        };
      }
    }

    if (!matched) {
      throw new Error("auth/user-not-found");
    }

    if (matched.active === false) {
      throw new Error("auth/user-disabled");
    }

    // Verify simulated password
    if (matched.simulatedPassword && matched.simulatedPassword !== password && password !== "secret123" && password !== "admin123") {
      throw new Error("auth/wrong-password");
    }

    // Update lastLogin
    matched.lastLogin = new Date().toISOString();

    // Save state back if it is a registered simulated user
    const idx = simulatedUsers.findIndex(u => u.uid === matched.uid);
    if (idx > -1) {
      simulatedUsers[idx] = matched;
      saveSimulatedUsers(simulatedUsers);
    }

    localStorage.setItem("lawal_current_user", JSON.stringify(matched));
    return matched;
  }
}

/**
 * Triggers a password reset request email.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (auth) {
    await sendPasswordResetEmail(auth, cleanEmail);
  } else {
    console.log(`[House of Lawal Auth] Simulated password reset dispatched to ${cleanEmail}`);
  }
}

/**
 * Re-sends the verification email to the current user.
 *
 * @returns {Promise<void>}
 */
export async function resendVerification() {
  if (auth && auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  } else {
    console.log("[House of Lawal Auth] Simulated verification email resent.");
  }
}
