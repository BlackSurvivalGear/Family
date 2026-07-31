/**
 * Permissions & Role Management System
 * Prepared for Firebase user roles integration.
 *
 * Supported roles and fine-grained authorization helper utilities.
 */

// Supported user roles in the House of Lawal Private Portal
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",     // Absolute control (Portal Configuration, Role assignment)
  FAMILY_ADMIN: "FAMILY_ADMIN",   // High management authority over specific branches and family data
  BRANCH_ADMIN: "BRANCH_ADMIN",   // Admin of specific geo-branch (Lagos, London, US, Abuja)
  HISTORIAN: "HISTORIAN",         // Authority to manage ancestral lineages and timeline documentation
  EDITOR: "EDITOR",               // General read/write edits access to records, calendar, gallery
  MEMBER: "MEMBER",               // General family relative with normal viewing & safe personal edits
  GUEST: "GUEST"                  // Read-only restricted view
};

/**
 * Check if the active user possesses a specific role.
 *
 * @param {object} user - The user object containing role field.
 * @param {string} role - The target role to verify against.
 * @returns {boolean} True if user role matches, false otherwise.
 */
export function hasRole(user, role) {
  if (!user || !user.role) return false;

  // Normalize and compare
  const userRoleNormalized = String(user.role).toUpperCase().replace(/\s/g, "_");
  const targetRoleNormalized = String(role).toUpperCase().replace(/\s/g, "_");

  // For safety and compatibility, allow matching both exact and normalized keys
  return userRoleNormalized === targetRoleNormalized ||
         user.role === role ||
         (user.role === "Family Relative" && role === ROLES.MEMBER); // Simple mapping fallback
}

/**
 * Determines whether a user has authorization to create/edit general family tree files or entries.
 *
 * @param {object} user - The user object requesting access.
 * @returns {boolean} True if user is allowed to edit.
 */
export function canEdit(user) {
  if (!user) return false;

  // High level roles and editor roles can edit
  return hasRole(user, ROLES.SUPER_ADMIN) ||
         hasRole(user, ROLES.FAMILY_ADMIN) ||
         hasRole(user, ROLES.BRANCH_ADMIN) ||
         hasRole(user, ROLES.HISTORIAN) ||
         hasRole(user, ROLES.EDITOR);
}

/**
 * Determines whether a user has permission to view portal sections.
 *
 * @param {object} user - The user object requesting access.
 * @returns {boolean} True if user is allowed to view.
 */
export function canView(user) {
  // All authenticated family members, administrators, and guests can view.
  return user !== null && user !== undefined;
}

/**
 * Determines whether a user has authorization to delete critical logs, documents, or relatives.
 * Only administrative accounts should have destructive deletion capability.
 *
 * @param {object} user - The user object requesting access.
 * @returns {boolean} True if user is allowed to delete.
 */
export function canDelete(user) {
  if (!user) return false;

  return hasRole(user, ROLES.SUPER_ADMIN) ||
         hasRole(user, ROLES.FAMILY_ADMIN);
}
