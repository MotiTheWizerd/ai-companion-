/**
 * QuickJump Widget Constants
 * Provider-specific selectors and configuration
 */

// GPT-specific message selectors
export const GPT_SELECTORS = {
  USER_MESSAGE: '[data-message-author-role="user"]',
  ASSISTANT_MESSAGE: '[data-message-author-role="assistant"]',
  ALL_MESSAGES: '[data-message-author-role]',
};

// Widget configuration
export const CONFIG = {
  MAX_DOTS: 20,
  DOT_SIZE: 8,
  DOT_GAP: 6,
  PANEL_PADDING: 8,
  SCROLL_BEHAVIOR: 'smooth',
  SCROLL_BLOCK: 'center',
};

// Role identifiers
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
};

// Storage key for preferences (future use)
export const STORAGE_KEY = 'semantix_quickjump_prefs';
