/**
 * Relationship Service Layer
 * Serves as the interface between the UI and the relationships Repository, delegating all validation to the Relationship Engine.
 */

import * as relationshipRepository from "../repositories/relationshipRepository.js";
import * as familyRepository from "../repositories/familyRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { ROLES, hasRole } from "../firebase/permissions.js";
import { validateRelationship as validateRelationshipValidator, detectCircularAncestry, RELATIONSHIP_TYPES, getParentChild } from "../validators/relationshipValidator.js";
import { publish } from "./eventBus.js";
import { db } from "../firebase/firebase.js";
import {
  runTransaction,
  doc,
  setDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ValidationError,
  PermissionDenied,
  DuplicateRecord,
  RelationshipConflict,
  CircularRelationship,
  DatabaseFailure
} from "./errors.js";

/**
 * Helper to enforce permission roles for genealogy modifications.
 *
 * @throws {PermissionDenied}
 */
function enforcePermission() {
  const user = getCurrentUser();
  if (!user) {
    throw new PermissionDenied("Authentication required to perform this action.");
  }

  // SUPER_ADMIN, FAMILY_ADMIN, BRANCH_ADMIN, HISTORIAN can manage genealogy/relationships
  const allowed = [ROLES.SUPER_ADMIN, ROLES.FAMILY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HISTORIAN];
  for (const role of allowed) {
    if (hasRole(user, role)) {
      return user;
    }
  }

  throw new PermissionDenied("You do not have permission to manage genealogy/relationships.");
}

/**
 * Validates a prospective relationship against business and integrity rules.
 *
 * @param {object} relData - Relationship details.
 * @param {boolean} isUpdate - True if updating existing.
 * @param {string} excludeId - ID to exclude from duplicate detection (if updating).
 */
export async function validateRelationshipWrite(relData, isUpdate = false, excludeId = null) {
  // 1. Basic relationship validation
  const valResult = validateRelationshipValidator(relData);
  if (!valResult.isValid) {
    throw new ValidationError(`Relationship validation failed: ${valResult.errors.join("; ")}`);
  }

  const { personA, personB, relationshipType } = relData;

  // Retrieve all existing relationships
  const existingRels = await relationshipRepository.findAll();
  const otherRels = excludeId ? existingRels.filter(r => r.relationshipId !== excludeId) : existingRels;

  // 2. Circular ancestry detection
  const pc = getParentChild(relData);
  if (pc) {
    const hasCycle = detectCircularAncestry(pc.child, pc.parent, otherRels);
    if (hasCycle) {
      throw new CircularRelationship(`Circular relationship: Placing [${pc.parent}] as a parent of [${pc.child}] creates a circular ancestry loop.`);
    }
  }

  // 3. Duplicate relationship detection
  const isSymmetric = ["SPOUSE", "FORMER_SPOUSE", "HALF_SIBLING", "TWIN"].includes(relationshipType);
  const dupRel = otherRels.find(r => {
    if (r.relationshipType !== relationshipType) return false;
    if (isSymmetric) {
      return (r.personA === personA && r.personB === personB) || (r.personA === personB && r.personB === personA);
    } else {
      return r.personA === personA && r.personB === personB;
    }
  });
  if (dupRel) {
    throw new DuplicateRecord(`A duplicate relationship of type [${relationshipType}] already exists between these members.`);
  }

  // 4. Duplicate spouse detection
  if (relationshipType === "SPOUSE") {
    const activeSpouse = otherRels.find(r => {
      return r.relationshipType === "SPOUSE" && (
        (r.personA === personA && r.personB === personB) ||
        (r.personA === personB && r.personB === personA)
      );
    });
    if (activeSpouse) {
      throw new DuplicateRecord("An active spouse relationship already exists between these members.");
    }
  }

  // 5. Duplicate parent detection (Maximum of 1 biological father and 1 biological mother per child)
  if (pc && ["BIOLOGICAL_FATHER", "BIOLOGICAL_MOTHER"].includes(relationshipType)) {
    const activeParent = otherRels.find(r => {
      const otherPc = getParentChild(r);
      return otherPc && otherPc.child === pc.child && r.relationshipType === relationshipType;
    });
    if (activeParent) {
      throw new RelationshipConflict(`Child already has a biological parent of type [${relationshipType}].`);
    }
  }
}

