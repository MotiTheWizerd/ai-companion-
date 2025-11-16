/**
 * CircuitBreakerEvents Module
 * Event constants and emitter functionality
 */

/**
 * Circuit breaker event names
 */
export const CIRCUIT_EVENTS = {
  STATE_CHANGE: 'state:change',
  OPENED: 'circuit:opened',
  CLOSED: 'circuit:closed',
  HALF_OPENED: 'circuit:half-opened',
  SUCCESS_RECORDED: 'success:recorded',
  FAILURE_RECORDED: 'failure:recorded',
  THRESHOLD_REACHED: 'threshold:reached',
  RESET: 'circuit:reset',
};

/**
 * Simple event emitter for circuit breaker
 */
export class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
  }
}
