/**
 * CircuitBreakerConfig Module
 * Configuration profiles and validation
 */

import { RecoveryStrategies } from './RecoveryStrategy.js';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  threshold: 5,
  timeout: 60000,
  windowSize: 100,
  recoveryStrategy: 'timeout',
};

/**
 * Pre-defined configuration profiles
 */
export const ConfigProfiles = {
  /**
   * Conservative profile - Slower to open, longer recovery
   */
  CONSERVATIVE: {
    threshold: 10,
    timeout: 120000, // 2 minutes
    windowSize: 200,
    recoveryStrategy: 'conservative',
    description: 'Conservative - Higher threshold, longer recovery',
  },

  /**
   * Standard profile - Balanced approach
   */
  STANDARD: {
    threshold: 5,
    timeout: 60000, // 1 minute
    windowSize: 100,
    recoveryStrategy: 'timeout',
    description: 'Standard - Balanced threshold and recovery',
  },

  /**
   * Aggressive profile - Quick to open, fast recovery
   */
  AGGRESSIVE: {
    threshold: 3,
    timeout: 30000, // 30 seconds
    windowSize: 50,
    recoveryStrategy: 'adaptive',
    description: 'Aggressive - Low threshold, fast recovery',
  },

  /**
   * Development profile - Very permissive
   */
  DEVELOPMENT: {
    threshold: 10,
    timeout: 5000, // 5 seconds
    windowSize: 50,
    recoveryStrategy: 'fast',
    description: 'Development - Quick recovery for testing',
  },

  /**
   * Production profile - Robust and safe
   */
  PRODUCTION: {
    threshold: 7,
    timeout: 90000, // 1.5 minutes
    windowSize: 150,
    recoveryStrategy: 'adaptive',
    description: 'Production - Robust with adaptive recovery',
  },

  /**
   * Health-based profile - Uses system health metrics
   */
  HEALTH_BASED: {
    threshold: 5,
    timeout: 60000,
    windowSize: 100,
    recoveryStrategy: 'health-based',
    description: 'Health-based - Recovery based on system health',
  },
};

/**
 * CircuitBreakerConfig class
 * Manages and validates circuit breaker configuration
 */
export class CircuitBreakerConfig {
  /**
   * Create config from profile or custom settings
   * @param {string|Object} config - Profile name or custom config
   * @returns {Object} - Validated configuration
   */
  static create(config = 'standard') {
    // If string, load profile
    if (typeof config === 'string') {
      const profileName = config.toUpperCase();
      if (!ConfigProfiles[profileName]) {
        throw new Error(`Unknown config profile: ${config}`);
      }
      return { ...ConfigProfiles[profileName] };
    }

    // If object, merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @throws {Error} - If configuration is invalid
   */
  static validate(config) {
    if (typeof config.threshold !== 'number' || config.threshold < 1) {
      throw new Error('threshold must be a positive number');
    }

    if (typeof config.timeout !== 'number' || config.timeout < 1000) {
      throw new Error('timeout must be at least 1000ms');
    }

    if (config.windowSize && (typeof config.windowSize !== 'number' || config.windowSize < 1)) {
      throw new Error('windowSize must be a positive number');
    }

    if (config.recoveryStrategy && typeof config.recoveryStrategy !== 'string') {
      throw new Error('recoveryStrategy must be a string');
    }
  }

  /**
   * Get recovery strategy instance
   * @param {string|Object} strategy - Strategy name or instance
   * @param {Object} config - Strategy configuration
   * @returns {Object} - Recovery strategy instance
   */
  static getRecoveryStrategy(strategy, config = {}) {
    // If already an instance, return it
    if (strategy && typeof strategy === 'object' && strategy.calculateTimeout) {
      return strategy;
    }

    // If string, create from pre-defined strategies
    const strategyName = (strategy || 'timeout').toUpperCase().replace(/-/g, '_');

    if (!RecoveryStrategies[strategyName]) {
      throw new Error(`Unknown recovery strategy: ${strategy}`);
    }

    return RecoveryStrategies[strategyName](config);
  }

  /**
   * List all available profiles
   * @returns {Array} - Array of profile names and descriptions
   */
  static listProfiles() {
    return Object.entries(ConfigProfiles).map(([name, config]) => ({
      name,
      description: config.description,
      config,
    }));
  }

  /**
   * Get profile by name
   * @param {string} name - Profile name
   * @returns {Object} - Profile configuration
   */
  static getProfile(name) {
    const profileName = name.toUpperCase();
    if (!ConfigProfiles[profileName]) {
      throw new Error(`Unknown profile: ${name}`);
    }
    return { ...ConfigProfiles[profileName] };
  }
}
