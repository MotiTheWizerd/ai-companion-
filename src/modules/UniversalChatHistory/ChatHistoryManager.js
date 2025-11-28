/**
 * ChatHistoryManager
 * Manages chat history with created_at, agent, user fields
 */

export class ChatHistoryManager {
  constructor() {
    this.storageKey = 'universal_chat_history';
    this.entries = this.loadFromStorage();
    this.resumedChatObserver = null;
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

    window.fetch = function(...args) {
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

    // Extract the organization ID from the URL as well
    const orgMatch = window.location.href.match(/claude\.ai\/api\/organizations\/([\w-]+)/i);
    const orgId = orgMatch ? orgMatch[1] : 'unknown';

    // We'll wait for the API call to retrieve the conversation data
    // The data should be captured by our network interceptor
    console.log(`[ChatHistoryManager] Waiting for API call for conversation ${conversationId} in org ${orgId}`);
  }

  /**
   * Capture Claude conversation data from API response
   * @param {Object} data - The conversation data from the API
   * @param {string} url - The API URL that returned the data
   */
  captureClaudeConversationData(data, url) {
    console.log(`[ChatHistoryManager] Capturing Claude conversation data from API response`);
    console.log(`[ChatHistoryManager] API URL: ${url}`);
    console.log(`[ChatHistoryManager] Conversation data:`, data);

    // Extract conversation ID from the URL
    const conversationIdMatch = url.match(/chat_conversations\/([a-f0-9-]+)/i);
    const conversationId = conversationIdMatch ? conversationIdMatch[1] : 'unknown';

    // Format the data according to our structure
    const formattedData = {
      agent: {
        name: 'Claude',
        provider: 'Anthropic',
        model: this.extractModelFromData(data) || 'unknown'
      },
      user: {
        id: this.extractUserIdFromData(data) || 'unknown',
        preferences: {}
      },
      messages: this.extractMessagesFromData(data) || [],
      conversation_id: conversationId,
      platform: 'Claude',
      raw_data: data, // Keep the raw data for potential future use
      url: url
    };

    const entry = this.createEntry(formattedData);

    console.log(`[ChatHistoryManager] Claude conversation data captured with ID: ${entry.id}`);
    console.log(`[ChatHistoryManager] Stored conversation:`, entry);

    return entry;
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
    // Implementation will depend on the actual structure of Claude API response
    if (data && Array.isArray(data.messages)) {
      return data.messages.map(msg => ({
        id: msg.id || 'unknown',
        role: msg.role || 'unknown',
        text: msg.text || msg.content || 'No content',
        timestamp: msg.created_at || msg.timestamp || new Date().toISOString()
      }));
    }
    // If messages are nested in conversation metadata, handle that:
    if (data && data.conversation && Array.isArray(data.conversation.messages)) {
      return data.conversation.messages.map(msg => ({
        id: msg.id || 'unknown',
        role: msg.role || 'unknown',
        text: msg.text || msg.content || 'No content',
        timestamp: msg.created_at || msg.timestamp || new Date().toISOString()
      }));
    }
    return [];
  }

  /**
   * Create a new chat history entry
   * @param {Object} data - Chat data containing agent, user, and messages
   * @returns {Object} The created entry with id and timestamp
   */
  createEntry(data) {
    const entry = {
      id: this.generateId(),
      created_at: new Date().toISOString(),
      agent: data.agent || {},
      user: data.user || {},
      messages: data.messages || [],
      conversation_id: data.conversation_id || null,
      platform: data.platform || 'unknown',
      ...data
    };

    this.entries.push(entry);
    this.saveToStorage();
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

    this.saveToStorage();
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
      this.saveToStorage();
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
   * Save entries to storage
   */
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (error) {
      console.error('[ChatHistoryManager] Error saving to storage:', error);
    }
  }

  /**
   * Load entries from storage
   * @returns {Array} Array of chat history entries
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[ChatHistoryManager] Error loading from storage:', error);
      return [];
    }
  }
}