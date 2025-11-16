/**
 * ConfigurationManager Module
 * Centralized configuration handling and service initialization
 */

import { RequestQueue } from '../services/RequestQueue.js';
import { CircuitBreaker } from '../services/CircuitBreaker.js';
import { RetryPolicy } from '../services/RetryPolicy.js';
import { RequestExecutor } from '../services/RequestExecutor.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  maxConcurrent: 5,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  autoSync: true,
};

/**
 * ConfigurationManager class
 * Manages configuration and initializes child services
 */
export class ConfigurationManager {
  /**
   * Create and initialize configuration with child services
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} - Complete configuration with initialized services
   */
  static createConfig(userConfig = {}) {
    // Merge user config with defaults
    const config = {
      ...DEFAULT_CONFIG,
      ...userConfig,
    };

    // Initialize child services with their respective configs
    config.queue = new RequestQueue(config.maxConcurrent);

    config.circuitBreaker = new CircuitBreaker({
      threshold: config.circuitBreakerThreshold,
      timeout: config.circuitBreakerTimeout,
    });

    config.retryPolicy = new RetryPolicy({
      maxAttempts: config.retryAttempts,
      baseDelay: config.retryDelay,
    });

    config.executor = new RequestExecutor({
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    return config;
  }

  /**
   * Update configuration at runtime
   * @param {Object} newConfig - New configuration values
   * @param {Object} services - Service instances to update
   */
  static updateConfig(newConfig, services) {
    const { executor, retryPolicy } = services;

    // Update executor config (baseURL, timeout)
    if (newConfig.baseURL || newConfig.timeout) {
      executor.updateConfig({
        baseURL: newConfig.baseURL,
        timeout: newConfig.timeout,
      });
    }

    // Update retry policy config
    if (newConfig.retryAttempts !== undefined || newConfig.retryDelay !== undefined) {
      retryPolicy.updateConfig({
        maxAttempts: newConfig.retryAttempts,
        baseDelay: newConfig.retryDelay,
      });
    }
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result
   */
  static validateConfig(config) {
    const errors = [];

    if (config.timeout && config.timeout <= 0) {
      errors.push('timeout must be greater than 0');
    }

    if (config.maxConcurrent && config.maxConcurrent <= 0) {
      errors.push('maxConcurrent must be greater than 0');
    }

    if (config.retryAttempts && config.retryAttempts < 0) {
      errors.push('retryAttempts must be 0 or greater');
    }

    if (config.circuitBreakerThreshold && config.circuitBreakerThreshold <= 0) {
      errors.push('circuitBreakerThreshold must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
