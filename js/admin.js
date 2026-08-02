/**
 * Portal Administration Console Module
 * Governs the frontend User Management and Audit Logging interface.
 */

import { initializeAuth, authCheckPromise, getCurrentUser } from "./firebase/auth.js";
import { ROLES, hasRole } from "./firebase/permissions.js";
import * as userService from "./services/userService.js";
import * as auditLogRepository from "./repositories/auditLogRepository.js";
import * as userRepository from "./repositories/userRepository.js";

// Page security check
async function checkAccess() {
  try {
    await initializeAuth();
    await authCheckPromise;
  } catch (err) {
    console.error("Auth initialization error:", err);
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "signin.html";
    return false;
  }

  if (!hasRole(currentUser, ROLES.SUPER_ADMIN) && !hasRole(currentUser, ROLES.ADMIN)) {
    // Unauthorized, redirect to dashboard
    window.location.href = "dashboard.html";
    return false;
  }

  // Seeding simulated users if empty or only 1 exists
  seedMockUsersIfNeeded();

  return true;
}

/**
 * Seeds mock users into simulated local storage if empty,
 * to ensure robust operation in offline/simulation mode.
 */
function seedMockUsersIfNeeded() {
  const LOCAL_STORAGE_KEY = "lawal_users_records";
  try {
    let users = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      users = JSON.parse(raw);
    }

    // Always ensure current user is in user list
    const current = getCurrentUser();
    if (current && !users.find(u => u.uid === current.uid)) {
      users.push(current);
    }

    // Seed others if list is too small
    if (users.length <= 1) {
      const mockUsers = [
        {
          uid: "mock-admin-2",
          firstName: "Tunde",
          lastName: "Lawal",
          displayName: "Tunde Lawal",
          email: "tunde.admin@lawal.org",
          role: "ADMIN",
          active: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          uid: "mock-editor",
          firstName: "Femi",
          lastName: "Lawal",
          displayName: "Femi Lawal",
          email: "femi.editor@lawal.org",
          role: "EDITOR",
          active: true,
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          uid: "mock-contrib",
          firstName: "Kunle",
          lastName: "Lawal",
          displayName: "Kunle Lawal",
          email: "kunle.contrib@lawal.org",
          role: "CONTRIBUTOR",
          active: true,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          uid: "mock-viewer",
          firstName: "Chioma",
          lastName: "Lawal",
          displayName: "Chioma Lawal",
          email: "chioma.viewer@lawal.org",
          role: "VIEWER",
          active: true,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          lastLogin: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          uid: "mock-member",
          firstName: "Sola",
          lastName: "Lawal",
          displayName: "Sola Lawal",
          email: "sola.member@lawal.org",
          role: "MEMBER",
          active: false, // Start deactivated for testing
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const mu of mockUsers) {
        if (!users.find(u => u.email === mu.email)) {
          users.push(mu);
        }
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
    }
  } catch (e) {
    console.error("Error seeding mock users:", e);
  }
}

// Global modal triggers
function showConfirm(title, message, isDangerous = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    const cancelBtn = document.getElementById("confirm-cancel-btn");
    const okBtn = document.getElementById("confirm-ok-btn");

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (isDangerous) {
      okBtn.className = "px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors font-semibold";
    } else {
      okBtn.className = "px-4 py-2 bg-gold hover:bg-gold/90 text-slate-950 font-bold rounded-lg transition-colors font-semibold";
    }

    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    }, 50);

    const cleanup = (val) => {
      modal.classList.remove("opacity-100");
      modal.classList.add("opacity-0");
      setTimeout(() => {
        modal.classList.add("hidden");
      }, 200);
      cancelBtn.onclick = null;
      okBtn.onclick = null;
      resolve(val);
    };

    cancelBtn.onclick = () => cleanup(false);
    okBtn.onclick = () => cleanup(true);
  });
}

function showAlert(message, type = "success") {
  const alertBox = document.getElementById("admin-alert-box");
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.className = "p-4 rounded-xl text-xs font-medium text-center shadow-lg border ";
  if (type === "success") {
    alertBox.className += "bg-emerald/10 text-emerald border-emerald/20";
  } else {
    alertBox.className += "bg-red-500/10 text-red-400 border-red-500/20";
  }

  alertBox.classList.remove("hidden");
  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 5000);
}

