/**
 * RecoveryStrategy Module
 * Pluggable recovery strategies for circuit breaker
 */

/**
 * Base recovery strategy
 */
export class RecoveryStrategy {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Calculate recovery timeout
   * @param {Object} context - Circuit breaker context
   * @returns {number} - Timeout in milliseconds
   */
  calculateTimeout(context) {
    throw new Error('calculateTimeout must be implemented by subclass');
  }

  /**
   * Check if should attempt recovery
   * @param {Object} context - Circuit breaker context
   * @returns {boolean}
   */
  shouldAttemptRecovery(context) {
    return true;
  }
}

/**
 * Timeout Recovery Strategy
 * Fixed timeout-based recovery (original behavior)
 */
export class TimeoutRecoveryStrategy extends RecoveryStrategy {
  constructor(config = {}) {
    super(config);
    this.timeout = config.timeout || 60000; // 60 seconds
  }

  calculateTimeout(context) {
    return this.timeout;
  }
}

/**
 * Adaptive Recovery Strategy
 * Adjusts timeout based on failure rate and history
 */
export class AdaptiveRecoveryStrategy extends RecoveryStrategy {
  constructor(config = {}) {
    super(config);
    this.baseTimeout = config.baseTimeout || 60000;
    this.minTimeout = config.minTimeout || 10000; // 10 seconds
    this.maxTimeout = config.maxTimeout || 300000; // 5 minutes
    this.backoffMultiplier = config.backoffMultiplier || 2;
  }

  calculateTimeout(context) {
    const { failures, consecutiveOpens = 0 } = context;

    // Exponential backoff based on consecutive circuit opens
    const backoffTimeout = this.baseTimeout * Math.pow(this.backoffMultiplier, consecutiveOpens);

    // Cap between min and max
    return Math.min(Math.max(backoffTimeout, this.minTimeout), this.maxTimeout);
  }

  shouldAttemptRecovery(context) {
    const { metrics } = context;

    // Don't attempt recovery if failure rate is still very high
    if (metrics && metrics.getFailureRate(10) > 0.9) {
      return false;
    }

    return true;
  }
}

/**
 * Health-Based Recovery Strategy
 * Recovery based on overall system health
 */
export class HealthBasedRecoveryStrategy extends RecoveryStrategy {
  constructor(config = {}) {
    super(config);
    this.baseTimeout = config.baseTimeout || 60000;
    this.healthThreshold = config.healthThreshold || 50; // 50% health to attempt recovery
  }

  calculateTimeout(context) {
    const { metrics } = context;

    if (!metrics) return this.baseTimeout;

    const healthPercentage = metrics.getHealthPercentage();

    // Better health = shorter timeout
    const healthFactor = 1 - (healthPercentage / 100);
    const adjustedTimeout = this.baseTimeout * (1 + healthFactor);

    return Math.round(adjustedTimeout);
  }

  shouldAttemptRecovery(context) {
    const { metrics } = context;

    if (!metrics) return true;

    // Only attempt recovery if health is above threshold
    return metrics.getHealthPercentage() >= this.healthThreshold;
  }
}

/**
 * Progressive Recovery Strategy
 * Gradually increases success requirements
 */
export class ProgressiveRecoveryStrategy extends RecoveryStrategy {
  constructor(config = {}) {
    super(config);
    this.baseTimeout = config.baseTimeout || 60000;
    this.requiredSuccesses = config.requiredSuccesses || 3;
    this.successesBeforeRecovery = 0;
  }

  calculateTimeout(context) {
    return this.baseTimeout;
  }

  shouldAttemptRecovery(context) {
    const { metrics } = context;

    if (!metrics) return true;

    // Require multiple consecutive successes
    this.successesBeforeRecovery = metrics.consecutiveSuccesses || 0;

    return this.successesBeforeRecovery >= this.requiredSuccesses;
  }

  reset() {
    this.successesBeforeRecovery = 0;
  }
}

/**
 * Pre-defined recovery strategy configurations
 */
export const RecoveryStrategies = {
  /**
   * Standard timeout-based recovery
   */
  TIMEOUT: (config = {}) => new TimeoutRecoveryStrategy({
    timeout: 60000,
    ...config,
  }),

  /**
   * Adaptive recovery with exponential backoff
   */
  ADAPTIVE: (config = {}) => new AdaptiveRecoveryStrategy({
    baseTimeout: 60000,
    minTimeout: 10000,
    maxTimeout: 300000,
    backoffMultiplier: 2,
    ...config,
  }),

  /**
   * Health-based recovery
   */
  HEALTH_BASED: (config = {}) => new HealthBasedRecoveryStrategy({
    baseTimeout: 60000,
    healthThreshold: 50,
    ...config,
  }),

  /**
   * Progressive recovery requiring multiple successes
   */
  PROGRESSIVE: (config = {}) => new ProgressiveRecoveryStrategy({
    baseTimeout: 60000,
    requiredSuccesses: 3,
    ...config,
  }),

  /**
   * Fast recovery for development
   */
  FAST: (config = {}) => new TimeoutRecoveryStrategy({
    timeout: 5000,
    ...config,
  }),

  /**
   * Conservative recovery for production
   */
  CONSERVATIVE: (config = {}) => new AdaptiveRecoveryStrategy({
    baseTimeout: 120000,
    minTimeout: 60000,
    maxTimeout: 600000,
    backoffMultiplier: 3,
    ...config,
  }),
};
