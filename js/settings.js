import { DB } from './db.js';

export class PortalSettings {
  static init() {
    DB.init();

    // Fill form elements
    const curTheme = localStorage.getItem('lawal_theme') || 'dark';
    const curLang = localStorage.getItem('lawal_lang') || 'en';
    const curPrivacy = localStorage.getItem('lawal_privacy') || 'private';
    const curApproval = localStorage.getItem('lawal_approval') || 'require';

    const themeSelect = document.getElementById('sett-theme');
    const langSelect = document.getElementById('sett-lang');
    const privacySelect = document.getElementById('sett-privacy');
    const approvalSelect = document.getElementById('sett-approval');

    if (themeSelect) themeSelect.value = curTheme;
    if (langSelect) langSelect.value = curLang;
    if (privacySelect) privacySelect.value = curPrivacy;
    if (approvalSelect) approvalSelect.value = curApproval;

    // Form submit
    const form = document.getElementById('settings-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const theme = themeSelect.value;
        const lang = langSelect.value;
        const privacy = privacySelect.value;
        const approval = approvalSelect.value;

        // Persist
        localStorage.setItem('lawal_theme', theme);
        localStorage.setItem('lawal_lang', lang);
        localStorage.setItem('lawal_privacy', privacy);
        localStorage.setItem('lawal_approval', approval);

        // Apply theme right away
        document.documentElement.setAttribute('data-theme', theme);

        alert("Portal configurations applied successfully. Synchronizing components...");
        window.location.reload();
      });
    }

    // Reset Sandbox
    const resetBtn = document.getElementById('reset-sandbox-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to completely clear the local database and reset all files to original seeds?")) {
          localStorage.removeItem('lawal_members');
          localStorage.removeItem('lawal_news');
          localStorage.removeItem('lawal_documents');
          localStorage.removeItem('lawal_events');
          localStorage.removeItem('lawal_timeline');
          localStorage.removeItem('lawal_activity');
          localStorage.removeItem('lawal_current_user');

          alert("Sandbox database reset successfully. Returning to landing entry...");
          window.location.href = 'index.html';
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  PortalSettings.init();
});
