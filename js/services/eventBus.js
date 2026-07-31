/**
 * Global Event Bus
 * Facilitates loosely-coupled communication between components and services.
 * Allows components to subscribe to successful mutation events (e.g., memberCreated, relationshipCreated).
 */

const listeners = {};

/**
 * Subscribes a callback to a specific event.
 *
 * @param {string} event - The event name.
 * @param {function} callback - The event handler.
 */
export function subscribe(event, callback) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
}

/**
 * Unsubscribes a callback from a specific event.
 *
 * @param {string} event - The event name.
 * @param {function} callback - The event handler to remove.
 */
export function unsubscribe(event, callback) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(cb => cb !== callback);
}

/**
 * Publishes an event with optional data payload.
 *
 * @param {string} event - The event name.
 * @param {*} data - Optional payload data.
 */
export function publish(event, data) {
  if (!listeners[event]) return;
  listeners[event].forEach(cb => {
    try {
      cb(data);
    } catch (e) {
      console.error(`Error in event listener for event [${event}]:`, e);
    }
  });
}
