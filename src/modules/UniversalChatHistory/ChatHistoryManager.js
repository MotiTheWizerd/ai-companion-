/**
 * ChatHistoryManager
 * Manages chat history in memory (no localStorage persistence)
 * Conversations are captured and emitted for backend storage
 */

import { USER_CONFIG } from '../../configuration/index.js';

export class ChatHistoryManager {
  constructor() {
    this.entries = []; // In-memory storage only
    this.resumedChatObserver = null;
    this.capturedConversations = new Set(); // Track which conversation IDs have been captured
    this.capturedCallbacks = []; // Callbacks to notify when conversation is captured
    this.currentConversationId = null; // Track current conversation ID
  }

  /**
   * Set up an observer to detect when a new chat is resumed by monitoring URL changes
   * This will detect when a user visits a Claude conversation URL
   */
  setupResumeChatObserver() {
    // Monitor URL changes to detect when a user visits a specific conversation
    this.monitorUrlChanges();
    // Also monitor for API requests that contain conversation data
    this.setupNetworkInterceptor();
  }

  /**
   * Monitor URL changes to detect Claude conversation visits
   */
  monitorUrlChanges() {
    let currentUrl = window.location.href;
    console.log(`[ChatHistoryManager] Starting URL monitoring, initial URL: ${currentUrl}`);

    const checkUrl = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log(`[ChatHistoryManager] URL changed to: ${currentUrl}`);

        // Check if this is a Claude conversation URL
        const claudeConversationMatch = currentUrl.match(/claude\.ai\/api\/organizations\/[\w-]+\/chat_conversations\/([a-f0-9-]+)/i);
        if (claudeConversationMatch) {
          const conversationId = claudeConversationMatch[1];
          console.log(`[ChatHistoryManager] Detected Claude conversation visit: ${conversationId}`);
          this.handleClaudeConversationVisit(conversationId);
        } else {
          console.log(`[ChatHistoryManager] URL is not a Claude conversation API URL, checking for page URL pattern...`);

          // Also check for page-level Claude conversation URLs (not API)
          const claudePageMatch = currentUrl.match(/claude\.ai\/chat\/([a-f0-9-]+)/i);
          if (claudePageMatch) {
            const conversationId = claudePageMatch[1];
            console.log(`[ChatHistoryManager] Detected Claude conversation page visit: ${conversationId}`);
            // Don't immediately handle it - wait for the API call to retrieve the data
            // When the page loads, it triggers an API call that we'll intercept in the NetworkInterceptor
          }
        }
      }
      requestAnimationFrame(checkUrl);
    };

    checkUrl();
  }

  /**
   * Set up network interception to capture conversation data
   */
  setupNetworkInterceptor() {
    // Override fetch to intercept API calls
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function (...args) {
      const url = args[0];

      // Check if this is a Claude conversation API request
      if (typeof url === 'string' && url.includes('claude.ai/api/') && url.includes('/chat_conversations/')) {
        console.log(`[ChatHistoryManager] Intercepting Claude API request: ${url}`);

        // Return the original fetch but with promise handling to capture response
        return originalFetch.apply(this, args).then(async (response) => {
          // Clone the response so we can read it
          const responseClone = response.clone();

          try {
            const data = await responseClone.json();
            console.log(`[ChatHistoryManager] Intercepted Claude conversation data:`, data);

            // Process and store the conversation data
            self.captureClaudeConversationData(data, url);
          } catch (e) {
            console.log(`[ChatHistoryManager] Could not parse response as JSON: ${e.message}`);
          }

          return response;
        });
      }

      return originalFetch.apply(this, args);
    };
  }

  /**
   * Handle when a Claude conversation URL is visited
   * @param {string} conversationId - The ID of the conversation
   */
  async handleClaudeConversationVisit(conversationId) {
    console.log(`[ChatHistoryManager] Handling Claude conversation visit for ID: ${conversationId}`);

    // Reset the captured flag if this is a NEW conversation
    if (this.currentConversationId !== conversationId) {
      console.log(`[ChatHistoryManager] NEW conversation detected (was: ${this.currentConversationId}, now: ${conversationId}). Resetting capture flag.`);
      this.currentConversationId = conversationId;
      // No longer using `conversationCaptured` flag, relying on `capturedConversations` Set
    }

    // Extract the organization ID from the URL as well
    const orgMatch = window.location.href.match(/claude\.ai\/api\/organizations\/([\w-]+)/i);
    const orgId = orgMatch ? orgMatch[1] : 'unknown';

    // We'll wait for the API call to retrieve the conversation data
    // The data should be captured by our network interceptor
    console.log(`[ChatHistoryManager] Waiting for API call for conversation ${conversationId} in org ${orgId}`);
  }

  /**
   * Capture and store Claude conversation data from API response
   * @param {Object} data - Raw Claude API conversation object
   * @param {string} url - The URL from which this data was retrieved
   * @returns {Object} The created entry
   */
  captureClaudeConversationData(data, url) {
    console.log('[ChatHistoryManager] Capturing Claude conversation data from API response');

    const conversationId = data.uuid || 'unknown';

    console.log(`[ChatHistoryManager] Processing conversation ID: ${conversationId}`);

    // Extract model and clean messages
    const model = this.extractModelFromData(data) || 'claude';
    const conversationMessages = this.cleanChatMessages(data.chat_messages || []);

    const formattedData = {
      model: model,
      session_id: conversationId,
      conversation_id: conversationId,
      conversation_messages: conversationMessages,
      platform: 'Claude'
    };

    const entry = this.createEntry(formattedData);

    console.log(`[ChatHistoryManager] Claude conversation data captured with ID: ${conversationId}`);
    console.log(`[ChatHistoryManager] Stored conversation:`, entry);

    return entry;
  }

  /**
   * Clean chat_messages array and transform to simplified format
   * @param {Array} messages - Raw chat_messages from Claude API
   * @returns {Array} Simplified chat_messages with only role, text, message_id
   */
  cleanChatMessages(messages) {
    return messages.map((msg, index) => {
      // Extract text from content array
      let text = msg.text || '';
      if (Array.isArray(msg.content)) {
        const textBlocks = msg.content.filter(c => c.type === 'text');
        text = textBlocks.map(block => block.text).join('\n');
      }

      // Determine role based on position
      // First message (parent_message_uuid all zeros) is user, then alternates
      const isFirstMessage = msg.parent_message_uuid === '00000000-0000-4000-8000-000000000000';
      const role = (isFirstMessage || index % 2 === 0) ? 'user' : 'assistant';

      return {
        role: role,
        text: text,
        message_id: msg.uuid
      };
    });
  }

  /**
   * Extract model information from Claude API response data
   * @param {Object} data - The API response data
   * @returns {string|null} The model name or null if not found
   */
  extractModelFromData(data) {
    // Implementation will depend on the actual structure of Claude API response
    if (data && data.model) {
      return data.model;
    }
    // If the model is nested in conversation metadata, handle that:
    if (data && data.conversation && data.conversation.model) {
      return data.conversation.model;
    }
    return null;
  }

  /**
   * Extract user information from Claude API response data
   * @param {Object} data - The API response data
   * @returns {string|null} The user ID or null if not found
   */
  extractUserIdFromData(data) {
    // Implementation will depend on the actual structure of Claude API response
    if (data && data.user_id) {
      return data.user_id;
    }
    // If user ID is nested in conversation metadata, handle that:
    if (data && data.conversation && data.conversation.user_id) {
      return data.conversation.user_id;
    }
    return null;
  }

  /**
   * Extract messages from Claude API response data
   * @param {Object} data - The API response data
   * @returns {Array|null} Array of messages or null if not found
   */
  extractMessagesFromData(data) {
    // Claude API uses 'chat_messages' field
    if (data && Array.isArray(data.chat_messages)) {
      return data.chat_messages.map(msg => {
        // Extract text from content array (Claude's format)
        let text = '';
        if (Array.isArray(msg.content)) {
          // Find text content blocks
          const textBlocks = msg.content.filter(c => c.type === 'text');
          text = textBlocks.map(block => block.text).join('\n');
        } else if (msg.text) {
          text = msg.text;
        } else if (msg.content) {
          text = msg.content;
        }

        return {
          id: msg.uuid || msg.id || 'unknown',
          role: msg.sender || msg.role || 'unknown',
          text: text || 'No content',
          timestamp: msg.created_at || msg.timestamp || new Date().toISOString()
        };
      });
    }

    // Fallback: check for other possible field names
    if (data && Array.isArray(data.messages)) {
      return data.messages.map(msg => ({
        id: msg.id || 'unknown',
        role: msg.role || 'unknown',
        text: msg.text || msg.content || 'No content',
        timestamp: msg.created_at || msg.timestamp || new Date().toISOString()
      }));
    }

    return [];
  }

  /**
   * Register a callback to be notified when a conversation is captured
   * @param {Function} callback - Function to be called when conversation is captured
   */
  onConversationCaptured(callback) {
    this.capturedCallbacks.push(callback);
  }

  /**
   * Notify all registered callbacks that a conversation has been captured
   * @param {Object} entry - The captured conversation entry with id and conversation_id
   */
  notifyConversationCaptured(entry) {
    const conversationId = entry.conversation_id || entry.id;

    // Only notify if this is a new conversation we haven't captured before
    if (!this.capturedConversations.has(conversationId)) {
      this.capturedConversations.add(conversationId);
      console.log(`[ChatHistoryManager] New conversation captured: ${conversationId}`);

      // Call all registered callbacks with the entry data
      this.capturedCallbacks.forEach(callback => {
        try {
          callback(entry);
        } catch (error) {
          console.error('[ChatHistoryManager] Error in conversation captured callback:', error);
        }
      });
    } else {
      console.log(`[ChatHistoryManager] Conversation ${conversationId} already captured, skipping notification`);
    }
  }

  /**
   * Create a new chat history entry
   * @param {Object} data - Chat data containing model, session_id, user_id, and conversation_messages
   * @returns {Object} The created entry
   */
  createEntry(data) {
    const entry = {
      user_id: data.user_id || USER_CONFIG?.USER_ID || 'unknown',
      project_id: 'eb75e102-be0a-4b4b-a7ce-59fcab03fc0d',
      model: data.model || data.agent || 'claude',
      session_id: data.session_id || data.conversation_id || null,
      conversation_id: data.session_id || data.conversation_id || null, // Add conversation_id as requested
      conversation_messages: data.conversation_messages || []
    };

    this.entries.push(entry);
    this.saveToStorage();

    // Notify listeners if this is a Claude conversation
    if (data.platform === 'Claude' || data.model || data.agent) {
      this.notifyConversationCaptured(entry);
    }

    return entry;
  }

  /**
   * Retrieve a specific chat history entry by ID
   * @param {string} id - The ID of the entry to retrieve
   * @returns {Object|null} The chat history entry or null if not found
   */
  getEntry(id) {
    return this.entries.find(entry => entry.id === id) || null;
  }

  /**
   * Get all chat history entries
   * @returns {Array} Array of all chat history entries
   */
  getAllEntries() {
    return [...this.entries];
  }

  /**
   * Update an existing chat history entry
   * @param {string} id - The ID of the entry to update
   * @param {Object} data - Data to update in the entry
   * @returns {Object|null} The updated entry or null if not found
   */
  updateEntry(id, data) {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index === -1) {
      return null;
    }

    this.entries[index] = {
      ...this.entries[index],
      ...data,
      id, // Ensure ID doesn't get overwritten
      created_at: this.entries[index].created_at // Preserve original creation time
    };

    // Storage disabled - kept in memory only
    return this.entries[index];
  }

  /**
   * Delete a specific chat history entry
   * @param {string} id - The ID of the entry to delete
   * @returns {boolean} True if deletion was successful, false otherwise
   */
  deleteEntry(id) {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(entry => entry.id !== id);

    if (this.entries.length !== initialLength) {
      // Storage disabled - kept in memory only
      return true;
    }

    return false;
  }

  /**
   * Clear all chat history entries
   */
  clearHistory() {
    this.entries = [];
    this.saveToStorage();
  }

  /**
   * Generate a unique ID for a new entry
   * @returns {string} A unique ID
   */
  generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * saveToStorage - Deprecated
   * Conversations are now kept in memory only
   */
  saveToStorage() {
    // No-op: localStorage persistence disabled to avoid quota errors
    // Conversations are emitted via events for backend storage
  }

  /**
   * loadFromStorage - Deprecated
   * Returns empty array as all storage is in-memory now
   * @returns {Array} Empty array
   */
  loadFromStorage() {
    // No-op: localStorage persistence disabled
    return [];
  }
}