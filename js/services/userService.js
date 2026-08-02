/**
 * User Service Layer
 * Serves as the central interface for Administration & User Management.
 * Enforces permissions on the backend.
 */

import * as userRepository from "../repositories/userRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { ROLES, hasRole } from "../firebase/permissions.js";
import { logAction } from "../repositories/auditLogRepository.js";
import { PermissionDenied, ValidationError } from "./errors.js";

/**
 * Helper to check if current user is an authorized Administrator (Super Admin or Admin).
 *
 * @returns {object} The logged-in administrator user.
 * @throws {PermissionDenied}
 */
function enforceAdminPermission() {
  const adminUser = getCurrentUser();
  if (!adminUser) {
    throw new PermissionDenied("Authentication required.");
  }

  const isSuper = hasRole(adminUser, ROLES.SUPER_ADMIN);
  const isAdmin = hasRole(adminUser, ROLES.ADMIN);

  if (!isSuper && !isAdmin) {
    throw new PermissionDenied("Access denied. Administrative privileges required.");
  }

  return adminUser;
}

/**
 * View all registered users.
 * Accessible to Super Admins and Admins.
 *
 * @returns {Promise<object[]>}
 */
export async function getAllUsers() {
  enforceAdminPermission();
  return await userRepository.findAll();
}

/**
 * Changes any user's role according to strict hierarchical rules.
 *
 * @param {string} targetUid - UID of target user.
 * @param {string} newRole - Target role to set.
 * @returns {Promise<boolean>}
 */
export async function changeUserRole(targetUid, newRole) {
  const adminUser = enforceAdminPermission();
  const isSuper = hasRole(adminUser, ROLES.SUPER_ADMIN);

  const targetUser = await userRepository.findById(targetUid);
  if (!targetUser) {
    throw new ValidationError("Target user not found.");
  }

  const oldRole = targetUser.role || "MEMBER";

  // Super Admins can change any role and promote/demote Admins.
  // Admins can promote/demote Editors, Contributors, and Viewers.
  // Admins cannot modify Super Admin accounts or other Admin accounts.
  if (!isSuper) {
    // Current user is ADMIN
    // Check target role
    const isTargetAdmin = hasRole(targetUser, ROLES.SUPER_ADMIN) || hasRole(targetUser, ROLES.ADMIN);
    if (isTargetAdmin) {
      throw new PermissionDenied("Administrators cannot modify Super Admin or other Admin accounts.");
    }

    // Check proposed new role
    if (newRole === ROLES.SUPER_ADMIN || newRole === ROLES.ADMIN) {
      throw new PermissionDenied("Administrators cannot promote users to Super Admin or Admin.");
    }

    // Ensure they only manage Editors, Contributors, Viewers, or normal Members.
    const allowedRoles = [ROLES.EDITOR, ROLES.CONTRIBUTOR, ROLES.VIEWER, ROLES.MEMBER];
    if (!allowedRoles.includes(newRole)) {
      throw new ValidationError(`Invalid role: ${newRole}`);
    }
  }

  // Prevent self role change to avoid lockouts
  if (adminUser.uid === targetUid) {
    throw new ValidationError("Administrators cannot change their own roles to prevent accidental lockout.");
  }

  // Perform the role update
  const success = await userRepository.update(targetUid, { role: newRole });
  if (success) {
    // Write detailed administrative audit log
    await logAction("ROLE_CHANGE", "users", targetUid,
      { role: oldRole, displayName: targetUser.displayName, email: targetUser.email },
      { role: newRole, displayName: targetUser.displayName, email: targetUser.email }
    );
  }
  return success;
}

/**
 * Enables or disables a user account.
 *
 * @param {string} targetUid - UID of target user.
 * @param {boolean} active - Active status.
 * @returns {Promise<boolean>}
 */
export async function toggleUserStatus(targetUid, active) {
  const adminUser = enforceAdminPermission();
  const isSuper = hasRole(adminUser, ROLES.SUPER_ADMIN);

  const targetUser = await userRepository.findById(targetUid);
  if (!targetUser) {
    throw new ValidationError("Target user not found.");
  }

  const oldActive = targetUser.active !== false; // default true

  if (!isSuper) {
    // Current user is ADMIN
    const isTargetAdmin = hasRole(targetUser, ROLES.SUPER_ADMIN) || hasRole(targetUser, ROLES.ADMIN);
    if (isTargetAdmin) {
      throw new PermissionDenied("Administrators cannot enable or disable Super Admin or other Admin accounts.");
    }
  }

  // Prevent self deactivation
  if (adminUser.uid === targetUid) {
    throw new ValidationError("Administrators cannot disable their own accounts.");
  }

  const success = await userRepository.update(targetUid, { active });
  if (success) {
    await logAction("ACCOUNT_STATUS_CHANGE", "users", targetUid,
      { active: oldActive, displayName: targetUser.displayName, email: targetUser.email },
      { active, displayName: targetUser.displayName, email: targetUser.email }
    );
  }
  return success;
}

/**
 * Removes a user account entirely.
 * Super Admins only.
 *
 * @param {string} targetUid - UID of target user.
 * @returns {Promise<boolean>}
 */
export async function removeUser(targetUid) {
  const adminUser = enforceAdminPermission();
  const isSuper = hasRole(adminUser, ROLES.SUPER_ADMIN);

  if (!isSuper) {
    throw new PermissionDenied("Only Super Admins are allowed to remove users.");
  }

  const targetUser = await userRepository.findById(targetUid);
  if (!targetUser) {
    throw new ValidationError("Target user not found.");
  }

  // Prevent self removal
  if (adminUser.uid === targetUid) {
    throw new ValidationError("Super Admins cannot remove their own accounts.");
  }

  const success = await userRepository.deleteUser(targetUid);
  if (success) {
    await logAction("USER_REMOVE", "users", targetUid,
      { displayName: targetUser.displayName, email: targetUser.email, role: targetUser.role },
      null
    );
  }
  return success;
}
