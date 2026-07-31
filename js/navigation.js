import { Auth } from './auth.js';
import { DB } from './db.js';
import { app, auth, db } from './firebase/firebase.js';
import { canView, canEdit, canDelete } from './firebase/permissions.js';

export class Navigation {
  static init() {
    // Check authentication
    const user = Auth.requireAuth();
    if (!user) return;

    // Inject Sidebar & Header
    this.renderSidebar(user);
    this.renderHeader(user);
    this.renderSearchModal();

    // Register UI Listeners
    this.registerToggles();
    this.applySavedTheme();
  }

  static renderSidebar(user) {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    // Determine active route
    const currentFile = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'dashboard.html';

    const menuItems = [
      { file: 'dashboard.html', icon: 'fa-chart-line', label: 'Dashboard' },
      { file: 'tree.html', icon: 'fa-diagram-project', label: 'Family Tree' },
      { file: 'members.html', icon: 'fa-users', label: 'Family Members' },
      { file: 'history.html', icon: 'fa-landmark', label: 'Family History' },
      { file: 'gallery.html', icon: 'fa-images', label: 'Media Gallery' },
      { file: 'documents.html', icon: 'fa-folder-open', label: 'Documents' },
      { file: 'news.html', icon: 'fa-newspaper', label: 'Family News' },
      { file: 'events.html', icon: 'fa-calendar-days', label: 'Events Calendar' },
      { file: 'profile.html', icon: 'fa-id-card', label: 'My Profile' },
      { file: 'settings.html', icon: 'fa-gears', label: 'Portal Settings' },
    ];

    const menuHtml = menuItems.map(item => {
      const isActive = currentFile === item.file;
      const activeClass = isActive
        ? 'bg-gradient-to-r from-gold/15 to-transparent text-gold border-l-2 border-gold font-medium'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent';
      return `
        <a href="${item.file}" class="flex items-center gap-3.5 px-6 py-3.5 transition-all text-xs tracking-wider uppercase ${activeClass}">
          <i class="fa-solid ${item.icon} text-sm w-5"></i>
          <span>${item.label}</span>
        </a>
      `;
    }).join('');

    container.className = "fixed top-0 left-0 h-full w-64 bg-slate-950 border-r border-white/5 z-40 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 flex flex-col justify-between";
    container.id = "app-sidebar";

    container.innerHTML = `
      <div class="flex flex-col flex-grow overflow-y-auto">
        <!-- Sidebar Brand -->
        <div class="h-20 px-6 flex items-center justify-between border-b border-white/5">
          <a href="dashboard.html" class="flex items-center gap-2.5">
            <span class="font-serif text-lg font-bold tracking-widest text-gold">LAWAL<span class="text-[10px] font-sans text-slate-400 tracking-normal ml-1">.ORG</span></span>
          </a>
          <button id="close-sidebar-btn" class="lg:hidden text-slate-400 hover:text-white text-base">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Sidebar Navigation Menu -->
        <nav class="flex-grow py-6 flex flex-col gap-1">
          ${menuHtml}
        </nav>
      </div>

      <!-- Quick Session Footer -->
      <div class="p-6 border-t border-white/5 bg-slate-900/20 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="${user.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'}" alt="User avatar" class="w-8 h-8 rounded-full border border-gold/30 object-cover">
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-white truncate max-w-[120px]">${user.firstName} ${user.lastName}</span>
            <span class="text-[10px] text-slate-500 truncate max-w-[120px]">${user.role || 'Relative'}</span>
          </div>
        </div>
        <button id="logout-btn" title="Sign Out Securely" class="text-slate-500 hover:text-red-400 transition-colors text-sm">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    `;
  }

