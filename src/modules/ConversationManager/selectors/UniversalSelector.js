import { ClaudeSelector } from "./providers/ClaudeSelector.js";
import { ChatGPTSelector } from "./providers/ChatGPTSelector.js";

/**
 * Universal selector that delegates to the appropriate provider implementation
 */
export class UniversalSelector {
  constructor(providerName = "claude") {
    this.provider = this.getProviderSelector(providerName);
  }

  /**
   * Get the provider-specific selector instance
   * @param {string} name - Provider name
   */
  getProviderSelector(name) {
    switch (name.toLowerCase()) {
      case "claude":
        return new ClaudeSelector();
      case "chatgpt":
        return new ChatGPTSelector();
      default:
        console.warn(
          `[UniversalSelector] Unknown provider: ${name}, defaulting to Claude`,
        );
        return new ClaudeSelector();
    }
  }

  /**
   * Switch the active provider
   * @param {string} name - Provider name
   */
  setProvider(name) {
    this.provider = this.getProviderSelector(name);
  }

  /**
   * Get the toolbar selector
   * @returns {string} CSS selector
   */
  getToolbar() {
    return this.provider.getToolbar();
  }

  /**
   * Get the toolbar insertion position
   * @returns {string} 'after', 'before', 'append', 'prepend'
   */
  getToolbarPosition() {
    return this.provider.getToolbarPosition
      ? this.provider.getToolbarPosition()
      : "append";
  }

  /**
   * Get widget container selector (if supported)
   * @returns {string|null}
   */
  getWidgetContainer() {
    return this.provider.getWidgetContainer
      ? this.provider.getWidgetContainer()
      : null;
  }

  /**
   * Preferred insertion position for widgets
   * @returns {string}
   */
  getWidgetPosition() {
    return this.provider.getWidgetPosition
      ? this.provider.getWidgetPosition()
      : "append";
  }

  /**
   * Get the input selector
   * @returns {string} CSS selector
   */
  getInput() {
    return this.provider.getInput();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR SELECTORS - For Semantix sidebar section injection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the sidebar aside element selector
   * @returns {string|string[]|null} CSS selector(s)
   */
  getSidebarAside() {
    return this.provider.getSidebarAside
      ? this.provider.getSidebarAside()
      : null;
  }

  /**
   * Get the insertion position for sidebar sections
   * @returns {string} 'prepend' | 'append' | 'before' | 'after'
   */
  getSidebarPosition() {
    return this.provider.getSidebarPosition
      ? this.provider.getSidebarPosition()
      : "prepend";
  }

  /**
   * Get the selector for individual sidebar sections
   * @returns {string|null} CSS selector
   */
  getSidebarSection() {
    return this.provider.getSidebarSection
      ? this.provider.getSidebarSection()
      : null;
  }

  /**
   * Get the selector for sidebar section headers
   * @returns {string|null} CSS selector
   */
  getSidebarSectionHeader() {
    return this.provider.getSidebarSectionHeader
      ? this.provider.getSidebarSectionHeader()
      : null;
  }

  /**
   * Get the selector for the sidebar nav container
   * @returns {string|null} CSS selector
   */
  getSidebarNav() {
    return this.provider.getSidebarNav ? this.provider.getSidebarNav() : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HEADER SELECTORS - For favorite button injection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the selector for the chat header actions container
   * @returns {string|string[]|null} CSS selector(s)
   */
  getChatHeaderActions() {
    return this.provider.getChatHeaderActions
      ? this.provider.getChatHeaderActions()
      : null;
  }

  /**
   * Get the insertion position for header action buttons
   * @returns {string} 'prepend' | 'append' | 'before' | 'after'
   */
  getChatHeaderActionsPosition() {
    return this.provider.getChatHeaderActionsPosition
      ? this.provider.getChatHeaderActionsPosition()
      : "prepend";
  }

  /**
   * Get the selector for the share button
   * @returns {string|null} CSS selector
   */
  getShareButton() {
    return this.provider.getShareButton ? this.provider.getShareButton() : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY SELECTORS - For chat list items and favorites
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the selector for the chat history container
   * @returns {string|null} CSS selector
   */
  getChatHistoryContainer() {
    return this.provider.getChatHistoryContainer
      ? this.provider.getChatHistoryContainer()
      : null;
  }

  /**
   * Get the selector for all chat items
   * @returns {string|null} CSS selector
   */
  getChatItems() {
    return this.provider.getChatItems ? this.provider.getChatItems() : null;
  }

  /**
   * Get the selector for the active chat item
   * @returns {string|null} CSS selector
   */
  getActiveChatItem() {
    return this.provider.getActiveChatItem
      ? this.provider.getActiveChatItem()
      : null;
  }

  /**
   * Get the selector for inactive chat items
   * @returns {string|null} CSS selector
   */
  getInactiveChatItems() {
    return this.provider.getInactiveChatItems
      ? this.provider.getInactiveChatItems()
      : null;
  }

  /**
   * Get the attribute name that marks a chat as active
   * @returns {string|null} Attribute name
   */
  getActiveChatAttribute() {
    return this.provider.getActiveChatAttribute
      ? this.provider.getActiveChatAttribute()
      : null;
  }

  /**
   * Extract conversation ID from a chat element
   * @param {Element} chatElement - The chat link element
   * @returns {string|null} Conversation ID or null
   */
  extractConversationId(chatElement) {
    return this.provider.extractConversationId
      ? this.provider.extractConversationId(chatElement)
      : null;
  }

  /**
   * Get the selector for the chat title element
   * @returns {string|null} CSS selector
   */
  getChatTitle() {
    return this.provider.getChatTitle ? this.provider.getChatTitle() : null;
  }

  /**
   * Get the selector for chat trailing actions
   * @returns {string|null} CSS selector
   */
  getChatTrailingActions() {
    return this.provider.getChatTrailingActions
      ? this.provider.getChatTrailingActions()
      : null;
  }
}
