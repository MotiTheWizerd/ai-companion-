/**
 * Storage utilities for UniversalChatHistory
 * Handles data persistence and retrieval
 */

export class StorageManager {
  constructor(storageKey = 'universal_chat_history') {
    this.storageKey = storageKey;
  }

  /**
   * Save data to storage
   * @param {Array} data - The data to save
   * @returns {boolean} True if successful, false otherwise
   */
  save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[StorageManager] Error saving data:', error);
      return false;
    }
  }

  /**
   * Load data from storage
   * @returns {Array} The loaded data or empty array if none exists
   */
  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[StorageManager] Error loading data:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   * @returns {boolean} True if successful, false otherwise
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('[StorageManager] Error clearing data:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Object containing storage info
   */
  getUsageInfo() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return {
        size: stored ? stored.length : 0,
        itemCount: stored ? JSON.parse(stored).length : 0,
        storageKey: this.storageKey
      };
    } catch (error) {
      console.error('[StorageManager] Error getting usage info:', error);
      return {
        size: 0,
        itemCount: 0,
        storageKey: this.storageKey
      };
    }
  }
}