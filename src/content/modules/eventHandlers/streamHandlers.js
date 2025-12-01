/**
 * Event handlers for stream-related events
 */
import { Logger } from '../utils/logger.js';
import { eventBus } from '../../core/eventBus.js';
import { EVENTS } from '../../core/constants.js';
import { ProviderRegistry } from '../../../modules/providers/ProviderRegistry.js';

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

  const fullConversation = conversationManager.getConversation();

  // Log final conversation structure
  Logger.conversation(fullConversation);

  // Auto-save to storage (save full conversation history)
  storageManager.saveConversation(fullConversation);

  // Extract only the latest user + assistant message pair for backend sync
  const messages = fullConversation.conversation || [];

  // Find last user message and last assistant message
  let lastUserMessage = null;
  let lastAssistantMessage = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && !lastAssistantMessage) {
      lastAssistantMessage = msg;
    } else if (msg.role === 'user' && !lastUserMessage) {
      lastUserMessage = msg;
    }

    // Stop once we have both
    if (lastUserMessage && lastAssistantMessage) break;
  }

  // Only send if we have both user and assistant messages
  if (!lastUserMessage || !lastAssistantMessage) {
    Logger.api('Skipping sync: missing user or assistant message');
    return;
  }

  // Get active provider and its projectId
  const providerRegistry = ProviderRegistry.getInstance();
  const activeProvider = providerRegistry.getActiveProvider();

  if (!activeProvider || !activeProvider.getProjectId) {
    Logger.api('Skipping sync: no active provider or getProjectId method available');
    return;
  }

  // Get project ID dynamically from provider using Promise
  activeProvider.getProjectId().then(projectId => {
    if (!projectId) {
      Logger.api('Skipping sync: no projectId available from active provider');
      return;
    }

    // Create payload with only the latest exchange
    const syncPayload = {
      conversation_id: fullConversation.conversation_id,
      session_id: fullConversation.conversation_id, // Session ID (same as conversation_id)
      model: fullConversation.model,
      project_id: projectId, // Provider-specific project ID
      conversation: [lastUserMessage, lastAssistantMessage]
    };

    // Send conversation to background script for API sync
    // Uses window.postMessage to communicate with content script (loader.js)
    // which forwards to background service worker
    Logger.api('Sending latest exchange to background for sync');

    // Post message to content script (message bridge)
    window.postMessage({
      source: 'chatgpt-extension',
      type: 'SYNC_CONVERSATION',
      data: syncPayload
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
        Logger.api(`Sync successful: ${fullConversation.conversation_id}`);
      } else {
        Logger.api(`Sync failed: ${event.data.error || 'Unknown error'}`);
      }
    };

    window.addEventListener('message', handleResponse);

    // Cleanup listener after timeout (30 seconds)
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
    }, 30000);
  }).catch(error => {
    Logger.api('Error getting project ID:', error);
  });
}

