/**
 * Family Graph Module
 *
 * GRAPH MODEL & ARCHITECTURE SUMMARY:
 * Genealogies are complex, multi-directional graph structures containing nodes
 * (Family Members) and directed or undirected edges (Relationships).
 * Rather than storing static visual coordinates, layout structures, or computed
 * paths directly in Firestore, this application dynamically constructs an in-memory
 * graph on-the-fly.
 *
 * WHY DYNAMIC CALCULATION?
 * 1. Infinite Scalability: Avoids hitting database size limitations (such as Firestore's 1MB limit).
 * 2. Unparalleled Flexibility: Handles non-traditional configurations (such as multiple sequential
 *    spouses, step-relationships, single parents, and custom adoptions) without database schema lock-in.
 * 3. Separation of Concerns: The database remains a lean, highly indexable source of truth for raw
 *    entities and connections, leaving visual coordinate calculation to the rendering client.
 * 4. Synchronization: Eliminates database sync anomalies where updating a single connection would
 *    require cascading coordinate calculations across thousands of static documents.
 *
 * ALGORITHMIC COMPLEXITY:
 * - Graph Construction: O(V + E) where V is the number of active family members and E is the number
 *   of relationships. We perform a single scan over both arrays to index everything into Map lookups.
 * - Neighbor/Adjacency Lookups: O(1) average time complexity, as connections are indexed by member ID.
 * - Dynamic Traversals: O(V + E) for standard Breadth-First Search (BFS) / Depth-First Search (DFS)
 *   algorithms used in ancestry tracing and relationship routing.
 *
 * LAZY & CACHED EXECUTION:
 * To handle 100,000+ members, the graph is built lazily on the first request and stored in the
 * Relationship Cache. Write/delete repository operations automatically invalidate the cache, prompting
 * a single, efficient rebuild on the subsequent query.
 */

import * as familyRepository from "../repositories/familyRepository.js";
import * as relationshipRepository from "../repositories/relationshipRepository.js";
import { getParentChild } from "../validators/relationshipValidator.js";
import { getCachedGraph, setCachedGraph } from "./relationshipCache.js";

export class FamilyGraph {
  constructor() {
    /**
     * Map of memberId to the clean member details object.
     * @type {Map<string, object>}
     */
    this.members = new Map();

    /**
     * Map of childId to array of parent relationship elements:
     * { parentId, type, relationshipId, startDate, endDate, status }
     * @type {Map<string, Array<object>>}
     */
    this.parentsMap = new Map();

    /**
     * Map of parentId to array of child relationship elements:
     * { childId, type, relationshipId, startDate, endDate, status }
     * @type {Map<string, Array<object>>}
     */
    this.childrenMap = new Map();

    /**
     * Map of personId to array of spouse/partner relationship elements:
     * { spouseId, type, relationshipId, startDate, endDate, status }
     * @type {Map<string, Array<object>>}
     */
    this.spousesMap = new Map();

    /**
     * Map of personId to array of direct sibling relationship elements (e.g. TWIN, HALF_SIBLING):
     * { siblingId, type, relationshipId }
     * @type {Map<string, Array<object>>}
     */
    this.siblingsMap = new Map();
  }

  /**
   * Builds the graph from the repository data.
   */
  async build() {
    // 1. Fetch all active members and relationships
    const [allMembers, allRelationships] = await Promise.all([
      familyRepository.findAll(),
      relationshipRepository.findAll()
    ]);

    // 2. Index members
    for (const member of allMembers) {
      if (member && member.memberId) {
        this.members.set(member.memberId, member);
      }
    }

    // 3. Index relationships
    for (const rel of allRelationships) {
      if (!rel || !rel.personA || !rel.personB) continue;

      const { personA, personB, relationshipType, relationshipId, startDate, endDate, status } = rel;
      const type = relationshipType.trim().toUpperCase();

      // Symmetric spouse connections
      if (type === "SPOUSE" || type === "FORMER_SPOUSE") {
        this.addSpouseConnection(personA, personB, type, relationshipId, startDate, endDate, status);
        this.addSpouseConnection(personB, personA, type, relationshipId, startDate, endDate, status);
        continue;
      }

      // Symmetric sibling connections (explicit TWIN or HALF_SIBLING)
      if (type === "TWIN" || type === "HALF_SIBLING") {
        this.addSiblingConnection(personA, personB, type, relationshipId);
        this.addSiblingConnection(personB, personA, type, relationshipId);
        continue;
      }

      // Parent-child connections
      const pc = getParentChild(rel);
      if (pc) {
        this.addParentChildConnection(pc.parent, pc.child, type, relationshipId, startDate, endDate, status);
      }
    }
  }

  addSpouseConnection(pId, spouseId, type, relationshipId, startDate, endDate, status) {
    if (!this.spousesMap.has(pId)) {
      this.spousesMap.set(pId, []);
    }
    this.spousesMap.get(pId).push({ spouseId, type, relationshipId, startDate, endDate, status });
  }

  addSiblingConnection(pId, siblingId, type, relationshipId) {
    if (!this.siblingsMap.has(pId)) {
      this.siblingsMap.set(pId, []);
    }
    this.siblingsMap.get(pId).push({ siblingId, type, relationshipId });
  }

  addParentChildConnection(parentId, childId, type, relationshipId, startDate, endDate, status) {
    // Add child to parent
    if (!this.childrenMap.has(parentId)) {
      this.childrenMap.set(parentId, []);
    }
    this.childrenMap.get(parentId).push({ childId, type, relationshipId, startDate, endDate, status });

    // Add parent to child
    if (!this.parentsMap.has(childId)) {
      this.parentsMap.set(childId, []);
    }
    this.parentsMap.get(childId).push({ parentId, type, relationshipId, startDate, endDate, status });
  }

  /**
   * Retrieves a member by ID.
   * @param {string} memberId
   * @returns {object|null}
   */
  getMember(memberId) {
    return this.members.get(memberId) || null;
  }
}

/**
 * Returns the active loaded Family Graph (lazy creation & retrieval).
 * @returns {Promise<FamilyGraph>} The active family graph instance.
 */
export async function getGraphInstance() {
  let graph = getCachedGraph();
  if (!graph) {
    console.log("[Family Graph] Constructing graph lazily...");
    graph = new FamilyGraph();
    await graph.build();
    setCachedGraph(graph);
    console.log(`[Family Graph] Built successfully with ${graph.members.size} members.`);
  }
  return graph;
}
