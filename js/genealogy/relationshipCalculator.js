/**
 * Relationship Calculator Module
 *
 * Contains the advanced graph classification engines.
 * Computes exact relationship paths and names using BFS shortest path
 * and ancestor-path matching.
 *
 * ALGORITHMIC COMPLEXITY:
 * - findCommonAncestor: O(V + E) since it runs BFS on parental links for both persons.
 * - findRelationship: O(V + E) because it searches for common ancestors and traverses paths.
 */

/**
 * Finds the nearest common ancestor(s) between Person A and Person B.
 * Excludes step-parents, foster-parents, and guardians to prevent bloodline pollution.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personAId - Person A ID.
 * @param {string} personBId - Person B ID.
 * @returns {object|null} { ancestor: MemberObject, distA: number, distB: number, depth: number, generationDifference: number }
 */
export function findCommonAncestor(graph, personAId, personBId) {
  if (!personAId || !personBId) return null;
  if (personAId === personBId) {
    const self = graph.getMember(personAId);
    return self ? { ancestor: self, distA: 0, distB: 0, depth: 0, generationDifference: 0 } : null;
  }

  // BFS upwards to trace all ancestors of A and their distance
  const ancestorsA = new Map();
  let queue = [{ id: personAId, dist: 0 }];
  let visited = new Set();

  while (queue.length > 0) {
    const { id, dist } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    if (!ancestorsA.has(id) || dist < ancestorsA.get(id)) {
      ancestorsA.set(id, dist);
    }

    const parents = graph.parentsMap.get(id) || [];
    for (const p of parents) {
      if (p.type === "STEP_PARENT" || p.type === "FOSTER_PARENT" || p.type === "GUARDIAN") continue;
      queue.push({ id: p.parentId, dist: dist + 1 });
    }
  }

  // BFS upwards to trace all ancestors of B and their distance
  const ancestorsB = new Map();
  queue = [{ id: personBId, dist: 0 }];
  visited = new Set();

  while (queue.length > 0) {
    const { id, dist } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    if (!ancestorsB.has(id) || dist < ancestorsB.get(id)) {
      ancestorsB.set(id, dist);
    }

    const parents = graph.parentsMap.get(id) || [];
    for (const p of parents) {
      if (p.type === "STEP_PARENT" || p.type === "FOSTER_PARENT" || p.type === "GUARDIAN") continue;
      queue.push({ id: p.parentId, dist: dist + 1 });
    }
  }

  // Intersect and find the one that minimizes distA + distB
  let bestAncestorId = null;
  let bestDistA = Infinity;
  let bestDistB = Infinity;
  let minDepth = Infinity;

  for (const aId of ancestorsA.keys()) {
    if (ancestorsB.has(aId)) {
      const dA = ancestorsA.get(aId);
      const dB = ancestorsB.get(aId);
      const totalDepth = dA + dB;

      if (totalDepth < minDepth) {
        minDepth = totalDepth;
        bestAncestorId = aId;
        bestDistA = dA;
        bestDistB = dB;
      }
    }
  }

  if (!bestAncestorId) return null;

  const ancestorMember = graph.getMember(bestAncestorId);
  if (!ancestorMember) return null;

  return {
    ancestor: ancestorMember,
    distA: bestDistA,
    distB: bestDistB,
    depth: minDepth,
    generationDifference: Math.abs(bestDistA - bestDistB)
  };
}

/**
 * Determines the exact relationship label of Person A with respect to Person B.
 * E.g. "Who is Person A to Person B?"
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personAId - Person A ID.
 * @param {string} personBId - Person B ID.
 * @returns {string} The relationship label, or "UNRELATED".
 */
