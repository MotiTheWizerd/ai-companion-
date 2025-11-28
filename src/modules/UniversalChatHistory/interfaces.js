/**
 * Interfaces for UniversalChatHistory
 * Defines how the module connects with different providers
 */

/**
 * Interface for connecting with Claude provider
 */
export class ClaudeProviderInterface {
  constructor(chatHistoryManager) {
    this.chatHistoryManager = chatHistoryManager;
  }

  /**
   * Capture chat history from Claude provider
   * @param {Object} chatData - The chat data from Claude provider
   * @returns {Object} The created chat history entry
   */
  captureChatHistory(chatData) {
    const data = {
      agent: {
        name: chatData.agentName || 'Claude',
        provider: 'Anthropic',
        model: chatData.model || 'unknown'
      },
      user: {
        id: chatData.userId || 'unknown',
        preferences: chatData.userPreferences || {}
      },
      messages: chatData.messages || [],
      conversation_id: chatData.conversationId || null,
      platform: 'Claude',
      ...chatData
    };

    return this.chatHistoryManager.createEntry(data);
  }
}

/**
 * Interface for connecting with ChatGPT provider
 */
export class ChatGPTProviderInterface {
  constructor(chatHistoryManager) {
    this.chatHistoryManager = chatHistoryManager;
  }

  /**
   * Capture chat history from ChatGPT provider
   * @param {Object} chatData - The chat data from ChatGPT provider
   * @returns {Object} The created chat history entry
   */
  captureChatHistory(chatData) {
    const data = {
      agent: {
        name: chatData.agentName || 'ChatGPT',
        provider: 'OpenAI',
        model: chatData.model || 'unknown'
      },
      user: {
        id: chatData.userId || 'unknown',
        preferences: chatData.userPreferences || {}
      },
      messages: chatData.messages || [],
      conversation_id: chatData.conversationId || null,
      platform: 'ChatGPT',
      ...chatData
    };

    return this.chatHistoryManager.createEntry(data);
  }
}

/**
 * Interface for connecting with Qwen provider
 */
export class QwenProviderInterface {
  constructor(chatHistoryManager) {
    this.chatHistoryManager = chatHistoryManager;
  }

  /**
   * Capture chat history from Qwen provider
   * @param {Object} chatData - The chat data from Qwen provider
   * @returns {Object} The created chat history entry
   */
  captureChatHistory(chatData) {
    const data = {
      agent: {
        name: chatData.agentName || 'Qwen',
        provider: 'Alibaba',
        model: chatData.model || 'unknown'
      },
      user: {
        id: chatData.userId || 'unknown',
        preferences: chatData.userPreferences || {}
      },
      messages: chatData.messages || [],
      conversation_id: chatData.conversationId || null,
      platform: 'Qwen',
      ...chatData
    };

    return this.chatHistoryManager.createEntry(data);
  }
}