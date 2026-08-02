/**
 * Member Service Layer
 * Serves as the central interface between the UI and the familyMembers Repository.
 */

import * as familyRepository from "../repositories/familyRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { ROLES, hasRole } from "../firebase/permissions.js";
import { validateMember as validateMemberValidator, detectDuplicateMember } from "../validators/memberValidator.js";
import { publish } from "./eventBus.js";
import {
  ValidationError,
  PermissionDenied,
  DuplicateRecord,
  DatabaseFailure
} from "./errors.js";

/**
 * Helper to enforce permission roles.
 *
 * @param {string[]} allowedRoles - List of allowed roles.
 * @param {object} targetMember - Optional member being modified.
 * @throws {PermissionDenied}
 */
function enforcePermission(allowedRoles, targetMember = null) {
  const user = getCurrentUser();
  if (!user) {
    throw new PermissionDenied("Authentication required to perform this action.");
  }

  // SUPER_ADMIN has absolute control
  if (hasRole(user, ROLES.SUPER_ADMIN)) {
    return user;
  }

  // ADMIN has administrative control
  if (hasRole(user, ROLES.ADMIN)) {
    return user;
  }

  // FAMILY_ADMIN can manage the entire family
  if (hasRole(user, ROLES.FAMILY_ADMIN)) {
    return user;
  }

  // BRANCH_ADMIN can manage their own branch
  if (hasRole(user, ROLES.BRANCH_ADMIN)) {
    if (targetMember) {
      const userBranch = String(user.branch || "").trim().toLowerCase();
      const targetBranch = String(targetMember.branchId || targetMember.branch || "").trim().toLowerCase();
      if (userBranch && targetBranch && userBranch === targetBranch) {
        return user;
      }
      throw new PermissionDenied(`Branch administrators can only manage their own branch (${user.branch}).`);
    }
    return user;
  }

  // Check general roles
  for (const role of allowedRoles) {
    if (hasRole(user, role)) {
      if (role === ROLES.MEMBER) {
        // MEMBERS can only edit their own profile
        if (targetMember && (targetMember.memberId === user.uid || targetMember.uid === user.uid)) {
          return user;
        }
        continue;
      }
      return user;
    }
  }

  throw new PermissionDenied("You do not have permission to perform this action.");
}

/**
 * Creates a new family member.
 *
 * @param {object} data - Member data.
 * @returns {Promise<string>} Created member ID.
 */
export async function createMember(data) {
  const user = enforcePermission([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FAMILY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EDITOR, ROLES.CONTRIBUTOR]);

  // If BRANCH_ADMIN, enforce adding only to their own branch
  if (hasRole(user, ROLES.BRANCH_ADMIN)) {
    const userBranch = String(user.branch || "").trim().toLowerCase();
    const inputBranch = String(data.branchId || data.branch || "").trim().toLowerCase();
    if (userBranch && inputBranch && userBranch !== inputBranch) {
      throw new PermissionDenied(`Branch administrators can only create members for their own branch: ${user.branch}`);
    }
  }

  // Validate member data
  const valResult = validateMember(data);
  if (!valResult.isValid) {
    throw new ValidationError(`Member validation failed: ${valResult.errors.join("; ")}`);
  }

  // Check duplicate member
  const isDuplicate = await duplicateCheck(data);
  if (isDuplicate) {
    throw new DuplicateRecord("A family member with the same name and birth date already exists.");
  }

  try {
    const finalData = {
      ...data,
      createdBy: user.uid,
      createdAt: new Date().toISOString()
    };
    const memberId = await familyRepository.create(finalData);
    publish("memberCreated", { memberId, ...finalData });
    return memberId;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new DatabaseFailure(`Failed to create member in database: ${error}`);
  }
}

/**
 * Updates an existing family member.
 *
 * @param {string} id - Member ID.
 * @param {object} data - Key-values to update.
 * @returns {Promise<boolean>}
 */
export async function updateMember(id, data) {
  const current = await familyRepository.findById(id, true);
  if (!current) {
    throw new ValidationError(`Member with ID [${id}] not found.`);
  }

  // Enforce permissions for update
  enforcePermission([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FAMILY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EDITOR, ROLES.MEMBER], current);

  // If validation fails
  const merged = { ...current, ...data };
  const valResult = validateMember(merged);
  if (!valResult.isValid) {
    throw new ValidationError(`Member validation failed: ${valResult.errors.join("; ")}`);
  }

  try {
    const success = await familyRepository.update(id, data);
    if (success) {
      publish("memberUpdated", { memberId: id, ...data });
    }
    return success;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new DatabaseFailure(`Failed to update member in database: ${error}`);
  }
}

/**
 * Soft deletes a family member.
 *
 * @param {string} id - Member ID.
 * @returns {Promise<boolean>}
 */