// UI Rendering Functions
async function loadUsersTable() {
  const tbody = document.getElementById("users-table-body");
  const badge = document.getElementById("user-count-badge");
  if (!tbody) return;

  try {
    const users = await userService.getAllUsers();
    badge.textContent = `${users.length} Users`;

    const currentUser = getCurrentUser();
    const isSuper = hasRole(currentUser, ROLES.SUPER_ADMIN);

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 italic">No registered users found.</td></tr>`;
      return;
    }

    // Sort users by email/name
    users.sort((a, b) => String(a.email).localeCompare(b.email));

    tbody.innerHTML = users.map(user => {
      const isSelf = user.uid === currentUser.uid;
      const targetIsAdminOrSuper = hasRole(user, ROLES.SUPER_ADMIN) || hasRole(user, ROLES.ADMIN);
      const canManageRole = isSuper ? !isSelf : (!targetIsAdminOrSuper && !isSelf);
      const canManageStatus = isSuper ? !isSelf : (!targetIsAdminOrSuper && !isSelf);
      const canRemove = isSuper && !isSelf;

      // Dropdown roles
      const availableRoles = isSuper
        ? [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.CONTRIBUTOR, ROLES.VIEWER, ROLES.MEMBER]
        : [ROLES.EDITOR, ROLES.CONTRIBUTOR, ROLES.VIEWER, ROLES.MEMBER];

      const roleSelectHtml = canManageRole
        ? `
          <select data-uid="${user.uid}" class="role-select bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold">
            ${availableRoles.map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r.replace("_", " ")}</option>`).join("")}
          </select>
        `
        : `<span class="px-2 py-1 bg-white/5 rounded text-slate-400 font-mono text-[11px]">${(user.role || 'MEMBER').replace("_", " ")}</span>`;

      // Status Toggle Button
      const isActive = user.active !== false;
      const statusBadge = isActive
        ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald/10 text-emerald border border-emerald/20">Active</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Disabled</span>`;

      const statusBtnHtml = canManageStatus
        ? `
          <button data-uid="${user.uid}" data-active="${isActive}" class="status-toggle-btn px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-colors ${
            isActive ? 'bg-red-500/10 hover:bg-red-600 hover:text-white text-red-400' : 'bg-gold/10 hover:bg-gold hover:text-slate-950 text-gold'
          }">
            ${isActive ? 'Disable' : 'Enable'}
          </button>
        `
        : `<span class="text-slate-500 italic text-[11px]">Static</span>`;

      // Remove Button
      const removeBtnHtml = canRemove
        ? `
          <button data-uid="${user.uid}" class="remove-user-btn p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Remove user permanently">
            <i class="fa-solid fa-trash-can text-sm"></i>
          </button>
        `
        : '';

      const dateJoined = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "N/A";
      const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : "Never";

      return `
        <tr class="hover:bg-white/5 transition-all">
          <td class="py-3.5 px-4 flex flex-col gap-0.5">
            <span class="font-semibold text-white">${user.displayName || (user.firstName + " " + user.lastName)}</span>
            <span class="text-[10px] text-slate-500 font-mono">${user.email}</span>
          </td>
          <td class="py-3.5 px-4">${roleSelectHtml}</td>
          <td class="py-3.5 px-4 flex items-center gap-3 mt-1">${statusBadge} ${statusBtnHtml}</td>
          <td class="py-3.5 px-4 text-slate-400">${dateJoined}</td>
          <td class="py-3.5 px-4 text-slate-400 font-mono text-[11px]">${lastLogin}</td>
          <td class="py-3.5 px-4 text-right">${removeBtnHtml}</td>
        </tr>
      `;
    }).join("");

    bindUserActions();

  } catch (error) {
    console.error("Error displaying users directory:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-400">Failed to load users: ${error.message}</td></tr>`;
  }
}

async function loadAuditTable() {
  const tbody = document.getElementById("audit-table-body");
  if (!tbody) return;

  try {
    const logs = await auditLogRepository.findAll();
    const users = await userRepository.findAll();

    const userMap = {};
    for (const u of users) {
      userMap[u.uid] = u.displayName || `${u.firstName} ${u.lastName}`;
    }

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 italic">No administrative logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const adminName = userMap[log.userId] || log.userId || "System";
      const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A";

      // Formulate old & new state descriptions
      let oldDesc = "N/A";
      let newDesc = "N/A";

      if (log.action === "ROLE_CHANGE") {
        oldDesc = `<span class="px-1.5 py-0.5 bg-white/5 text-slate-400 font-mono rounded text-[10px]">${log.oldValue?.role || "UNKNOWN"}</span>`;
        newDesc = `<span class="px-1.5 py-0.5 bg-gold/10 text-gold font-mono rounded text-[10px]">${log.newValue?.role || "UNKNOWN"}</span>`;
      } else if (log.action === "ACCOUNT_STATUS_CHANGE") {
        oldDesc = log.oldValue?.active ? "Active" : "Disabled";
        newDesc = log.newValue?.active ? "Active" : "Disabled";
      } else if (log.action === "USER_REMOVE") {
        oldDesc = `Profile: ${log.oldValue?.displayName || "N/A"} (${log.oldValue?.role || "N/A"})`;
        newDesc = `<span class="text-red-400">Removed</span>`;
      } else {
        oldDesc = log.oldValue ? JSON.stringify(log.oldValue) : "N/A";
        newDesc = log.newValue ? JSON.stringify(log.newValue) : "N/A";
      }

      const targetLabel = log.newValue?.displayName || log.oldValue?.displayName || log.documentId || "System";

      return `
        <tr class="hover:bg-white/5 transition-all">
          <td class="py-3 px-4 font-semibold text-white">${adminName}</td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              log.action === 'ROLE_CHANGE' ? 'bg-gold/10 text-gold' :
              log.action === 'ACCOUNT_STATUS_CHANGE' ? 'bg-emerald/10 text-emerald' : 'bg-red-500/10 text-red-400'
            }">${log.action.replace(/_/g, " ")}</span>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-300">${targetLabel}</td>
          <td class="py-3 px-4 text-slate-400">${oldDesc}</td>
          <td class="py-3 px-4 text-slate-300 font-medium">${newDesc}</td>
          <td class="py-3 px-4 text-slate-500 text-[11px]">${timestamp}</td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error("Error loading audit logs:", error);
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-400">Failed to load logs: ${error.message}</td></tr>`;
  }
}

