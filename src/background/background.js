/**
 * Background Service Worker
 * Handles API requests from content scripts (not subject to page CSP)
 */

import { APIClient } from '../modules/APIClient/index.js';
import { API_CONFIG } from '../content/core/constants.js';
import { safeStringify, fixAndValidateJSON } from '../modules/utils/jsonFixer.js';

// Initialize API Client in background context
const apiClient = new APIClient({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
  retryDelay: API_CONFIG.RETRY_DELAY,
  maxConcurrent: API_CONFIG.MAX_CONCURRENT,
  autoSync: false, // Disable auto-sync in background, handle via messages
});

apiClient.init();

console.log('[Background] Service worker initialized');

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);

  if (message.type === 'SYNC_CONVERSATION') {
    handleSyncConversation(message.data)
      .then(result => {
        console.log('[Background] Sync successful:', result);
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('[Background] Sync failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  }

  if (message.type === 'API_REQUEST') {
    handleAPIRequest(message.request)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  return false;
});

/**
 * Handle conversation sync request
 * @param {Object} conversationData - Conversation data from content script
 * @returns {Promise}
 */
async function handleSyncConversation(conversationData) {
  // Validate and fix JSON if needed
  const jsonString = JSON.stringify(conversationData);
  const fixResult = fixAndValidateJSON(jsonString);

  if (!fixResult.success) {
    console.error('[Background] Failed to validate conversation JSON:', fixResult.error);
    throw new Error(`Invalid conversation data: ${fixResult.error}`);
  }

  if (fixResult.appliedFixes.length > 0) {
    console.warn('[Background] Applied JSON fixes:', fixResult.appliedFixes);
    conversationData = fixResult.data; // Use fixed data
  }

  const requestData = {
    user_id: API_CONFIG.USER_ID,
    project_id: conversationData.project_id, // Now comes from content script with provider-specific value
    conversation_id: conversationData.conversation_id,
    session_id: conversationData.session_id || conversationData.conversation_id, // Session ID (same as conversation_id)
    model: conversationData.model || 'n/a',
    conversation: conversationData.conversation || [],
  };

  console.log(
    `[Background] Syncing conversation: ${requestData.conversation_id} (${requestData.conversation.length} messages)`
  );

  const requestId = apiClient.enqueueRequest({
    method: 'POST',
    endpoint: '/conversations',
    data: requestData,
  });

  // Wait for request to complete (simple version - could be enhanced with event listeners)
  return new Promise((resolve, reject) => {
    const checkStatus = setInterval(() => {
      const status = apiClient.getRequestStatus(requestId);

      if (status && status.status === 'success') {
        clearInterval(checkStatus);
        resolve(status.response);
      } else if (status && status.status === 'failed') {
        clearInterval(checkStatus);
        reject(new Error(status.error?.message || 'Request failed'));
      }
    }, 100);

    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkStatus);
      reject(new Error('Request timeout'));
    }, 60000);
  });
}

/**
 * Handle generic API request
 * @param {Object} request - Request configuration
 * @returns {Promise}
 */
async function handleAPIRequest(request) {
  const requestId = apiClient.enqueueRequest(request);

  return new Promise((resolve, reject) => {
    const checkStatus = setInterval(() => {
      const status = apiClient.getRequestStatus(requestId);

      if (status && status.status === 'success') {
        clearInterval(checkStatus);
        resolve(status.response);
      } else if (status && status.status === 'failed') {
        clearInterval(checkStatus);
        reject(new Error(status.error?.message || 'Request failed'));
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkStatus);
      reject(new Error('Request timeout'));
    }, 60000);
  });
}

console.log('[Background] Listening for messages...');