/**
 * Creates a relationship with full validations.
 *
 * @param {object} relData - Relationship data.
 * @returns {Promise<string>} Relationship ID.
 */
async function createRelationshipInternal(relData) {
  enforcePermission();
  await validateRelationshipWrite(relData);

  try {
    const id = await relationshipRepository.create(relData);
    publish("relationshipCreated", { relationshipId: id, ...relData });
    return id;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new DatabaseFailure(`Failed to create relationship: ${error}`);
  }
}

/**
 * Connects a father to a child.
 *
 * @param {string} childId
 * @param {string} fatherId
 * @param {object} details
 * @returns {Promise<string>} Relationship ID.
 */
export async function addFather(childId, fatherId, details = {}) {
  const relData = {
    personA: fatherId,
    personB: childId,
    relationshipType: RELATIONSHIP_TYPES.BIOLOGICAL_FATHER,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects a mother to a child.
 *
 * @param {string} childId
 * @param {string} motherId
 * @param {object} details
 * @returns {Promise<string>} Relationship ID.
 */
export async function addMother(childId, motherId, details = {}) {
  const relData = {
    personA: motherId,
    personB: childId,
    relationshipType: RELATIONSHIP_TYPES.BIOLOGICAL_MOTHER,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects a child to a parent.
 *
 * @param {string} parentId
 * @param {string} childId
 * @param {object} details
 * @returns {Promise<string>} Relationship ID.
 */
export async function addChild(parentId, childId, details = {}) {
  // Determine if parent is Male or Female to set correct relationshipType
  const parent = await familyRepository.findById(parentId);
  const type = (parent && parent.gender === "Female") ? RELATIONSHIP_TYPES.BIOLOGICAL_MOTHER : RELATIONSHIP_TYPES.BIOLOGICAL_FATHER;

  const relData = {
    personA: parentId,
    personB: childId,
    relationshipType: type,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects a sibling to a person.
 *
 * @param {string} personA
 * @param {string} personB
 * @param {object} details
 * @returns {Promise<string>} Relationship ID.
 */
export async function addSibling(personA, personB, details = {}) {
  const relData = {
    personA,
    personB,
    relationshipType: details.relationshipType || RELATIONSHIP_TYPES.HALF_SIBLING,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects spouses. If either already has active spouses, manages transition with consistent state.
 * Employs a Firestore transaction if multiple documents are modified.
 *
 * @param {string} personA
 * @param {string} personB
 * @param {object} details
 * @returns {Promise<string>} Relationship ID.
 */
export async function addSpouse(personA, personB, details = {}) {
  enforcePermission();

  const relData = {
    personA,
    personB,
    relationshipType: RELATIONSHIP_TYPES.SPOUSE,
    status: "Current",
    ...details
  };

  await validateRelationshipWrite(relData);

  // Find existing active SPOUSE relationships of either person to mark as Past if sequential transition is desired
  const existingRels = await relationshipRepository.findAll();
  const pastSpouseRels = existingRels.filter(r => {
    return r.relationshipType === "SPOUSE" && r.status === "Current" && (
      r.personA === personA || r.personB === personA ||
      r.personA === personB || r.personB === personB
    );
  });

  const relationshipId = `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const finalData = {
    ...relData,
    relationshipId,
    createdBy: getCurrentUser() ? getCurrentUser().uid : "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    // Transaction Mode if Firestore active and we have previous spouses to transition
    if (db && pastSpouseRels.length > 0) {
      console.log(`[Relationship Service] Initiating Firestore Transaction for spouse transition...`);
      await runTransaction(db, async (transaction) => {
        // Transition past active spouses to FORMER_SPOUSE
        for (const rel of pastSpouseRels) {
          const relRef = doc(db, "relationships", rel.relationshipId);
          transaction.update(relRef, {
            status: "Past",
            relationshipType: RELATIONSHIP_TYPES.FORMER_SPOUSE,
            updatedAt: new Date().toISOString()
          });
        }
        // Write the new spouse document
        const newRelRef = doc(db, "relationships", relationshipId);
        transaction.set(newRelRef, finalData);
      });

      // Mirror the state updates to trigger events and caches
      for (const rel of pastSpouseRels) {
        publish("relationshipUpdated", {
          relationshipId: rel.relationshipId,
          status: "Past",
          relationshipType: RELATIONSHIP_TYPES.FORMER_SPOUSE
        });
      }
      publish("relationshipCreated", finalData);
      return relationshipId;
    }
  } catch (err) {
    throw new DatabaseFailure(`Failed to perform transaction for spouse addition: ${err}`);
  }

  // Simulation/Local or No-Conflict Fallback
  for (const rel of pastSpouseRels) {
    await relationshipRepository.update(rel.relationshipId, {
      status: "Past",
      relationshipType: RELATIONSHIP_TYPES.FORMER_SPOUSE
    });
    publish("relationshipUpdated", {
      relationshipId: rel.relationshipId,
      status: "Past",
      relationshipType: RELATIONSHIP_TYPES.FORMER_SPOUSE
    });
  }

  const newId = await relationshipRepository.create(finalData);
  publish("relationshipCreated", { relationshipId: newId, ...finalData });
  return newId;
}

/**
 * Removes active spouse connection between two people.
 *
 * @param {string} personA
 * @param {string} personB
 * @returns {Promise<boolean>}
 */
export async function removeSpouse(personA, personB) {
  enforcePermission();

  const existingRels = await relationshipRepository.findAll();
  const match = existingRels.find(r => {
    return (r.relationshipType === "SPOUSE" || r.relationshipType === "FORMER_SPOUSE") && (
      (r.personA === personA && r.personB === personB) ||
      (r.personA === personB && r.personB === personA)
    );
  });

  if (!match) {
    return false;
  }

  return await removeRelationship(match.relationshipId);
}

/**
 * Connects former spouses.
 *
 * @param {string} personA
 * @param {string} personB
 * @param {object} details
 * @returns {Promise<string>}
 */
export async function addFormerSpouse(personA, personB, details = {}) {
  const relData = {
    personA,
    personB,
    relationshipType: RELATIONSHIP_TYPES.FORMER_SPOUSE,
    status: "Past",
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects an adoptive parent.
 *
 * @param {string} childId
 * @param {string} parentId
 * @param {object} details
 * @returns {Promise<string>}
 */
export async function addAdoptiveParent(childId, parentId, details = {}) {
  const relData = {
    personA: parentId,
    personB: childId,
    relationshipType: RELATIONSHIP_TYPES.ADOPTIVE_PARENT,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects a step-parent.
 *
 * @param {string} childId
 * @param {string} parentId
 * @param {object} details
 * @returns {Promise<string>}
 */
export async function addStepParent(childId, parentId, details = {}) {
  const relData = {
    personA: parentId,
    personB: childId,
    relationshipType: RELATIONSHIP_TYPES.STEP_PARENT,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Connects a guardian.
 *
 * @param {string} childId
 * @param {string} guardianId
 * @param {object} details
 * @returns {Promise<string>}
 */
export async function addGuardian(childId, guardianId, details = {}) {
  const relData = {
    personA: guardianId,
    personB: childId,
    relationshipType: RELATIONSHIP_TYPES.GUARDIAN,
    ...details
  };
  return await createRelationshipInternal(relData);
}

/**
 * Removes an existing relationship.
 *
 * @param {string} id - Relationship ID.
 * @returns {Promise<boolean>}
 */
export async function removeRelationship(id) {
  enforcePermission();

  const current = await relationshipRepository.findById(id);
  if (!current) {
    return false;
  }

  try {
    const success = await relationshipRepository.deleteRelationship(id);
    if (success) {
      publish("relationshipDeleted", { relationshipId: id });
    }
    return success;
  } catch (error) {
    throw new DatabaseFailure(`Failed to delete relationship: ${error}`);
  }
}

/**
 * Updates details of an existing relationship.
 *
 * @param {string} id - Relationship ID.
 * @param {object} details - Update key-values.
 * @returns {Promise<boolean>}
 */
export async function updateRelationship(id, details) {
  enforcePermission();

  const current = await relationshipRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Relationship with ID [${id}] not found.`);
  }

  const merged = { ...current, ...details };
  await validateRelationshipWrite(merged, true, id);

  try {
    const success = await relationshipRepository.update(id, details);
    if (success) {
      publish("relationshipUpdated", { relationshipId: id, ...details });
    }
    return success;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new DatabaseFailure(`Failed to update relationship: ${error}`);
  }
}
