/**
 * Lawal.org Portal Shared Session & Authentication Controller
 */

import { getCurrentUser, logout as fbLogout } from "./firebase/auth.js";

export class Auth {
  static getCurrentUser() {
    return getCurrentUser();
  }

  static requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      // Not authenticated, redirect to signin.html with return url
      const path = window.location.pathname;
      const file = path.substring(path.lastIndexOf('/') + 1) || "dashboard.html";
      if (file && file !== "signin.html" && file !== "register.html" && file !== "forgot-password.html" && file !== "index.html") {
        window.location.href = `signin.html?redirect=${encodeURIComponent(file)}`;
      }
    }
    return user;
  }

  static async logout() {
    await fbLogout();
  }
}
