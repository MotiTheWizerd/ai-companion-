/**
 * Event handlers for message-related events
 */
import { Logger } from '../utils/logger.js';

/**
 * Handle user input message event
 * Triggered when user submits a message to ChatGPT
 *
 * @param {Object} data - Event data
 * @param {string} data.conversationId - Conversation ID
 * @param {string} data.messageId - Message ID
 * @param {string} data.text - User message text
 * @param {Object} managers - Manager instances
 * @param {Object} managers.conversationManager - ConversationManager instance
 */
export function handleMessageInput(data, managers) {
  const { conversationManager } = managers;

  conversationManager.setConversationId(data.conversationId);
  conversationManager.addUserMessage(data.messageId, data.text || '');
  Logger.message('User added:', data.text);
}
