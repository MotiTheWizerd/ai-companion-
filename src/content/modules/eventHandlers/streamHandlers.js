/**
 * Event handlers for stream-related events
 */
import { Logger } from '../utils/logger.js';
import { eventBus } from '../../core/eventBus.js';
import { EVENTS } from '../../core/constants.js';

/**
 * Handle stream start event
 * Triggered when ChatGPT response stream begins
 *
 * @param {Object} data - Event data
 * @param {string} data.conversationId - Conversation ID
 * @param {string} data.messageId - Message ID
 * @param {Object} managers - Manager instances
 * @param {Object} managers.messageManager - MessageManager instance
 * @param {Object} managers.conversationManager - ConversationManager instance
 */
export function handleStreamStart(data, managers) {
  const { messageManager, conversationManager } = managers;

  Logger.stream('Started:', data);
  messageManager.startMessage(data.conversationId, data.messageId);
  conversationManager.setConversationId(data.conversationId);
}

/**
 * Handle stream text chunk event
 * Triggered when text chunks arrive during streaming
 *
 * @param {Object} data - Event data
 * @param {string} data.text - Text chunk to append
 * @param {Object} managers - Manager instances
 * @param {Object} managers.messageManager - MessageManager instance
 */
export function handleStreamText(data, managers) {
  const { messageManager } = managers;

  messageManager.appendText(data.text);
}

/**
 * Handle stream complete event
 * Triggered when the complete response stream finishes
 *
 * @param {Object} data - Event data
 * @param {string} data.conversationId - Conversation ID
 * @param {Object} managers - Manager instances
 * @param {Object} managers.messageManager - MessageManager instance
 * @param {Object} managers.conversationManager - ConversationManager instance
 * @param {Object} managers.storageManager - StorageManager instance
 */
export function handleStreamComplete(data, managers) {
  const { messageManager, conversationManager, storageManager } = managers;

  const message = messageManager.finalize();
  conversationManager.addAssistantMessage(message.message_id, message.text);

  const conversation = conversationManager.getConversation();

  // Log final conversation structure
  Logger.conversation(conversation);

  // Auto-save to storage
  storageManager.saveConversation(conversation);

  // Send conversation to background script for API sync
  // Uses window.postMessage to communicate with content script (loader.js)
  // which forwards to background service worker
  Logger.api('Sending conversation to background for sync');

  // Post message to content script (message bridge)
  window.postMessage({
    source: 'chatgpt-extension',
    type: 'SYNC_CONVERSATION',
    data: conversation
  }, '*');

  // Listen for response from background (via content script)
  const handleResponse = (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    // Filter response messages
    if (!event.data || event.data.source !== 'chatgpt-extension-response') return;
    if (event.data.type !== 'SYNC_CONVERSATION') return;

    // Remove listener after receiving response
    window.removeEventListener('message', handleResponse);

    if (event.data.success) {
      Logger.api(`Sync successful: ${conversation.conversation_id}`);
    } else {
      Logger.api(`Sync failed: ${event.data.error || 'Unknown error'}`);
    }
  };

  window.addEventListener('message', handleResponse);

  // Cleanup listener after timeout (30 seconds)
  setTimeout(() => {
    window.removeEventListener('message', handleResponse);
  }, 30000);
}
