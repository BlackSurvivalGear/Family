/**
 * Relationship Validator Module
 * Validates relationship integrity, correct types, and circular ancestry checks.
 */

export const RELATIONSHIP_TYPES = {
  BIOLOGICAL_FATHER: "BIOLOGICAL_FATHER",
  BIOLOGICAL_MOTHER: "BIOLOGICAL_MOTHER",
  BIOLOGICAL_CHILD: "BIOLOGICAL_CHILD",
  SPOUSE: "SPOUSE",
  FORMER_SPOUSE: "FORMER_SPOUSE",
  ADOPTIVE_PARENT: "ADOPTIVE_PARENT",
  ADOPTED_CHILD: "ADOPTED_CHILD",
  STEP_PARENT: "STEP_PARENT",
  STEP_CHILD: "STEP_CHILD",
  FOSTER_PARENT: "FOSTER_PARENT",
  FOSTER_CHILD: "FOSTER_CHILD",
  GUARDIAN: "GUARDIAN",
  WARD: "WARD",
  TWIN: "TWIN",
  HALF_SIBLING: "HALF_SIBLING"
};

/**
 * Helper to extract parent and child IDs based on relationship type.
 *
 * @param {object} rel - The relationship object.
 * @returns {object|null} { parent, child } or null if not a parent-child relationship.
 */
export function getParentChild(rel) {
  if (!rel || !rel.relationshipType) return null;
  const type = rel.relationshipType.trim().toUpperCase();

  const parentAKeys = [
    "BIOLOGICAL_FATHER", "BIOLOGICAL_MOTHER", "ADOPTIVE_PARENT", "STEP_PARENT", "FOSTER_PARENT", "GUARDIAN"
  ];
  const parentBKeys = [
    "BIOLOGICAL_CHILD", "ADOPTED_CHILD", "STEP_CHILD", "FOSTER_CHILD", "WARD"
  ];

  if (parentAKeys.includes(type)) {
    return { parent: rel.personA, child: rel.personB };
  }
  if (parentBKeys.includes(type)) {
    return { parent: rel.personB, child: rel.personA };
  }
  return null;
}

/**
 * Validates a relationship object.
 *
 * @param {object} rel - The relationship data.
 * @returns {object} Validation result { isValid: boolean, errors: string[] }
 */
export function validateRelationship(rel) {
  const errors = [];

  if (!rel) {
    return {
      isValid: false,
      errors: ["Relationship data is null or undefined."]
    };
  }

  // 1. Required Fields
  if (!rel.personA || typeof rel.personA !== 'string' || rel.personA.trim() === '') {
    errors.push("personA (first person ID) is required and must be a non-empty string.");
  }

  if (!rel.personB || typeof rel.personB !== 'string' || rel.personB.trim() === '') {
    errors.push("personB (second person ID) is required and must be a non-empty string.");
  }

  // Self-relationship check
  if (rel.personA && rel.personB && rel.personA.trim() === rel.personB.trim()) {
    errors.push("A person cannot have a relationship with themselves.");
  }

  // 2. Valid Relationship Type
  if (!rel.relationshipType || typeof rel.relationshipType !== 'string' || rel.relationshipType.trim() === '') {
    errors.push("relationshipType is required.");
  } else {
    const validTypes = Object.values(RELATIONSHIP_TYPES);
    if (!validTypes.includes(rel.relationshipType.trim().toUpperCase())) {
      errors.push(`relationshipType must be one of: ${validTypes.join(", ")}.`);
    }
  }

  // Helper to validate date string format (YYYY-MM-DD or standard ISO/date strings)
  const isValidDateValue = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  };

  // 3. Date checks
  if (rel.startDate) {
    if (!isValidDateValue(rel.startDate)) {
      errors.push("Start date is invalid. Must be a valid date format.");
    }
  }

  if (rel.endDate) {
    if (!isValidDateValue(rel.endDate)) {
      errors.push("End date is invalid. Must be a valid date format.");
    }
  }

  if (rel.startDate && rel.endDate && isValidDateValue(rel.startDate) && isValidDateValue(rel.endDate)) {
    const start = new Date(rel.startDate);
    const end = new Date(rel.endDate);
    if (start > end) {
      errors.push("Relationship start date cannot be after the end date.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Detects circular ancestry in a collection of relationships.
 * e.g., Person A is parent of Person B, Person B is parent of Person C, and Person C is parent of Person A.
 * Supports parental relationship types.
 *
 * @param {string} startPersonId - Child Person ID being checked.
 * @param {string} targetParentId - The proposed parent ID of startPersonId.
 * @param {object[]} relationships - Complete list of relationships.
 * @returns {boolean} True if a circular path is detected, false otherwise.
 */
export function detectCircularAncestry(startPersonId, targetParentId, relationships = []) {
  if (!startPersonId || !targetParentId) {
    return false;
  }

  // If proposed parent is the same as the person, that's circular/invalid
  if (startPersonId === targetParentId) {
    return true;
  }

  // Trace descendants starting from startPersonId (the child).
  // If targetParentId is found among the descendants, it means targetParentId is a child/grandchild/etc.
  // of startPersonId, which would create a circular reference if targetParentId becomes parent of startPersonId.
  const descendants = new Set();
  const queue = [startPersonId];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all children/descendants of current
    for (const rel of relationships) {
      const pc = getParentChild(rel);
      if (pc && pc.parent === current) {
        descendants.add(pc.child);
        queue.push(pc.child);
      }
    }
  }

  // If proposed parent is already in the descendants of the child, it's circular!
  return descendants.has(targetParentId);
}
