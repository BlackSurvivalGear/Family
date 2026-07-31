import { DB } from './db.js';

export class UserProfile {
  static init() {
    DB.init();

    // Fetch user
    const user = JSON.parse(localStorage.getItem('lawal_current_user'));
    if (!user) {
      window.location.href = 'signin.html';
      return;
    }

    this.user = user;

    // Fill DOM
    document.getElementById('user-p-avatar').src = user.avatar || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
    document.getElementById('user-p-fullName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('user-p-role').textContent = user.role || "Family Descendent";

    document.getElementById('prof-firstName').value = user.firstName;
    document.getElementById('prof-lastName').value = user.lastName;
    document.getElementById('prof-email').value = user.email || `${user.id}@lawal.org`;
    document.getElementById('prof-avatar').value = user.avatar || "";

    // Form submit
    const form = document.getElementById('profile-edit-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Update
        user.firstName = document.getElementById('prof-firstName').value.trim();
        user.lastName = document.getElementById('prof-lastName').value.trim();
        user.email = document.getElementById('prof-email').value.trim();
        user.avatar = document.getElementById('prof-avatar').value.trim();

        localStorage.setItem('lawal_current_user', JSON.stringify(user));

        // Save back to general tree too if id exists
        const matched = DB.getMember(user.id);
        if (matched) {
          matched.firstName = user.firstName;
          matched.lastName = user.lastName;
          matched.avatar = user.avatar;
          DB.saveMember(matched);
        }

        alert("Profile credentials updated successfully. Reloading...");
        window.location.reload();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  UserProfile.init();
});