export async function softDeleteMember(id) {
  const current = await familyRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Active member with ID [${id}] not found.`);
  }

  const user = enforcePermission([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FAMILY_ADMIN]);

  try {
    const deletedAt = new Date().toISOString();
    const deletedBy = user.uid;
    const success = await familyRepository.update(id, {
      deleted: true,
      deletedAt,
      deletedBy
    });
    if (success) {
      publish("memberDeleted", { memberId: id, deletedAt, deletedBy });
    }
    return success;
  } catch (error) {
    throw new DatabaseFailure(`Failed to soft-delete member in database: ${error}`);
  }
}

/**
 * Restores a soft-deleted family member.
 *
 * @param {string} id - Member ID.
 * @returns {Promise<boolean>}
 */
export async function restoreMember(id) {
  const current = await familyRepository.findById(id, true);
  if (!current) {
    throw new ValidationError(`Member with ID [${id}] not found.`);
  }

  if (!current.deleted) {
    return true; // Already active
  }

  enforcePermission([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FAMILY_ADMIN]);

  try {
    const success = await familyRepository.update(id, {
      deleted: false,
      deletedAt: null,
      deletedBy: null
    });
    if (success) {
      publish("memberUpdated", { memberId: id, deleted: false });
    }
    return success;
  } catch (error) {
    throw new DatabaseFailure(`Failed to restore member in database: ${error}`);
  }
}

/**
 * Archives a family member.
 *
 * @param {string} id - Member ID.
 * @returns {Promise<boolean>}
 */
export async function archiveMember(id) {
  const current = await familyRepository.findById(id, true);
  if (!current) {
    throw new ValidationError(`Member with ID [${id}] not found.`);
  }

  const user = enforcePermission([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FAMILY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.EDITOR], current);

  try {
    const archivedAt = new Date().toISOString();
    const archivedBy = user.uid;
    const success = await familyRepository.update(id, {
      archived: true,
      archivedAt,
      archivedBy,
      status: "Archived"
    });
    if (success) {
      publish("memberUpdated", { memberId: id, archived: true, status: "Archived" });
    }
    return success;
  } catch (error) {
    throw new DatabaseFailure(`Failed to archive member in database: ${error}`);
  }
}

/**
 * Finds a member by ID.
 *
 * @param {string} id - Member ID.
 * @param {boolean} includeDeleted - Whether to retrieve soft-deleted members.
 * @returns {Promise<object|null>}
 */
export async function getMember(id, includeDeleted = false) {
  return await familyRepository.findById(id, includeDeleted);
}

/**
 * Checks if a member exists.
 *
 * @param {string} id - Member ID.
 * @returns {Promise<boolean>}
 */
export async function memberExists(id) {
  const m = await getMember(id);
  return m !== null;
}

/**
 * Performs validation on member details.
 *
 * @param {object} data - Member details.
 * @returns {object} Validation result { isValid, errors }
 */
export function validateMember(data) {
  return validateMemberValidator(data);
}

/**
 * Checks if a proposed member would be a duplicate in the database.
 *
 * @param {object} data - Proposed member details.
 * @returns {Promise<boolean>} True if duplicate exists.
 */
export async function duplicateCheck(data) {
  const existing = await familyRepository.findAll(true);
  const match = detectDuplicateMember(data, existing);
  return match !== null;
}

/**
 * Searches family members.
 *
 * @param {object} criteria - Search parameters.
 * @returns {Promise<object[]>} Array of matching members.
 */
export async function searchMembers(criteria = {}) {
  const all = await familyRepository.findAll(criteria.includeDeleted === true);
  let filtered = [...all];

  if (criteria.firstName) {
    const q = criteria.firstName.toLowerCase().trim();
    filtered = filtered.filter(m => m.firstName && m.firstName.toLowerCase().includes(q));
  }

  if (criteria.lastName) {
    const q = criteria.lastName.toLowerCase().trim();
    filtered = filtered.filter(m => m.lastName && m.lastName.toLowerCase().includes(q));
  }

  if (criteria.preferredName) {
    const q = criteria.preferredName.toLowerCase().trim();
    filtered = filtered.filter(m => (m.preferredName && m.preferredName.toLowerCase().includes(q)) || (m.nickname && m.nickname.toLowerCase().includes(q)));
  }

  if (criteria.occupation) {
    const q = criteria.occupation.toLowerCase().trim();
    filtered = filtered.filter(m => (m.occupation && m.occupation.toLowerCase().includes(q)) || (m.career && m.career.occupation && m.career.occupation.toLowerCase().includes(q)));
  }

  if (criteria.branchId || criteria.branch) {
    const b = String(criteria.branchId || criteria.branch).toLowerCase().trim();
    filtered = filtered.filter(m => String(m.branchId || m.branch || "").toLowerCase().includes(b));
  }

  if (criteria.nationality) {
    const q = criteria.nationality.toLowerCase().trim();
    filtered = filtered.filter(m => m.nationality && m.nationality.toLowerCase().includes(q));
  }

  if (criteria.militaryService) {
    const q = criteria.militaryService.toLowerCase().trim();
    filtered = filtered.filter(m => {
      const fieldVal = m.militaryService || (m.military && m.military.service) || "";
      return String(fieldVal).toLowerCase().includes(q);
    });
  }

  if (criteria.birthYear) {
    const yr = String(criteria.birthYear);
    filtered = filtered.filter(m => {
      const birthStr = String(m.birthDate || "");
      return birthStr.startsWith(yr) || birthStr.includes(yr);
    });
  }

  if (criteria.living !== undefined) {
    const val = criteria.living === true || String(criteria.living).toLowerCase() === "true" || criteria.living === "Living";
    filtered = filtered.filter(m => {
      const isLiving = m.living === true || m.status === "Living";
      return isLiving === val;
    });
  }

  return filtered;
}
