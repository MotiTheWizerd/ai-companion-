/**
 * Chat History Event Handlers
 * Handle events related to chat history capture and management
 */

/**
 * Handle conversation resume event
 * @param {Object} data - Event data containing conversation information
 * @param {Object} managers - Managers object containing all application managers
 */
export function handleConversationResume(data, managers) {
  console.log('[ChatHistoryHandler] Handling conversation resume:', data);
  
  if (managers.chatHistoryManager) {
    const { chatHistoryManager } = managers;
    
    // Determine the platform and call appropriate capture method
    if (data.platform === 'Claude') {
      chatHistoryManager.captureClaudeConversationData(data, data.url || 'unknown');
    } else {
      chatHistoryManager.captureOnResume(data, data.platform || 'unknown');
    }
  } else {
    console.warn('[ChatHistoryHandler] chatHistoryManager not available in managers');
  }
}

/**
 * Handle chat history capture event
 * @param {Object} data - Event data containing chat history to capture
 * @param {Object} managers - Managers object containing all application managers
 */
export function handleChatHistoryCapture(data, managers) {
  console.log('[ChatHistoryHandler] Handling chat history capture:', data);
  
  if (managers.chatHistoryManager) {
    const { chatHistoryManager } = managers;
    chatHistoryManager.createEntry({
      agent: data.agent || {},
      user: data.user || {},
      messages: data.messages || [],
      conversation_id: data.conversation_id || null,
      platform: data.platform || 'unknown',
      ...data
    });
  } else {
    console.warn('[ChatHistoryHandler] chatHistoryManager not available in managers');
  }
}

/**
 * Handle Claude API response event
 * @param {Object} data - Event data containing Claude API response
 * @param {Object} managers - Managers object containing all application managers
 */
export function handleClaudeApiResponse(data, managers) {
  console.log('[ChatHistoryHandler] Handling Claude API response:', data);
  
  if (managers.chatHistoryManager) {
    const { chatHistoryManager } = managers;
    chatHistoryManager.captureClaudeConversationData(data.responseData, data.apiUrl);
  } else {
    console.warn('[ChatHistoryHandler] chatHistoryManager not available in managers');
  }
}