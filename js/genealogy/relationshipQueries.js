/**
 * Relationship Queries Module
 *
 * Provides highly optimized, reusable query methods for filtering and retrieving
 * sub-sections of the family graph.
 *
 * ALGORITHMIC COMPLEXITY:
 * - Line queries (Maternal/Paternal): O(G) where G is the number of generations.
 * - Bloodline and general ancestor/descendant queries: O(V + E).
 * - Filter queries (Military, Branch, Generation): O(V) via single-scan iterations.
 */

import { getAncestors, getDescendants, getGenerationNumber } from "./lineage.js";

/**
 * Returns the entire bloodline of a person.
 * Bloodline includes the person, all of their ancestors, and all of their descendants.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Array of member objects in the bloodline.
 */
export function getEntireBloodline(graph, personId) {
  const member = graph.getMember(personId);
  if (!member) return [];

  const ancestors = getAncestors(graph, personId);
  const descendants = getDescendants(graph, personId);

  const seen = new Set([personId]);
  const bloodline = [member];

  for (const a of ancestors) {
    if (!seen.has(a.memberId)) {
      seen.add(a.memberId);
      bloodline.push(a);
    }
  }

  for (const d of descendants) {
    if (!seen.has(d.memberId)) {
      seen.add(d.memberId);
      bloodline.push(d);
    }
  }

  return bloodline;
}

/**
 * Traces the direct maternal line (Mother, Mother's Mother, etc. recursively).
 * Only follows BIOLOGICAL_MOTHER types.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Maternal line ancestors.
 */
export function getMaternalLine(graph, personId) {
  const line = [];
  let currentId = personId;
  const visited = new Set([personId]);

  while (currentId) {
    const parents = graph.parentsMap.get(currentId) || [];
    const motherRel = parents.find(p => p.type === "BIOLOGICAL_MOTHER");

    if (motherRel && motherRel.parentId && !visited.has(motherRel.parentId)) {
      const mother = graph.getMember(motherRel.parentId);
      if (mother) {
        line.push(mother);
        currentId = motherRel.parentId;
        visited.add(currentId);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return line;
}

/**
 * Traces the direct paternal line (Father, Father's Father, etc. recursively).
 * Only follows BIOLOGICAL_FATHER types.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Paternal line ancestors.
 */
export function getPaternalLine(graph, personId) {
  const line = [];
  let currentId = personId;
  const visited = new Set([personId]);

  while (currentId) {
    const parents = graph.parentsMap.get(currentId) || [];
    const fatherRel = parents.find(p => p.type === "BIOLOGICAL_FATHER");

    if (fatherRel && fatherRel.parentId && !visited.has(fatherRel.parentId)) {
      const father = graph.getMember(fatherRel.parentId);
      if (father) {
        line.push(father);
        currentId = fatherRel.parentId;
        visited.add(currentId);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return line;
}

/**
 * Returns all living descendants of a given person.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Living descendant member objects.
 */
export function getLivingDescendants(graph, personId) {
  const allDesc = getDescendants(graph, personId);
  return allDesc.filter(d => d.living === true && !d.deathDate);
}

/**
 * Returns all living ancestors of a given person.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Living ancestor member objects.
 */
export function getLivingAncestors(graph, personId) {
  const allAnc = getAncestors(graph, personId);
  return allAnc.filter(a => a.living === true && !a.deathDate);
}

/**
 * Returns all descendants of a given person.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Descendant member objects.
 */
export function getAllDescendants(graph, personId) {
  return getDescendants(graph, personId);
}

/**
 * Returns all ancestors of a given person.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Ancestor member objects.
 */
export function getAllAncestors(graph, personId) {
  return getAncestors(graph, personId);
}

/**
 * Returns all family members belonging to a specific branch.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} branchId - The branch ID.
 * @returns {object[]} Branch members.
 */
export function getBranchMembers(graph, branchId) {
  const results = [];
  for (const m of graph.members.values()) {
    if (m.branchId === branchId) {
      results.push(m);
    }
  }
  return results;
}

/**
 * Returns all family members belonging to a specific generation number.
 * Calculates generation numbers dynamically on-the-fly.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {number} generationNum - The target generation number.
 * @returns {object[]} Generation members.
 */
export function getGenerationMembers(graph, generationNum) {
  const results = [];
  for (const m of graph.members.values()) {
    if (getGenerationNumber(graph, m.memberId) === generationNum) {
      results.push(m);
    }
  }
  return results;
}

/**
 * Returns all family members who have served in the military.
 * Checks for non-empty string in 'militaryService' field.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @returns {object[]} Military members.
 */
export function getMilitaryMembers(graph) {
  const results = [];
  for (const m of graph.members.values()) {
    if (m.militaryService && typeof m.militaryService === "string" && m.militaryService.trim() !== "") {
      results.push(m);
    }
  }
  return results;
}
