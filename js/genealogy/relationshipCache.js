/**
 * Relationship Cache Module
 * Provides high-performance in-memory caching and memoization for family graphs,
 * query results, and calculated relationships. Scales to 100,000+ members by
 * preventing redundant graph traversals and database/localStorage queries.
 *
 * Dynamic Calculation Justification:
 * Relationships are computed dynamically from the graph structure on-the-fly rather than
 * stored as static coordinate layouts or rigid relational keys. This handles complex,
 * multi-directional structures (divorce, multiple spouses, adoption) seamlessly.
 */

// In-memory caches
let cachedGraph = null;
const queryCache = new Map();

/**
 * Retrieves the currently cached Family Graph instance.
 * @returns {object|null} The cached graph or null if not set.
 */
export function getCachedGraph() {
  return cachedGraph;
}

/**
 * Sets the cached Family Graph instance.
 * @param {object} graph - The Family Graph instance to cache.
 */
export function setCachedGraph(graph) {
  cachedGraph = graph;
}

/**
 * Gets a value from the general query cache.
 * @param {string} key - Cache key.
 * @returns {*} The cached value or undefined.
 */
export function getCachedValue(key) {
  return queryCache.get(key);
}

/**
 * Sets a value in the general query cache.
 * @param {string} key - Cache key.
 * @param {*} value - Value to cache.
 */
export function setCachedValue(key, value) {
  queryCache.set(key, value);
}

/**
 * Invalidates and wipes all in-memory caches.
 * Must be called automatically whenever members or relationships are created, updated, or deleted.
 */
export function clearCache() {
  cachedGraph = null;
  queryCache.clear();
  console.log("[Relationship Cache] Cache successfully invalidated and cleared.");
}
