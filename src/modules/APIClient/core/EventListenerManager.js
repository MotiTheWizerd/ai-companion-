/**
 * EventListenerManager Module
 * Manages event subscriptions and auto-sync functionality
 */

import { eventBus } from '../../../content/core/eventBus.js';
import { EVENTS, API_CONFIG } from '../../../content/core/constants.js';
import { Logger } from '../../../content/modules/utils/logger.js';

/**
 * EventListenerManager class
 * Sets up event listeners and handles event-driven behaviors
 */
export class EventListenerManager {
  constructor(apiClient, config) {
    this.apiClient = apiClient;
    this.config = config;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Listen for API requests from other parts of the application
    eventBus.on(EVENTS.API_REQUEST, (request) => {
      this.apiClient.enqueueRequest(request);
    });

    // Listen for queue processing trigger
    eventBus.on(EVENTS.API_PROCESS_QUEUE, () => {
      this.apiClient.processQueue();
    });

    // Auto-sync on stream completion if enabled
    if (this.config.autoSync) {
      eventBus.on(EVENTS.STREAM_COMPLETE, (data) => {
        this.syncConversation(data);
      });
    }
  }

  /**
   * Sync conversation to backend
   * Transforms conversation data to match backend API format
   * @param {Object} conversationData - Conversation data from STREAM_COMPLETE event
   * @returns {string} - Request ID
   */
  syncConversation(conversationData) {
    // Transform data to backend expected format
    const requestData = {
      user_id: API_CONFIG.USER_ID,
      project_id: API_CONFIG.PROJECT_ID,
      conversation_id: conversationData.conversation_id,
      model: conversationData.model || 'gpt-4',
      conversation: conversationData.conversation || [],
    };

    Logger.api(`Auto-syncing conversation: ${requestData.conversation_id} (${requestData.conversation.length} messages)`);

    return this.apiClient.enqueueRequest({
      method: 'POST',
      endpoint: '/api/conversations',
      data: requestData,
    });
  }

  /**
   * Remove all event listeners (cleanup)
   */
  removeEventListeners() {
    eventBus.off(EVENTS.API_REQUEST);
    eventBus.off(EVENTS.API_PROCESS_QUEUE);

    if (this.config.autoSync) {
      eventBus.off(EVENTS.STREAM_COMPLETE);
    }
  }
}
