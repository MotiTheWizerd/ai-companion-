/**
 * Message Request Factory
 * Builds requests for message endpoints
 */

import { ENDPOINTS } from '../EndpointRegistry.js';
import { BaseRequestFactory } from './BaseRequestFactory.js';

/**
 * MessageRequestFactory class
 * Handles message operations
 */
export class MessageRequestFactory extends BaseRequestFactory {
  /**
   * Create message request
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message data
   * @returns {Object} - Request object
   */
  static create(conversationId, message) {
    return this.buildRequest(ENDPOINTS.MESSAGES.CREATE, {
      pathParams: { conversationId },
      data: {
        messageId: message.messageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        metadata: message.metadata || {},
      },
    });
  }

  /**
   * Get message request
   * @param {string} messageId - Message ID
   * @returns {Object} - Request object
   */
  static get(messageId) {
    return this.buildRequest(ENDPOINTS.MESSAGES.GET, {
      pathParams: { id: messageId },
    });
  }

  /**
   * Update message request
   * @param {string} messageId - Message ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} - Request object
   */
  static update(messageId, updates) {
    return this.buildRequest(ENDPOINTS.MESSAGES.UPDATE, {
      pathParams: { id: messageId },
      data: this.addTimestamp(updates),
    });
  }

  /**
   * List messages request
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - List options
   * @returns {Object} - Request object
   */
  static list(conversationId, options = {}) {
    return this.buildRequest(ENDPOINTS.MESSAGES.LIST, {
      pathParams: { conversationId },
      queryParams: options,
    });
  }
}
