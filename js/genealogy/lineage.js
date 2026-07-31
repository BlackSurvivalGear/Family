/**
 * Lineage Module
 *
 * Handles ancestral and descendant traversals on the family graph.
 * Calculates complex, dynamic metrics such as generation numbers, depth,
 * ancestor/descendant limits, and branch paths.
 *
 * Lineage relationships exclude step-parents, foster-parents, step-children, foster-children,
 * and guardians/wards to ensure clean, un-polluted bloodlines.
 *
 * ALGORITHMIC COMPLEXITY:
 * - Traversals (Ancestors/Descendants): O(V + E) since each node/edge is visited at most once.
 * - Generation & Depth Calculations: O(V + E) with memoization to ensure linear scaling.
 */

/**
 * Returns all ancestors of a given person.
 * Traces parents, grandparents, great-grandparents recursively.
 * Excludes step-parents, foster-parents, and guardians.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Array of ancestor member objects.
 */
export function getAncestors(graph, personId) {
  const ancestors = new Map();
  const queue = [personId];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const parents = graph.parentsMap.get(currentId) || [];
    for (const p of parents) {
      if (p.type === "STEP_PARENT" || p.type === "FOSTER_PARENT" || p.type === "GUARDIAN") continue;
      const parentMember = graph.getMember(p.parentId);
      if (parentMember) {
        ancestors.set(p.parentId, parentMember);
        queue.push(p.parentId);
      }
    }
  }

  return Array.from(ancestors.values());
}

/**
 * Returns all descendants of a given person.
 * Traces children, grandchildren, great-grandchildren recursively.
 * Excludes step-children, foster-children, and wards.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {object[]} Array of descendant member objects.
 */
export function getDescendants(graph, personId) {
  const descendants = new Map();
  const queue = [personId];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = graph.childrenMap.get(currentId) || [];
    for (const c of children) {
      if (c.type === "STEP_CHILD" || c.type === "FOSTER_CHILD" || c.type === "WARD") continue;
      const childMember = graph.getMember(c.childId);
      if (childMember) {
        descendants.set(c.childId, childMember);
        queue.push(c.childId);
      }
    }
  }

  return Array.from(descendants.values());
}

/**
 * Automatically calculates the generation number of a member.
 * If the member has an explicit 'generation' property, it is prioritized.
 * Otherwise, the generation is computed dynamically:
 * - Members without parents are root ancestors (Generation 1).
 * - Other members are max(parent's generation) + 1.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {number} The calculated generation number (starts at 1).
 */
export function getGenerationNumber(graph, personId) {
  const member = graph.getMember(personId);
  if (member && typeof member.generation === "number") {
    return member.generation;
  }
  if (member && member.generationNum && typeof member.generationNum === "number") {
    return member.generationNum;
  }

  const memo = new Map();

  function calculate(id, visited = new Set()) {
    if (visited.has(id)) return 1; // Prevent cycle-lock
    if (memo.has(id)) return memo.get(id);

    // If member has explicit generation stored in db, return it
    const m = graph.getMember(id);
    if (m && typeof m.generation === "number") {
      return m.generation;
    }

    const parents = graph.parentsMap.get(id) || [];
    const validParents = parents.filter(p => p.type !== "STEP_PARENT" && p.type !== "FOSTER_PARENT" && p.type !== "GUARDIAN");
    if (validParents.length === 0) {
      memo.set(id, 1);
      return 1;
    }

    visited.add(id);
    let maxParentGen = 0;
    for (const p of validParents) {
      maxParentGen = Math.max(maxParentGen, calculate(p.parentId, visited));
    }
    visited.delete(id);

    const gen = maxParentGen + 1;
    memo.set(id, gen);
    return gen;
  }

  return calculate(personId);
}

/**
 * Calculates ancestor depth of a person.
 * Generational distance up to the furthest known ancestor (0 if no parents).
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {number} Furthest generational depth going up.
 */
export function getAncestorDepth(graph, personId) {
  const memo = new Map();

  function depth(id, visited = new Set()) {
    if (visited.has(id)) return 0;
    if (memo.has(id)) return memo.get(id);

    const parents = graph.parentsMap.get(id) || [];
    const validParents = parents.filter(p => p.type !== "STEP_PARENT" && p.type !== "FOSTER_PARENT" && p.type !== "GUARDIAN");
    if (validParents.length === 0) return 0;

    visited.add(id);
    let maxD = 0;
    for (const p of validParents) {
      maxD = Math.max(maxD, depth(p.parentId, visited));
    }
    visited.delete(id);

    const res = 1 + maxD;
    memo.set(id, res);
    return res;
  }

  return depth(personId);
}

/**
 * Calculates descendant depth of a person.
 * Generational distance down to the furthest known descendant (0 if no children).
 * Also represents generation depth.
 *
 * @param {object} graph - The FamilyGraph instance.
 * @param {string} personId - The starting person ID.
 * @returns {number} Furthest generational depth going down.
 */
export function getDescendantDepth(graph, personId) {
  const memo = new Map();

  function depth(id, visited = new Set()) {
    if (visited.has(id)) return 0;
    if (memo.has(id)) return memo.get(id);

    const children = graph.childrenMap.get(id) || [];
    const validChildren = children.filter(c => c.type !== "STEP_CHILD" && c.type !== "FOSTER_CHILD" && c.type !== "WARD");
    if (validChildren.length === 0) return 0;

    visited.add(id);
    let maxD = 0;
    for (const c of validChildren) {
      maxD = Math.max(maxD, depth(c.childId, visited));
    }
    visited.delete(id);

    const res = 1 + maxD;
    memo.set(id, res);
    return res;
  }

  return depth(personId);
}

/**
 * Generation depth is functionally identical to the descendant depth.
 */
export function getGenerationDepth(graph, personId) {
  return getDescendantDepth(graph, personId);
}
