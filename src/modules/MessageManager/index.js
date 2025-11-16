/**
 * MessageManager - Handles message building from stream chunks
 */
export class MessageManager {
  constructor() {
    this.currentMessage = {
      text: '',
      role: 'assistant',
      conversationId: null,
      messageId: null
    };
  }

  /**
   * Start new message
   */
  startMessage(conversationId, messageId, role = 'assistant') {
    this.currentMessage = {
      text: '',
      role: role,
      conversationId: conversationId,
      messageId: messageId
    };
  }

  /**
   * Set message metadata
   */
  setConversationId(id) {
    this.currentMessage.conversationId = id;
  }

  setMessageId(id) {
    this.currentMessage.messageId = id;
  }

  /**
   * Append text chunk to current message
   */
  appendText(chunk) {
    this.currentMessage.text += chunk;
  }

  /**
   * Get current message text
   */
  getText() {
    return this.currentMessage.text;
  }

  /**
   * Get message ID
   */
  getMessageId() {
    return this.currentMessage.messageId;
  }

  /**
   * Get conversation ID
   */
  getConversationId() {
    return this.currentMessage.conversationId;
  }

  /**
   * Finalize and return complete message
   */
  finalize() {
    return {
      role: this.currentMessage.role,
      message_id: this.currentMessage.messageId,
      text: this.currentMessage.text
    };
  }

  /**
   * Reset current message
   */
  reset() {
    this.currentMessage = {
      text: '',
      role: 'assistant',
      conversationId: null,
      messageId: null
    };
  }
}
