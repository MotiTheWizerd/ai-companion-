/**
 * API Helper Utilities
 * Central export point for all API helper functions
 */

// Import all helper functions
import {
  sendConversation,
  addMessage,
  updateConversation,
  getConversation,
  listConversations,
} from './conversationHelpers.js';

import { syncFull, syncIncremental } from './syncHelpers.js';

import { trackEvent, healthCheck } from './analyticsHelpers.js';

import { customRequest } from './customRequest.js';

import { APIPromise } from './promiseWrapper.js';

/**
 * APIHelper class
 * Provides easy-to-use methods for common API operations
 * Maintains backward compatibility with the original helpers.js
 */
export class APIHelper {
  static sendConversation = sendConversation;
  static addMessage = addMessage;
  static updateConversation = updateConversation;
  static getConversation = getConversation;
  static listConversations = listConversations;
  static syncFull = syncFull;
  static syncIncremental = syncIncremental;
  static trackEvent = trackEvent;
  static healthCheck = healthCheck;
  static customRequest = customRequest;
}

// Export everything for flexibility
export {
  // Conversation operations
  sendConversation,
  addMessage,
  updateConversation,
  getConversation,
  listConversations,
  // Sync operations
  syncFull,
  syncIncremental,
  // Analytics operations
  trackEvent,
  healthCheck,
  // Custom requests
  customRequest,
  // Promise-based API
  APIPromise,
};
