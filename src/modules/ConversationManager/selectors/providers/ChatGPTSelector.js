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
   * Targets .ProseMirror, then we navigate up via getParentLevels()
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
    return 4;
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
}
