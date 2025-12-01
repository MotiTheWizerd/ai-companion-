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
   * Get the input selector
   * @returns {string} CSS selector
   */
  getInput() {
    return this.provider.getInput();
  }
}
