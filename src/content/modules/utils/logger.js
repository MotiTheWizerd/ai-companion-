/**
 * Logging utility for consistent console output
 */
import { LOG_PREFIXES } from '../../core/constants.js';

/**
 * Logger class for structured logging
 */
export class Logger {
  /**
   * Log extension-level messages
   */
  static extension(message, ...args) {
    console.log(LOG_PREFIXES.EXTENSION, message, ...args);
  }

  /**
   * Log message-related events
   */
  static message(message, ...args) {
    console.log(LOG_PREFIXES.MESSAGE, message, ...args);
  }

  /**
   * Log stream-related events
   */
  static stream(message, ...args) {
    console.log(LOG_PREFIXES.STREAM, message, ...args);
  }

  /**
   * Log storage operations
   */
  static storage(message, ...args) {
    console.log(LOG_PREFIXES.STORAGE, message, ...args);
  }

  /**
   * Log API operations
   */
  static api(message, ...args) {
    console.log(LOG_PREFIXES.API, message, ...args);
  }

  /**
   * Log event bus activity
   */
  static event(message, ...args) {
    console.log(LOG_PREFIXES.EVENT, message, ...args);
  }

  /**
   * Log errors
   */
  static error(prefix, message, ...args) {
    console.error(prefix, message, ...args);
  }

  /**
   * Log warnings
   */
  static warn(prefix, message, ...args) {
    console.warn(prefix, message, ...args);
  }

  /**
   * Log conversation in formatted JSON
   */
  static conversation(conversation) {
    console.log('=== CONVERSATION JSON ===');
    console.log(JSON.stringify(conversation, null, 2));
    console.log('========================');
  }
}
