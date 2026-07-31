/**
 * Lawal.org Portal Shared Session & Authentication Controller
 */

export class Auth {
  static getCurrentUser() {
    try {
      const user = localStorage.getItem('lawal_current_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error("Auth session read error:", e);
      return null;
    }
  }

  static requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      // Not authenticated, redirect to signin.html with return url
      const path = window.location.pathname;
      const file = path.substring(path.lastIndexOf('/') + 1);
      if (file && file !== 'signin.html' && file !== 'register.html' && file !== 'forgot-password.html' && file !== 'index.html') {
        window.location.href = `signin.html?redirect=${encodeURIComponent(file)}`;
      }
    }
    return user;
  }

  static logout() {
    localStorage.removeItem('lawal_current_user');
    window.location.href = 'index.html';
  }
}
