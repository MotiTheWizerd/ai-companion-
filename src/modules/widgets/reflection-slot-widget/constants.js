/**
 * ReflectionSlot Widget Constants
 * Provider-specific selectors and configuration
 */

// GPT-specific message selectors
export const GPT_SELECTORS = {
  ASSISTANT_MESSAGE: '[data-message-author-role="assistant"]',
  USER_MESSAGE: '[data-message-author-role="user"]',
  ALL_MESSAGES: "[data-message-author-role]",
  MESSAGE_ID_ATTR: "data-message-id",
};

// Memory block tags
export const MEMORY_BLOCK = {
  START_TAG: "[semantix-memory-block]",
  END_TAG: "[semantix-end-memory-block]",
};

// Widget configuration
export const CONFIG = {
  // Slot container class name
  SLOT_CLASS: "reflection-slot",

  // Data attribute to mark processed messages
  PROCESSED_ATTR: "data-reflection-slot-injected",

  // Debounce delay for mutation observer (ms)
  DEBOUNCE_DELAY: 100,

  // Animation duration for slot appearance (ms)
  ANIMATION_DURATION: 300,
};

// Slot states
export const SLOT_STATES = {
  EMPTY: "empty",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

// CSS classes for different states
export const SLOT_CLASSES = {
  BASE: "reflection-slot",
  EMPTY: "reflection-slot--empty",
  LOADING: "reflection-slot--loading",
  READY: "reflection-slot--ready",
  ERROR: "reflection-slot--error",
  HIDDEN: "reflection-slot--hidden",
};

// Storage key for preferences (future use)
export const STORAGE_KEY = "semantix_reflection_slot_prefs";
