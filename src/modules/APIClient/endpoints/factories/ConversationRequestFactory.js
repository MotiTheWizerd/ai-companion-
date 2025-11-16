/**
 * Conversation Request Factory
 * Builds requests for conversation endpoints
 */

import { ENDPOINTS } from '../EndpointRegistry.js';
import { BaseRequestFactory } from './BaseRequestFactory.js';

/**
 * ConversationRequestFactory class
 * Handles conversation CRUD operations
 */
export class ConversationRequestFactory extends BaseRequestFactory {
  /**
   * Create conversation request
   * @param {Object} conversationData - Conversation data
   * @returns {Object} - Request object
   */
  static create(conversationData) {
    return this.buildRequest(ENDPOINTS.CONVERSATIONS.CREATE, {
      data: {
        conversationId: conversationData.conversationId,
        title: conversationData.title || 'New Conversation',
        messages: conversationData.messages || [],
        ...this.addMetadata({}, conversationData.metadata),
      },
    });
  }

  /**
   * Get conversation request
   * @param {string} conversationId - Conversation ID
   * @returns {Object} - Request object
   */
  static get(conversationId) {
    return this.buildRequest(ENDPOINTS.CONVERSATIONS.GET, {
      pathParams: { id: conversationId },
    });
  }

  /**
   * Update conversation request
   * @param {string} conversationId - Conversation ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} - Request object
   */
  static update(conversationId, updates) {
    return this.buildRequest(ENDPOINTS.CONVERSATIONS.UPDATE, {
      pathParams: { id: conversationId },
      data: this.addTimestamp({ ...updates, updatedAt: new Date().toISOString() }),
    });
  }

  /**
   * List conversations request
   * @param {Object} options - List options (page, limit, filter)
   * @returns {Object} - Request object
   */
  static list(options = {}) {
    const { page = 1, limit = 50, filter } = options;

    return this.buildRequest(ENDPOINTS.CONVERSATIONS.LIST, {
      queryParams: {
        page,
        limit,
        ...(filter && { filter: JSON.stringify(filter) }),
      },
    });
  }

  /**
   * Delete conversation request
   * @param {string} conversationId - Conversation ID
   * @returns {Object} - Request object
   */
  static delete(conversationId) {
    return this.buildRequest(ENDPOINTS.CONVERSATIONS.DELETE, {
      pathParams: { id: conversationId },
    });
  }
}