function bindUserActions() {
  // Role selectors
  document.querySelectorAll(".role-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const targetUid = e.target.getAttribute("data-uid");
      const newRole = e.target.value;

      const userList = await userRepository.findAll();
      const targetUser = userList.find(u => u.uid === targetUid);
      const targetName = targetUser ? (targetUser.displayName || targetUser.email) : targetUid;

      const confirmed = await showConfirm(
        "Confirm Role Assignment",
        `Are you sure you want to change the access role of '${targetName}' to ${newRole.replace("_", " ")}?`
      );

      if (confirmed) {
        try {
          await userService.changeUserRole(targetUid, newRole);
          showAlert(`Access role for '${targetName}' updated successfully to ${newRole}.`);
          await loadUsersTable();
          await loadAuditTable();
        } catch (error) {
          showAlert(error.message, "error");
          e.target.value = targetUser.role; // Reset selection
        }
      } else {
        e.target.value = targetUser.role; // Reset selection
      }
    });
  });

  // Enable/Disable Status toggle buttons
  document.querySelectorAll(".status-toggle-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const targetUid = e.currentTarget.getAttribute("data-uid");
      const currentActive = e.currentTarget.getAttribute("data-active") === "true";
      const nextActive = !currentActive;

      const userList = await userRepository.findAll();
      const targetUser = userList.find(u => u.uid === targetUid);
      const targetName = targetUser ? (targetUser.displayName || targetUser.email) : targetUid;

      const confirmed = await showConfirm(
        nextActive ? "Enable Account" : "Disable Account",
        `Are you sure you want to ${nextActive ? 'enable' : 'disable'} the login account for '${targetName}'?`,
        !nextActive
      );

      if (confirmed) {
        try {
          await userService.toggleUserStatus(targetUid, nextActive);
          showAlert(`Account for '${targetName}' has been ${nextActive ? 'enabled' : 'disabled'} successfully.`);
          await loadUsersTable();
          await loadAuditTable();
        } catch (error) {
          showAlert(error.message, "error");
        }
      }
    });
  });

  // Remove buttons (Super Admin only)
  document.querySelectorAll(".remove-user-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const targetUid = e.currentTarget.getAttribute("data-uid");

      const userList = await userRepository.findAll();
      const targetUser = userList.find(u => u.uid === targetUid);
      const targetName = targetUser ? (targetUser.displayName || targetUser.email) : targetUid;

      const confirmed = await showConfirm(
        "Delete User Account",
        `DANGER: Are you sure you want to completely delete the registered profile of '${targetName}'? This action cannot be undone.`,
        true
      );

      if (confirmed) {
        try {
          await userService.removeUser(targetUid);
          showAlert(`Account for '${targetName}' has been permanently deleted.`);
          await loadUsersTable();
          await loadAuditTable();
        } catch (error) {
          showAlert(error.message, "error");
        }
      }
    });
  });
}

// Initialization Entrypoint
document.addEventListener("DOMContentLoaded", async () => {
  const isAuthorized = await checkAccess();
  if (!isAuthorized) return;

  // Render lists
  await loadUsersTable();
  await loadAuditTable();

  // Attach refresh trigger
  const refreshBtn = document.getElementById("refresh-audit-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await loadAuditTable();
    });
  }
});
