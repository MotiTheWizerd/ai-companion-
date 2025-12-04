/**
 * ChatHistorySelector
 * Reusable component for interacting with ChatGPT's chat history sidebar
 * Provides methods to query, observe, and interact with chat items
 */

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS - ChatGPT specific
// ═══════════════════════════════════════════════════════════════════════════

export const CHAT_HISTORY_SELECTORS = {
  // Container
  HISTORY_CONTAINER: '#history, div[id="history"]',

  // Chat items
  ALL_CHATS: 'a[data-sidebar-item="true"]',
  ACTIVE_CHAT: 'a[data-sidebar-item="true"][data-active]',
  INACTIVE_CHATS: 'a[data-sidebar-item="true"]:not([data-active])',

  // Attributes
  ACTIVE_ATTR: "data-active",
  SIDEBAR_ITEM_ATTR: "data-sidebar-item",

  // Chat item internals
  CHAT_TITLE: ".truncate span, .truncate",
  CHAT_TRAILING: ".trailing-pair, [class*='trailing']",
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAT ITEM CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents a single chat item in the history
 */
export class ChatItem {
  constructor(element) {
    this.element = element;
  }

  /**
   * Get the conversation ID from href
   * @returns {string|null}
   */
  getConversationId() {
    const href = this.element?.getAttribute("href");
    if (!href) return null;
    const match = href.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get the chat title
   * @returns {string|null}
   */
  getTitle() {
    const titleEl = this.element?.querySelector(CHAT_HISTORY_SELECTORS.CHAT_TITLE);
    return titleEl?.textContent?.trim() || null;
  }

  /**
   * Check if this chat is currently active/selected
   * @returns {boolean}
   */
  isActive() {
    return this.element?.hasAttribute(CHAT_HISTORY_SELECTORS.ACTIVE_ATTR) || false;
  }

  /**
   * Get the href/URL of the chat
   * @returns {string|null}
   */
  getHref() {
    return this.element?.getAttribute("href") || null;
  }

  /**
   * Get the trailing actions container (for injecting buttons)
   * @returns {Element|null}
   */
  getTrailingContainer() {
    return this.element?.querySelector(CHAT_HISTORY_SELECTORS.CHAT_TRAILING) || null;
  }

  /**
   * Get the raw DOM element
   * @returns {Element}
   */
  getElement() {
    return this.element;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      conversationId: this.getConversationId(),
      title: this.getTitle(),
      isActive: this.isActive(),
      href: this.getHref(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SELECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ChatHistorySelector
 * Query and observe chat history items
 */
export class ChatHistorySelector {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.windowRef = options.window || window;
    this.observer = null;
    this.listeners = new Map();

    // Callbacks
    this.onChatAdded = options.onChatAdded || null;
    this.onChatRemoved = options.onChatRemoved || null;
    this.onActiveChatChanged = options.onActiveChatChanged || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the history container element
   * @returns {Element|null}
   */
  getHistoryContainer() {
    return this.documentRef.querySelector(CHAT_HISTORY_SELECTORS.HISTORY_CONTAINER);
  }

  /**
   * Get all chat items
   * @returns {ChatItem[]}
   */
  getAllChats() {
    const elements = this.documentRef.querySelectorAll(CHAT_HISTORY_SELECTORS.ALL_CHATS);
    return Array.from(elements).map((el) => new ChatItem(el));
  }

  /**
   * Get the currently active chat
   * @returns {ChatItem|null}
   */
  getActiveChat() {
    const element = this.documentRef.querySelector(CHAT_HISTORY_SELECTORS.ACTIVE_CHAT);
    return element ? new ChatItem(element) : null;
  }

  /**
   * Get all inactive chats
   * @returns {ChatItem[]}
   */
  getInactiveChats() {
    const elements = this.documentRef.querySelectorAll(CHAT_HISTORY_SELECTORS.INACTIVE_CHATS);
    return Array.from(elements).map((el) => new ChatItem(el));
  }

  /**
   * Find a chat by conversation ID
   * @param {string} conversationId
   * @returns {ChatItem|null}
   */
  findChatById(conversationId) {
    if (!conversationId) return null;

    const allChats = this.getAllChats();
    return allChats.find((chat) => chat.getConversationId() === conversationId) || null;
  }

  /**
   * Find chats by title (partial match)
   * @param {string} titleQuery
   * @returns {ChatItem[]}
   */
  findChatsByTitle(titleQuery) {
    if (!titleQuery) return [];

    const query = titleQuery.toLowerCase();
    const allChats = this.getAllChats();
    return allChats.filter((chat) => {
      const title = chat.getTitle();
      return title && title.toLowerCase().includes(query);
    });
  }

  /**
   * Get the current conversation ID from URL
   * @returns {string|null}
   */
  getCurrentConversationIdFromURL() {
    const match = this.windowRef.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if history container exists
   * @returns {boolean}
   */
  isHistoryLoaded() {
    return !!this.getHistoryContainer();
  }

  /**
   * Get chat count
   * @returns {number}
   */
  getChatCount() {
    return this.getAllChats().length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBSERVATION METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start observing chat history for changes
   */
  startObserving() {
    if (this.observer) {
      console.log("[ChatHistorySelector] Already observing");
      return;
    }

    const container = this.getHistoryContainer();
    if (!container) {
      console.log("[ChatHistorySelector] History container not found, will retry...");
      // Retry after a delay
      setTimeout(() => this.startObserving(), 500);
      return;
    }

    let previousActiveId = this.getActiveChat()?.getConversationId();
    let previousChatIds = new Set(this.getAllChats().map((c) => c.getConversationId()));

    this.observer = new MutationObserver((mutations) => {
      // Check for active chat change
      const currentActiveId = this.getActiveChat()?.getConversationId();
      if (currentActiveId !== previousActiveId) {
        console.log("[ChatHistorySelector] Active chat changed:", previousActiveId, "->", currentActiveId);
        if (this.onActiveChatChanged) {
          this.onActiveChatChanged({
            previousId: previousActiveId,
            currentId: currentActiveId,
            chat: this.getActiveChat(),
          });
        }
        this.emit("activeChatChanged", {
          previousId: previousActiveId,
          currentId: currentActiveId,
          chat: this.getActiveChat(),
        });
        previousActiveId = currentActiveId;
      }

      // Check for added/removed chats
      const currentChatIds = new Set(this.getAllChats().map((c) => c.getConversationId()));

      // Find added chats
      for (const id of currentChatIds) {
        if (id && !previousChatIds.has(id)) {
          const chat = this.findChatById(id);
          console.log("[ChatHistorySelector] Chat added:", id);
          if (this.onChatAdded) {
            this.onChatAdded({ conversationId: id, chat });
          }
          this.emit("chatAdded", { conversationId: id, chat });
        }
      }

      // Find removed chats
      for (const id of previousChatIds) {
        if (id && !currentChatIds.has(id)) {
          console.log("[ChatHistorySelector] Chat removed:", id);
          if (this.onChatRemoved) {
            this.onChatRemoved({ conversationId: id });
          }
          this.emit("chatRemoved", { conversationId: id });
        }
      }

      previousChatIds = currentChatIds;
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CHAT_HISTORY_SELECTORS.ACTIVE_ATTR],
    });

    console.log("[ChatHistorySelector] Started observing chat history");
  }

  /**
   * Stop observing chat history
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log("[ChatHistorySelector] Stopped observing");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT EMITTER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ChatHistorySelector] Error in ${event} listener:`, error);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the selector and start observing
   */
  init() {
    console.log("[ChatHistorySelector] Initializing...");
    this.startObserving();
    console.log("[ChatHistorySelector] Initialized");
  }

  /**
   * Clean up and stop observing
   */
  destroy() {
    console.log("[ChatHistorySelector] Destroying...");
    this.stopObserving();
    this.listeners.clear();
    console.log("[ChatHistorySelector] Destroyed");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEBUG / UTILITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Log current state for debugging
   */
  debug() {
    const activeChat = this.getActiveChat();
    const allChats = this.getAllChats();

    console.group("[ChatHistorySelector] Debug Info");
    console.log("History loaded:", this.isHistoryLoaded());
    console.log("Total chats:", allChats.length);
    console.log("Active chat:", activeChat?.toObject() || null);
    console.log("Current URL conversation ID:", this.getCurrentConversationIdFromURL());
    console.log("All chats:", allChats.map((c) => c.toObject()));
    console.groupEnd();

    return {
      historyLoaded: this.isHistoryLoaded(),
      totalChats: allChats.length,
      activeChat: activeChat?.toObject() || null,
      currentUrlId: this.getCurrentConversationIdFromURL(),
      allChats: allChats.map((c) => c.toObject()),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create and initialize a ChatHistorySelector instance
 * @param {Object} options
 * @returns {ChatHistorySelector}
 */
export function createChatHistorySelector(options = {}) {
  const selector = new ChatHistorySelector(options);
  selector.init();
  return selector;
}

export default ChatHistorySelector;