  static renderHeader(user) {
    const container = document.getElementById('header-container');
    if (!container) return;

    container.className = "sticky top-0 left-0 w-full h-20 bg-slate-950/80 backdrop-blur-md border-b border-white/5 z-30 lg:pl-64 transition-all duration-300";

    container.innerHTML = `
      <div class="max-w-7xl mx-auto h-full px-6 flex items-center justify-between gap-4">

        <!-- Left Part: Sidebar toggler & search bar trigger -->
        <div class="flex items-center gap-4 flex-grow max-w-lg">
          <button id="open-sidebar-btn" class="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 hover:text-white text-base">
            <i class="fa-solid fa-bars-staggered"></i>
          </button>

          <!-- Search triggers -->
          <button id="global-search-trigger" class="w-full max-w-xs h-10 px-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-gold/20 flex items-center justify-between text-slate-500 text-xs transition-all">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-magnifying-glass text-gold/60 text-[11px]"></i>
              <span>Search relatives, history, files...</span>
            </span>
            <kbd class="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-white/5 font-sans">⌘K</kbd>
          </button>
        </div>

        <!-- Right Part: Notifications, theme switch, profile dropdown -->
        <div class="flex items-center gap-3">

          <!-- Theme Switcher -->
          <button id="theme-toggle-btn" class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm" title="Toggle Light/Dark Theme">
            <i class="fa-solid fa-moon"></i>
          </button>

          <!-- Notifications Dropdown -->
          <div class="relative">
            <button id="notification-bell-btn" class="relative w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm">
              <i class="fa-solid fa-bell"></i>
              <span class="absolute top-2 right-2.5 w-1.5 h-1.5 bg-emerald rounded-full"></span>
            </button>
            <div id="notification-dropdown" class="hidden absolute right-0 mt-2.5 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 z-50">
              <div class="flex justify-between items-center border-b border-white/5 pb-2">
                <span class="text-xs font-serif font-bold text-white tracking-wide">Family Notices</span>
                <span class="text-[10px] text-emerald bg-emerald/10 px-1.5 py-0.5 rounded">1 New</span>
              </div>
              <div class="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                <div class="flex gap-2.5 items-start text-xs font-light">
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald mt-1.5 shrink-0"></div>
                  <div class="flex flex-col">
                    <span class="text-slate-200 font-medium">Grand Reunion 2024</span>
                    <span class="text-[10px] text-slate-500 leading-normal">Official invite sent for Dec 26, Lagos Civic Centre.</span>
                  </div>
                </div>
                <div class="flex gap-2.5 items-start text-xs font-light opacity-60">
                  <div class="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0"></div>
                  <div class="flex flex-col">
                    <span class="text-slate-200 font-medium">Birth of Kolawole Femi Lawal Jnr</span>
                    <span class="text-[10px] text-slate-500 leading-normal">Major Kunle and Chioma welcomed a baby boy.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Dropper -->
          <div class="relative">
            <button id="profile-menu-btn" class="flex items-center gap-2 hover:opacity-90 transition-all">
              <img src="${user.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'}" alt="User" class="w-10 h-10 rounded-xl object-cover border border-gold/20">
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-500 hidden sm:inline"></i>
            </button>
            <div id="profile-dropdown" class="hidden absolute right-0 mt-2.5 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 flex flex-col text-xs">
              <a href="profile.html" class="flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-all">
                <i class="fa-solid fa-user-circle text-gold"></i> My Profile
              </a>
              <a href="settings.html" class="flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-all">
                <i class="fa-solid fa-gears text-slate-400"></i> Settings
              </a>
              <div class="border-t border-white/5"></div>
              <button id="profile-logout-btn" class="flex items-center gap-2.5 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-all text-left w-full">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  static renderSearchModal() {
    const existing = document.getElementById('global-search-modal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.className = 'fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 transition-all opacity-0 pointer-events-none';
    modal.innerHTML = `
      <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform scale-95 transition-all duration-200" id="search-modal-card">

        <!-- Search Input Bar -->
        <div class="h-14 border-b border-white/5 px-4 flex items-center gap-3">
          <i class="fa-solid fa-magnifying-glass text-gold text-base"></i>
          <input
            type="text"
            id="global-search-input"
            placeholder="Search relatives, nicknames, education, roles, military service..."
            class="flex-grow h-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-slate-500"
          />
          <button id="close-search-modal-btn" class="text-xs text-slate-500 hover:text-white uppercase tracking-wider font-semibold">Esc</button>
        </div>

        <!-- Search Results area -->
        <div class="max-h-96 overflow-y-auto p-4 flex flex-col gap-4" id="global-search-results">
          <p class="text-xs text-slate-500 font-light italic">Type to begin search across the Lawal directory...</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  static registerToggles() {
    const sidebar = document.getElementById('app-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');

    // Sidebar Toggles
    if (openSidebarBtn && sidebar) {
      openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
      });
    }
    if (closeSidebarBtn && sidebar) {
      closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
      });
    }

    // Dropdown Toggles
    this.setupDropdown('notification-bell-btn', 'notification-dropdown');
    this.setupDropdown('profile-menu-btn', 'profile-dropdown');

    // Logout triggers
    const triggerLogout = () => Auth.logout();
    if (logoutBtn) logoutBtn.addEventListener('click', triggerLogout);
    if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', triggerLogout);

    // Global Search Modal trigger
    const searchModal = document.getElementById('global-search-modal');
    const searchCard = document.getElementById('search-modal-card');
    const searchTrigger = document.getElementById('global-search-trigger');
    const closeSearchBtn = document.getElementById('close-search-modal-btn');
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('global-search-results');

    const openSearch = () => {
      if (!searchModal) return;
      searchModal.classList.remove('pointer-events-none', 'opacity-0');
      searchModal.classList.add('opacity-100');
      searchCard.classList.remove('scale-95');
      searchCard.classList.add('scale-100');
      setTimeout(() => searchInput.focus(), 100);
    };

    const closeSearch = () => {
      if (!searchModal) return;
      searchModal.classList.add('pointer-events-none', 'opacity-0');
      searchModal.classList.remove('opacity-100');
      searchCard.classList.add('scale-95');
      searchCard.classList.remove('scale-100');
    };

    if (searchTrigger) searchTrigger.addEventListener('click', openSearch);
    if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearch);

    // Click outside to close search
    if (searchModal) {
      searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearch();
      });
    }

    // Ctrl + K listener
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') {
        closeSearch();
      }
    });

    // Handle instant real-time search logic
    if (searchInput && searchResults) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (!val) {
          searchResults.innerHTML = '<p class="text-xs text-slate-500 font-light italic">Type to begin search across the Lawal directory...</p>';
          return;
        }

        const members = DB.getMembers();
        const results = members.filter(m => {
          return m.firstName.toLowerCase().includes(val) ||
                 m.lastName.toLowerCase().includes(val) ||
                 (m.nickname && m.nickname.toLowerCase().includes(val)) ||
                 (m.role && m.role.toLowerCase().includes(val)) ||
                 (m.birthPlace && m.birthPlace.toLowerCase().includes(val)) ||
                 (m.education?.university && m.education.university.toLowerCase().includes(val)) ||
                 (m.career?.occupation && m.career.occupation.toLowerCase().includes(val)) ||
                 (m.military?.service && m.military.service.toLowerCase().includes(val)) ||
                 (m.generation && m.generation.toString() === val);
        });

        if (results.length === 0) {
          searchResults.innerHTML = '<p class="text-xs text-slate-500 font-light">No matching family records found.</p>';
          return;
        }

        searchResults.innerHTML = results.map(m => {
          return `
            <a href="member.html?id=${m.id}" class="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
              <div class="flex items-center gap-3.5">
                <img src="${m.avatar}" alt="${m.firstName}" class="w-10 h-10 rounded-full border border-gold/20 object-cover">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-white">${m.firstName} ${m.lastName} <span class="text-[10px] text-gold italic font-light font-serif ml-1">"${m.nickname || ''}"</span></span>
                  <span class="text-[10px] text-slate-400 font-light">${m.career?.occupation || 'Family Member'} • Gen ${m.generation}</span>
                </div>
              </div>
              <span class="text-[10px] uppercase font-bold tracking-wider text-gold flex items-center gap-1.5 bg-gold/5 border border-gold/15 px-2 py-0.5 rounded-full">
                View Profile <i class="fa-solid fa-arrow-right text-[8px]"></i>
              </span>
            </a>
          `;
        }).join('');
      });
    }

    // Theme toggle btn
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = curTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('lawal_theme', nextTheme);
        themeBtn.innerHTML = nextTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
      });
    }
  }

  static applySavedTheme() {
    const savedTheme = localStorage.getItem('lawal_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }
  }

  static setupDropdown(triggerId, dropdownId) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
}

// Automatically fire Navigation if imported as standard script in authenticated views.
document.addEventListener('DOMContentLoaded', () => {
  Navigation.init();
});
