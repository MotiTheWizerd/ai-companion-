/**
 * CircuitState Module
 * Pure state machine for circuit breaker states
 */

/**
 * Circuit breaker states
 */
export const CIRCUIT_STATE = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Blocking requests
  HALF_OPEN: 'half-open', // Testing with limited requests
};

/**
 * State transition rules
 */
const TRANSITIONS = {
  [CIRCUIT_STATE.CLOSED]: {
    canTransitionTo: [CIRCUIT_STATE.OPEN],
    on: {
      THRESHOLD_REACHED: CIRCUIT_STATE.OPEN,
    },
  },
  [CIRCUIT_STATE.OPEN]: {
    canTransitionTo: [CIRCUIT_STATE.HALF_OPEN],
    on: {
      TIMEOUT_ELAPSED: CIRCUIT_STATE.HALF_OPEN,
    },
  },
  [CIRCUIT_STATE.HALF_OPEN]: {
    canTransitionTo: [CIRCUIT_STATE.CLOSED, CIRCUIT_STATE.OPEN],
    on: {
      SUCCESS: CIRCUIT_STATE.CLOSED,
      FAILURE: CIRCUIT_STATE.OPEN,
    },
  },
};

/**
 * CircuitState class
 * Manages state transitions with validation
 */
export class CircuitState {
  constructor(initialState = CIRCUIT_STATE.CLOSED) {
    this.validateState(initialState);
    this.currentState = initialState;
    this.previousState = null;
    this.transitionHistory = [];
  }

  /**
   * Validate state value
   * @param {string} state - State to validate
   * @throws {Error} - If state is invalid
   */
  validateState(state) {
    if (!Object.values(CIRCUIT_STATE).includes(state)) {
      throw new Error(`Invalid circuit state: ${state}`);
    }
  }

  /**
   * Check if transition is allowed
   * @param {string} targetState - Target state
   * @returns {boolean}
   */
  canTransition(targetState) {
    this.validateState(targetState);

    const currentTransitions = TRANSITIONS[this.currentState];
    return currentTransitions.canTransitionTo.includes(targetState);
  }

  /**
   * Transition to new state
   * @param {string} newState - New state
   * @param {string} reason - Reason for transition
   * @throws {Error} - If transition is not allowed
   */
  transition(newState, reason = '') {
    if (!this.canTransition(newState)) {
      throw new Error(
        `Invalid transition from ${this.currentState} to ${newState}`
      );
    }

    this.previousState = this.currentState;
    this.currentState = newState;

    // Record transition
    this.transitionHistory.push({
      from: this.previousState,
      to: newState,
      reason,
      timestamp: Date.now(),
    });

    // Keep only last 50 transitions
    if (this.transitionHistory.length > 50) {
      this.transitionHistory.shift();
    }
  }

  /**
   * Get current state
   * @returns {string}
   */
  getState() {
    return this.currentState;
  }

  /**
   * Get previous state
   * @returns {string|null}
   */
  getPreviousState() {
    return this.previousState;
  }

  /**
   * Check if in specific state
   * @param {string} state - State to check
   * @returns {boolean}
   */
  is(state) {
    return this.currentState === state;
  }

  /**
   * Check if circuit is closed
   * @returns {boolean}
   */
  isClosed() {
    return this.is(CIRCUIT_STATE.CLOSED);
  }

  /**
   * Check if circuit is open
   * @returns {boolean}
   */
  isOpen() {
    return this.is(CIRCUIT_STATE.OPEN);
  }

  /**
   * Check if circuit is half-open
   * @returns {boolean}
   */
  isHalfOpen() {
    return this.is(CIRCUIT_STATE.HALF_OPEN);
  }

  /**
   * Get transition history
   * @param {number} limit - Max number of transitions to return
   * @returns {Array}
   */
  getHistory(limit = 10) {
    return this.transitionHistory.slice(-limit);
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.previousState = this.currentState;
    this.currentState = CIRCUIT_STATE.CLOSED;
    this.transitionHistory = [];
  }
}
