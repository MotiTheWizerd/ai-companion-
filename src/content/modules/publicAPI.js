/**
 * Public API exposure module
 * Exposes window.chatGPTMessages API for external access
 */
import { Logger } from './utils/logger.js';
import { APIHelper } from '../../modules/APIClient/helpers/index.js';

/**
 * Expose public API to window object
 * Provides JavaScript API for external scripts to access conversation data
 *
 * @param {Object} conversationManager - ConversationManager instance
 * @param {Object} storageManager - StorageManager instance
 */
export function exposeAPI(conversationManager, storageManager) {
  window.chatGPTMessages = {
    /**
     * Get current conversation data
     * @returns {Object} Conversation object with messages
     */
    getConversation: () => {
      Logger.api('getConversation() called');
      return conversationManager.getConversation();
    },

    /**
     * Export conversation in formatted structure
     * @returns {Object} Exported conversation data
     */
    export: () => {
      Logger.api('export() called');
      return conversationManager.export();
    },

    /**
     * Save current conversation to storage
     * @returns {void}
     */
    save: () => {
      Logger.api('save() called');
      const conversation = conversationManager.getConversation();
      storageManager.saveConversation(conversation);
    },

    /**
     * Export conversation to downloadable file
     * @returns {void}
     */
    exportToFile: () => {
      Logger.api('exportToFile() called');
      const conversation = conversationManager.getConversation();
      storageManager.exportToFile(conversation);
    },

    /**
     * API Methods - Send data to backend
     */
    api: {
      /**
       * Send current conversation to backend
       * @returns {string} Request ID
       */
      syncConversation: () => {
        Logger.api('api.syncConversation() called');
        const conversation = conversationManager.getConversation();
        return APIHelper.syncFull(conversation);
      },

      /**
       * Send specific conversation by ID
       * @param {string} conversationId - Conversation ID
       * @returns {string} Request ID
       */
      syncById: (conversationId) => {
        Logger.api(`api.syncById(${conversationId}) called`);
        const conversation = conversationManager.getConversation(conversationId);
        return APIHelper.syncFull(conversation);
      },

      /**
       * Track analytics event
       * @param {string} eventName - Event name
       * @param {Object} eventData - Event data
       * @returns {string} Request ID
       */
      trackEvent: (eventName, eventData) => {
        Logger.api(`api.trackEvent(${eventName}) called`);
        return APIHelper.trackEvent(eventName, eventData);
      },

      /**
       * Check API health
       * @returns {string} Request ID
       */
      healthCheck: () => {
        Logger.api('api.healthCheck() called');
        return APIHelper.healthCheck();
      },

      /**
       * Get API statistics
       * @returns {Object} API client stats
       */
      getStats: () => {
        Logger.api('api.getStats() called');
        // Note: This would need to be passed from Application.js
        // For now, return placeholder
        return { message: 'Stats available via application instance' };
      },
    },
  };

  Logger.api('Public API exposed on window.chatGPTMessages');
}