export function findRelationship(graph, personAId, personBId) {
  if (!personAId || !personBId || personAId === personBId) {
    return "UNRELATED";
  }

  const memberA = graph.getMember(personAId);
  const memberB = graph.getMember(personBId);
  if (!memberA || !memberB) return "UNRELATED";

  const genderA = (memberA.gender || "Unknown").trim().toLowerCase();

  // 1. Direct Symmetric/Immediate Edges (Spouses, Siblings, Guardians, Adoptions)

  // Spouse
  const spousesA = graph.spousesMap.get(personAId) || [];
  const spouseMatch = spousesA.find(s => s.spouseId === personBId);
  if (spouseMatch) {
    if (spouseMatch.type === "FORMER_SPOUSE" || spouseMatch.status === "Past" || spouseMatch.endDate) {
      return "Former Spouse";
    }
    return "Current Spouse";
  }

  // Sibling (Explicit TWIN or HALF_SIBLING)
  const siblingsA = graph.siblingsMap.get(personAId) || [];
  const siblingMatch = siblingsA.find(s => s.siblingId === personBId);
  if (siblingMatch) {
    if (siblingMatch.type === "TWIN") {
      return genderA === "male" ? "Twin Brother" : (genderA === "female" ? "Twin Sister" : "Twin");
    }
    if (siblingMatch.type === "HALF_SIBLING") {
      return genderA === "male" ? "Half Brother" : (genderA === "female" ? "Half Sister" : "Half Sibling");
    }
  }

  // Direct Parent-Child Immediate Edges
  const parentsB = graph.parentsMap.get(personBId) || [];
  const parentMatch = parentsB.find(p => p.parentId === personAId);
  if (parentMatch) {
    const t = parentMatch.type;
    if (t === "ADOPTIVE_PARENT") return "Adoptive Parent";
    if (t === "FOSTER_PARENT") return "Foster Parent";
    if (t === "STEP_PARENT") {
      return genderA === "male" ? "Stepfather" : (genderA === "female" ? "Stepmother" : "Step Parent");
    }
    if (t === "GUARDIAN") return "Guardian";

    // Biological or standard
    return genderA === "male" ? "Father" : (genderA === "female" ? "Mother" : "Parent");
  }

  const parentsA = graph.parentsMap.get(personAId) || [];
  const childMatch = parentsA.find(p => p.parentId === personBId);
  if (childMatch) {
    const t = childMatch.type;
    if (t === "ADOPTED_CHILD" || t === "ADOPTIVE_PARENT") return "Adopted Child";
    if (t === "FOSTER_CHILD" || t === "FOSTER_PARENT") return "Foster Child";
    if (t === "STEP_CHILD" || t === "STEP_PARENT") {
      return genderA === "male" ? "Stepson" : (genderA === "female" ? "Stepdaughter" : "Step Child");
    }
    if (t === "WARD" || t === "GUARDIAN") return "Ward";

    // Biological or standard
    return genderA === "male" ? "Son" : (genderA === "female" ? "Daughter" : "Child");
  }

  // 2. Ancestor / Sibling / Cousin Tree Calculations
  const ncaRes = findCommonAncestor(graph, personAId, personBId);

  if (ncaRes) {
    const { distA, distB } = ncaRes;

    // Direct Ancestor
    if (distA === 0 && distB > 0) {
      if (distB === 1) return genderA === "male" ? "Father" : (genderA === "female" ? "Mother" : "Parent");
      if (distB === 2) return genderA === "male" ? "Grandfather" : (genderA === "female" ? "Grandmother" : "Grandparent");
      if (distB === 3) return genderA === "male" ? "Great Grandfather" : (genderA === "female" ? "Great Grandmother" : "Great Grandparent");
      if (distB > 3) {
        const prefix = "Great ".repeat(distB - 2);
        return genderA === "male" ? `${prefix}Grandfather` : (genderA === "female" ? `${prefix}Grandmother` : `${prefix}Grandparent`);
      }
    }

    // Direct Descendant
    if (distB === 0 && distA > 0) {
      if (distA === 1) return genderA === "male" ? "Son" : (genderA === "female" ? "Daughter" : "Child");
      if (distA === 2) return genderA === "male" ? "Grandson" : (genderA === "female" ? "Granddaughter" : "Grandchild");
      if (distA === 3) return genderA === "male" ? "Great Grandson" : (genderA === "female" ? "Great Granddaughter" : "Great Grandchild");
      if (distA > 3) {
        const prefix = "Great ".repeat(distA - 2);
        return genderA === "male" ? `${prefix}Grandson` : (genderA === "female" ? `${prefix}Granddaughter` : `${prefix}Grandchild`);
      }
    }

    // Siblings (distA = 1, distB = 1)
    if (distA === 1 && distB === 1) {
      // Check if they share BOTH biological parents
      const biologicalParentsA = parentsA.filter(p => p.type === "BIOLOGICAL_FATHER" || p.type === "BIOLOGICAL_MOTHER").map(p => p.parentId);
      const biologicalParentsB = parentsB.filter(p => p.type === "BIOLOGICAL_FATHER" || p.type === "BIOLOGICAL_MOTHER").map(p => p.parentId);
      const sharedBiological = biologicalParentsA.filter(id => biologicalParentsB.includes(id));

      if (sharedBiological.length >= 2) {
        return genderA === "male" ? "Brother" : (genderA === "female" ? "Sister" : "Sibling");
      } else {
        return genderA === "male" ? "Half Brother" : (genderA === "female" ? "Half Sister" : "Half Sibling");
      }
    }

    // Uncles / Aunts (distA = 1, distB = 1) or Nephews / Nieces (distA > 1, distB = 1)
    if (distA === 1 && distB === 2) {
      return genderA === "male" ? "Uncle" : (genderA === "female" ? "Aunt" : "Aunt/Uncle");
    }
    if (distA === 2 && distB === 1) {
      return genderA === "male" ? "Nephew" : (genderA === "female" ? "Niece" : "Nibling");
    }

    if (distA === 1 && distB === 3) {
      return genderA === "male" ? "Great Uncle" : (genderA === "female" ? "Great Aunt" : "Great Aunt/Uncle");
    }
    if (distA === 3 && distB === 1) {
      return genderA === "male" ? "Great Nephew" : (genderA === "female" ? "Great Niece" : "Great Nibling");
    }

    if (distA === 1 && distB > 3) {
      const prefix = "Great ".repeat(distB - 2);
      return genderA === "male" ? `${prefix}Uncle` : (genderA === "female" ? `${prefix}Aunt` : `${prefix}Aunt/Uncle`);
    }
    if (distA > 3 && distB === 1) {
      const prefix = "Great ".repeat(distA - 2);
      return genderA === "male" ? `${prefix}Nephew` : (genderA === "female" ? `${prefix}Niece` : `${prefix}Nibling`);
    }

    // Cousins (distA > 1, distB > 1)
    if (distA > 1 && distB > 1) {
      const minDistance = Math.min(distA, distB);
      const diff = Math.abs(distA - distB);

      let cousinBase = "";
      if (minDistance === 2) cousinBase = "First Cousin";
      else if (minDistance === 3) cousinBase = "Second Cousin";
      else if (minDistance === 4) cousinBase = "Third Cousin";
      else {
        const ordinal = getOrdinalWord(minDistance - 1);
        cousinBase = `${ordinal} Cousin`;
      }

      if (diff === 0) {
        return cousinBase;
      } else {
        const removalWord = getRemovalWord(diff);
        return `${cousinBase} ${removalWord}`;
      }
    }
  }

  // 3. Step-family fallback when no biological common ancestor is found
  // E.g., Step-siblings (parents are married)
  const parentsANonBio = parentsA.map(p => p.parentId);
  const parentsBNonBio = parentsB.map(p => p.parentId);

  for (const pA of parentsANonBio) {
    const spousesPA = graph.spousesMap.get(pA) || [];
    for (const pB of parentsBNonBio) {
      const isMarried = spousesPA.some(s => s.spouseId === pB);
      if (isMarried) {
        return genderA === "male" ? "Step Brother" : (genderA === "female" ? "Step Sister" : "Step Sibling");
      }
    }
  }

  return "UNRELATED";
}

function getOrdinalWord(num) {
  const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
  if (num >= 1 && num <= ordinals.length) {
    return ordinals[num - 1];
  }
  return `${num}th`;
}

function getRemovalWord(num) {
  if (num === 1) return "once removed";
  if (num === 2) return "twice removed";
  if (num === 3) return "thrice removed";
  return `${num} times removed`;
}
