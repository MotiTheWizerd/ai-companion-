/**
 * ChatGPT-specific DOM selectors
 * Targets the ChatGPT web UI for injecting Semantix components
 */
export class ChatGPTSelector {
  constructor() {
    this.name = "chatgpt";
  }

  /**
   * Get the selector for the toolbar/injection area
   * Design choice: toolbar floats at the top, so we always target <body>
   * and let CSS keep it fixed/absolute in the viewport.
   * @returns {string} CSS selector
   */
  getToolbar() {
    return "body";
  }

  /**
   * Get how many parent levels to traverse before injecting
   * @returns {number} Number of parent levels to go up
   */
  getParentLevels() {
    return 0;
  }

  /**
   * Get the insertion position relative to the toolbar selector
   * @returns {string} 'after', 'before', 'append', 'prepend'
   */
  getToolbarPosition() {
    // Prepend to insert our element as the first child,
    // placing it above the composer input
    return "prepend";
  }

  /**
   * Get the selector for the input area (ProseMirror editor)
   * @returns {string} CSS selector
   */
  getInput() {
    return "#prompt-textarea";
  }

  /**
   * Get the selector for the composer container
   * @returns {string} CSS selector
   */
  getComposer() {
    return "div.bg-token-bg-primary";
  }

  /**
   * Target container for Semantix widgets (sits above composer)
   * @returns {string|null} CSS selector
   */
  getWidgetContainer() {
    return [
      "#thread-bottom .flex.justify-center.empty\\:hidden",
      "#thread-bottom .flex.justify-center",
      "#thread-bottom .text-base.mx-auto",
      "#thread-bottom",
    ];
  }

  /**
   * Preferred insertion strategy for widgets
   * @returns {string} 'append' | 'prepend' | 'before' | 'after'
   */
  getWidgetPosition() {
    return "prepend";
  }

  /**
   * Get the selector for the send button
   * @returns {string} CSS selector
   */
  getSendButton() {
    return 'button[data-testid="send-button"]';
  }

  /**
   * Get the selector for the attachment button
   * @returns {string} CSS selector
   */
  getAttachmentButton() {
    return "#composer-plus-btn";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR SELECTORS - For Semantix sidebar section injection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the selector for the sidebar aside element
   * This is the main container for sidebar sections (GPTs, Projects, Your Chats)
   * @returns {string|string[]} CSS selector(s)
   */
  getSidebarAside() {
    return [
      'aside[class*="sidebar-section"]',
      "aside.sticky",
      "nav aside",
      "aside",
    ];
  }

  /**
   * Get the insertion position for the Semantix sidebar section
   * @returns {string} 'prepend' to insert as first child
   */
  getSidebarPosition() {
    return "prepend";
  }

  /**
   * Get the selector for individual sidebar sections
   * Used to match the styling of existing sections
   * @returns {string} CSS selector
   */
  getSidebarSection() {
    return 'aside > div[class*="pb-"]';
  }

  /**
   * Get the selector for sidebar section headers (GPTs >, Projects >, etc.)
   * @returns {string} CSS selector
   */
  getSidebarSectionHeader() {
    return '[data-sidebar-item="true"]';
  }

  /**
   * Get the selector for the sidebar nav container (parent of aside)
   * @returns {string} CSS selector
   */
  getSidebarNav() {
    return 'nav[aria-label="Chat history"]';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY SELECTORS - For chat list items and favorites
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the selector for the chat history container
   * @returns {string} CSS selector
   */
  getChatHistoryContainer() {
    return '#history, div[id="history"]';
  }

  /**
   * Get the selector for all chat items in the sidebar
   * @returns {string} CSS selector
   */
  getChatItems() {
    return 'a[data-sidebar-item="true"]';
  }

  /**
   * Get the selector for the currently active/selected chat
   * @returns {string} CSS selector
   */
  getActiveChatItem() {
    return 'a[data-sidebar-item="true"][data-active]';
  }

  /**
   * Get the selector for non-active chat items
   * @returns {string} CSS selector
   */
  getInactiveChatItems() {
    return 'a[data-sidebar-item="true"]:not([data-active])';
  }

  /**
   * Get the attribute name that marks a chat as active
   * @returns {string} Attribute name
   */
  getActiveChatAttribute() {
    return "data-active";
  }

  /**
   * Get the attribute name for sidebar items
   * @returns {string} Attribute name
   */
  getSidebarItemAttribute() {
    return "data-sidebar-item";
  }

  /**
   * Extract conversation ID from a chat item element
   * @param {Element} chatElement - The chat link element
   * @returns {string|null} Conversation ID or null
   */
  extractConversationId(chatElement) {
    if (!chatElement) return null;
    const href = chatElement.getAttribute("href");
    if (!href) return null;
    const match = href.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get the selector for the chat title element within a chat item
   * @returns {string} CSS selector
   */
  getChatTitle() {
    return ".truncate span, .truncate";
  }

  /**
   * Get the selector for the trailing actions (menu, etc.) within a chat item
   * @returns {string} CSS selector
   */
  getChatTrailingActions() {
    return ".trailing-pair, [class*='trailing']";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HEADER SELECTORS - For favorite button injection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the selector for the chat header actions container
   * This is where Share, Add people, and menu buttons are located
   * @returns {string|string[]} CSS selector(s)
   */
  getChatHeaderActions() {
    return [
      "#conversation-header-actions",
      '.flex.items-center.gap-2:has([data-testid="share-chat-button"])',
      '.flex.items-center:has([aria-label="Share"])',
    ];
  }

  /**
   * Get the insertion position for the favorite button
   * @returns {string} 'prepend' to insert before Share button
   */
  getChatHeaderActionsPosition() {
    return "prepend";
  }

  /**
   * Get the selector for the share button (for reference/styling)
   * @returns {string} CSS selector
   */
  getShareButton() {
    return '[data-testid="share-chat-button"]';
  }
}
