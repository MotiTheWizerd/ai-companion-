/**
 * StorageManager - Handles conversation persistence and export
 */
export class StorageManager {
  constructor() {
    this.storageKey = 'chatgpt_conversations';
  }

  /**
   * Save conversation to localStorage
   */
  saveConversation(conversation) {
    try {
      const conversations = this.getConversations();

      // Check if conversation already exists
      const existingIndex = conversations.findIndex(
        c => c.conversation_id === conversation.conversation_id
      );

      if (existingIndex >= 0) {
        // Update existing conversation
        conversations[existingIndex] = conversation;
      } else {
        // Add new conversation
        conversations.push(conversation);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      console.log('[Storage] Conversation saved:', conversation.conversation_id);
      return true;
    } catch (error) {
      console.error('[Storage] Failed to save:', error);
      return false;
    }
  }

  /**
   * Get all saved conversations
   */
  getConversations() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Storage] Failed to retrieve:', error);
      return [];
    }
  }

  /**
   * Get specific conversation by ID
   */
  getConversation(conversationId) {
    const conversations = this.getConversations();
    return conversations.find(c => c.conversation_id === conversationId);
  }

  /**
   * Clear all conversations
   */
  clearAll() {
    localStorage.removeItem(this.storageKey);
    console.log('[Storage] All conversations cleared');
  }

  /**
   * Export conversation to downloadable JSON file
   */
  exportToFile(conversation, filename) {
    const json = JSON.stringify(conversation, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `conversation-${conversation.conversation_id || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[Storage] Exported to file:', a.download);
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    const conversations = this.getConversations();
    const jsonSize = JSON.stringify(conversations).length;

    return {
      count: conversations.length,
      sizeBytes: jsonSize,
      sizeKB: (jsonSize / 1024).toFixed(2)
    };
  }
}
