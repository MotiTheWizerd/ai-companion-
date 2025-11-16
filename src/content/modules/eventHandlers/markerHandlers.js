/**
 * Event handlers for marker and metadata events
 */
import { Logger } from '../utils/logger.js';

/**
 * Handle message marker event
 * Triggered when message metadata/marker is received
 *
 * @param {Object} data - Event data
 * @param {string} data.conversationId - Conversation ID
 * @param {string} data.messageId - Message ID
 * @param {string} data.marker - Marker type
 * @param {string} data.event - Event type
 * @param {Object} managers - Manager instances
 * @param {Object} managers.messageManager - MessageManager instance
 * @param {Object} managers.conversationManager - ConversationManager instance
 */
export function handleMessageMarker(data, managers) {
  const { messageManager, conversationManager } = managers;

  messageManager.setConversationId(data.conversationId);
  messageManager.setMessageId(data.messageId);
  conversationManager.setConversationId(data.conversationId);
}

/**
 * Handle message metadata event
 * Triggered when server sends metadata (model info)
 *
 * @param {Object} data - Event data
 * @param {string} data.modelSlug - Model identifier
 * @param {Object} managers - Manager instances
 * @param {Object} managers.conversationManager - ConversationManager instance
 */
export function handleMessageMetadata(data, managers) {
  const { conversationManager } = managers;

  conversationManager.setModel(data.modelSlug);
  Logger.message('Metadata - model:', data.modelSlug);
}
