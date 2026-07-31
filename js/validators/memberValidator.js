/**
 * Member Validator Module
 * Validates the canonical Family Member schema and business logic constraints.
 */

/**
 * Validates a family member object.
 *
 * @param {object} member - The family member data.
 * @returns {object} Validation result { isValid: boolean, errors: string[] }
 */
export function validateMember(member) {
  const errors = [];

  if (!member) {
    return {
      isValid: false,
      errors: ["Member data is null or undefined."]
    };
  }

  // 1. Required Fields validation
  if (!member.firstName || typeof member.firstName !== 'string' || member.firstName.trim() === '') {
    errors.push("First name is required and must be a non-empty string.");
  }

  if (!member.lastName || typeof member.lastName !== 'string' || member.lastName.trim() === '') {
    errors.push("Last name is required and must be a non-empty string.");
  }

  if (!member.gender || typeof member.gender !== 'string' || member.gender.trim() === '') {
    errors.push("Gender is required and must be a non-empty string.");
  } else {
    const validGenders = ["Male", "Female", "Other", "Unknown"];
    const normalizedGender = member.gender.trim().charAt(0).toUpperCase() + member.gender.trim().slice(1).toLowerCase();
    if (!validGenders.includes(normalizedGender)) {
      errors.push(`Gender must be one of: ${validGenders.join(", ")}.`);
    }
  }

  // Helper to validate date string format (YYYY-MM-DD or standard ISO/date strings)
  const isValidDateValue = (dateStr) => {
    if (!dateStr) return false;
    // Basic format or parse validation
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  };

  // 2. Birth date and death date format and logic validation
  if (member.birthDate) {
    if (!isValidDateValue(member.birthDate)) {
      errors.push("Birth date is invalid. Must be a valid date format (e.g., YYYY-MM-DD).");
    }
  }

  if (member.deathDate) {
    if (!isValidDateValue(member.deathDate)) {
      errors.push("Death date is invalid. Must be a valid date format (e.g., YYYY-MM-DD).");
    }

    // Logical validation: living must not be true if deathDate is set
    if (member.living === true) {
      errors.push("Member cannot be marked as living if death date is provided.");
    }
  }

  if (member.birthDate && member.deathDate && isValidDateValue(member.birthDate) && isValidDateValue(member.deathDate)) {
    const birth = new Date(member.birthDate);
    const death = new Date(member.deathDate);
    if (birth > death) {
      errors.push("Birth date cannot be after the death date.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hook point for duplicate member detection.
 * Checks if a member with similar characteristics already exists in the list.
 *
 * @param {object} newMember - The member being added/updated.
 * @param {object[]} existingMembers - List of existing members.
 * @returns {object|null} Returns the duplicate member if found, otherwise null.
 */
export function detectDuplicateMember(newMember, existingMembers = []) {
  if (!newMember || !newMember.firstName || !newMember.lastName) {
    return null;
  }

  const newFirst = newMember.firstName.trim().toLowerCase();
  const newLast = newMember.lastName.trim().toLowerCase();
  const newBirth = newMember.birthDate ? new Date(newMember.birthDate).toDateString() : null;

  for (const existing of existingMembers) {
    // If it's the exact same memberId, skip (it's an update)
    if (newMember.memberId && existing.memberId === newMember.memberId) {
      continue;
    }

    const extFirst = existing.firstName.trim().toLowerCase();
    const extLast = existing.lastName.trim().toLowerCase();
    const extBirth = existing.birthDate ? new Date(existing.birthDate).toDateString() : null;

    // Direct match on names
    if (newFirst === extFirst && newLast === extLast) {
      // If birthDate is specified on both and matches, highly likely a duplicate
      if (newBirth && extBirth && newBirth === extBirth) {
        return existing;
      }
      // If birthDate is not specified, we still trigger duplicate suspicion hook
      if (!newBirth || !extBirth) {
        return existing;
      }
    }
  }

  return null;
}

/**
 * Hook point for future circular ancestry detection on member-level hierarchy if applicable.
 * Primarily handles general check hooks.
 */
export function checkAncestryCircularHook(memberId, parents = [], existingRelationships = []) {
  // Placeholder/Hook for circular ancestry check at member level
  console.log(`[Ancestry Hook] Circular check triggered for ${memberId}`);
  return false;
}
