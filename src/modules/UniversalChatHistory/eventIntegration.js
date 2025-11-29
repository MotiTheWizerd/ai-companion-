/**
 * Event system integration for UniversalChatHistory
 * Connects the chat history module with the existing eventBus
 */

export class EventIntegration {
  constructor(chatHistoryManager, eventBus) {
    this.chatHistoryManager = chatHistoryManager;
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for chat history capture
   */
  setupEventListeners() {
    // Listen for events that indicate a new chat is being resumed
    // For Claude, this might be when a conversation page loads
    this.eventBus.on('CONVERSATION_RESUME', (data) => {
      console.log('[EventIntegration] Received CONVERSATION_RESUME event:', data);
      this.handleConversationResume(data);
    });

    // Listen for Claude-specific events
    this.eventBus.on('CLAUDE_API_RESPONSE', (data) => {
      console.log('[EventIntegration] Received CLAUDE_API_RESPONSE event:', data);
      this.handleClaudeApiResponse(data);
    });

    // Listen for ChatGPT-specific events
    this.eventBus.on('CHATGPT_API_RESPONSE', (data) => {
      console.log('[EventIntegration] Received CHATGPT_API_RESPONSE event:', data);
      this.handleChatGPTApiResponse(data);
    });

    // Listen for general chat events
    this.eventBus.on('CHAT_HISTORY_CAPTURE', (data) => {
      console.log('[EventIntegration] Received CHAT_HISTORY_CAPTURE event:', data);
      this.captureChatHistory(data);
    });

    // Emit events when chat history is captured
    console.log('[EventIntegration] Event listeners set up for chat history capture');
  }

  /**
   * Handle conversation resume event
   * @param {Object} data - Event data containing conversation information
   */
  handleConversationResume(data) {
    console.log(`[EventIntegration] Handling conversation resume for platform: ${data.platform || 'unknown'}`);

    // Call the appropriate capture method based on the platform
    if (data.platform === 'Claude') {
      // For Claude, we might need to fetch the conversation data first
      this.chatHistoryManager.captureClaudeConversationData(data, data.url || 'unknown');
    } else {
      // For other platforms, use generic capture
      this.chatHistoryManager.captureOnResume(data, data.platform);
    }
  }

  /**
   * Handle Claude API response event
   * @param {Object} data - Event data containing Claude API response
   */
  handleClaudeApiResponse(data) {
    console.log('[EventIntegration] Handling Claude API response:', data);

    // Capture the Claude conversation data
    this.chatHistoryManager.captureClaudeConversationData(data.responseData, data.apiUrl);
  }

  /**
   * Handle ChatGPT API response event
   * @param {Object} data - Event data containing ChatGPT API response
   */
  handleChatGPTApiResponse(data) {
    console.log('[EventIntegration] Handling ChatGPT API response:', data);

    // Capture the ChatGPT conversation data
    this.chatHistoryManager.captureChatGPTConversationData(data.responseData, data.apiUrl);
  }

  /**
   * Capture chat history using the manager
   * @param {Object} data - Chat history data to capture
   */
  captureChatHistory(data) {
    console.log('[EventIntegration] Capturing chat history via event system:', data);

    const entry = this.chatHistoryManager.createEntry({
      agent: data.agent || {},
      user: data.user || {},
      messages: data.messages || [],
      conversation_id: data.conversation_id || data.conversationId || null,
      platform: data.platform || 'unknown',
      ...data
    });

    // Emit an event to notify other components that chat history was captured
    this.eventBus.emit('CHAT_HISTORY_CAPTURED', {
      entryId: entry.id,
      conversationId: entry.conversation_id,
      platform: entry.platform,
      timestamp: entry.created_at
    });

    console.log('[EventIntegration] Chat history captured and event emitted:', entry);
  }
}