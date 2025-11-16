/**
 * Conversation API Helper Utilities
 * Functions for managing conversations (CRUD operations)
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS } from '../../../content/core/constants.js';
import { RequestBuilder } from '../endpoints.js';

/**
 * Send a conversation to the backend
 * @param {Object} conversationData - Conversation data
 * @returns {string} - Request ID for tracking
 */
export function sendConversation(conversationData) {
  const request = RequestBuilder.createConversation(conversationData);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * Add a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} message - Message data
 * @returns {string} - Request ID
 */
export function addMessage(conversationId, message) {
  const request = RequestBuilder.addMessage(conversationId, message);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * Update a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} updates - Updates to apply
 * @returns {string} - Request ID
 */
export function updateConversation(conversationId, updates) {
  const request = RequestBuilder.updateConversation(conversationId, updates);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * Get a conversation from backend
 * @param {string} conversationId - Conversation ID
 * @returns {string} - Request ID
 */
export function getConversation(conversationId) {
  const request = RequestBuilder.getConversation(conversationId);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}

/**
 * List conversations with pagination
 * @param {Object} options - List options (page, limit, filter)
 * @returns {string} - Request ID
 */
export function listConversations(options = {}) {
  const request = RequestBuilder.listConversations(options);

  eventBus.emit(EVENTS.API_REQUEST, request);

  return request;
}
