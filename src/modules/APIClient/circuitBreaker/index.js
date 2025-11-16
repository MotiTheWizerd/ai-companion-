/**
 * CircuitBreaker Module - Public API
 * Exports all circuit breaker functionality
 */

// Main CircuitBreaker class
export { CircuitBreaker, CIRCUIT_STATE, CIRCUIT_EVENTS } from './CircuitBreaker.js';

// State machine
export { CircuitState } from './CircuitState.js';

// Metrics tracking
export { CircuitMetrics } from './CircuitMetrics.js';

// Recovery strategies
export {
  RecoveryStrategy,
  TimeoutRecoveryStrategy,
  AdaptiveRecoveryStrategy,
  HealthBasedRecoveryStrategy,
  ProgressiveRecoveryStrategy,
  RecoveryStrategies,
} from './RecoveryStrategy.js';

// Configuration
export {
  CircuitBreakerConfig,
  ConfigProfiles,
  DEFAULT_CONFIG,
} from './CircuitBreakerConfig.js';

// Events
export { EventEmitter } from './CircuitBreakerEvents.js';
