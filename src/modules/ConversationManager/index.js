import { UniversalSelector } from './selectors/index.js';

/**
 * ConversationManager - Manages conversation state
 */
export class ConversationManager {
  constructor() {
    this.selectors = new UniversalSelector();
    this.conversation = {
      conversation_id: null,
      model: null,
      conversation: []
    };
  }

  /**
   * Set the provider for selectors
   * @param {string} providerName 
   */
  setProvider(providerName) {
    this.selectors.setProvider(providerName);
  }

  /**
   * Get the selectors instance
   */
  getSelectors() {
    return this.selectors;
  }

  /**
   * Set conversation metadata
   */
  setConversationId(id) {
    if (!this.conversation.conversation_id) {
      this.conversation.conversation_id = id;
    }
  }

  setModel(model) {
    this.conversation.model = model;
  }

  /**
   * Add user message to conversation
   */
  addUserMessage(messageId, text) {
    const userMessage = {
      role: 'user',
      message_id: messageId,
      text: text
    };
    this.conversation.conversation.push(userMessage);
    return userMessage;
  }

  /**
   * Add assistant message to conversation
   */
  addAssistantMessage(messageId, text) {
    const assistantMessage = {
      role: 'assistant',
      message_id: messageId,
      text: text
    };
    this.conversation.conversation.push(assistantMessage);
    return assistantMessage;
  }

  /**
   * Get current conversation
   */
  getConversation() {
    return this.conversation;
  }

  /**
   * Export conversation as JSON
   */
  export() {
    return JSON.stringify(this.conversation, null, 2);
  }

  /**
   * Reset conversation
   */
  reset() {
    this.conversation = {
      conversation_id: null,
      model: null,
      conversation: []
    };
  }

  /**
   * Get message count
   */
  getMessageCount() {
    return this.conversation.conversation.length;
  }
}
