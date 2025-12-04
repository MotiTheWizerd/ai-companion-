/**
 * Semantix Sidebar Widget Constants
 * Provider-specific selectors and configuration for the sidebar section
 */

// GPT-specific sidebar selectors
export const GPT_SELECTORS = {
  // Main sidebar aside container
  SIDEBAR_ASIDE: [
    'aside[class*="sidebar-section"]',
    "aside.sticky",
    "nav aside",
    "aside",
  ],
  // Individual sidebar sections (GPTs, Projects, Your Chats)
  SIDEBAR_SECTION: 'aside > div[class*="pb-"]',
  // Section header items
  SECTION_HEADER: '[data-sidebar-item="true"]',
  // Nav container
  SIDEBAR_NAV: 'nav[aria-label="Chat history"]',

  // Chat header actions (Share, Add people, etc.)
  CHAT_HEADER_ACTIONS: [
    "#conversation-header-actions",
    '.flex.items-center.gap-2:has([data-testid="share-chat-button"])',
    '.flex.items-center:has([aria-label="Share"])',
  ],
  // Share button for reference
  SHARE_BUTTON: '[data-testid="share-chat-button"]',
};

// Widget configuration
export const CONFIG = {
  // Unique ID for the Semantix section
  SECTION_ID: "semantix-sidebar-section",

  // Class prefix for all widget elements
  CLASS_PREFIX: "semantix-sidebar",

  // Default collapsed state
  DEFAULT_COLLAPSED: false,

  // Storage key for collapsed state
  STORAGE_KEY: "semantix_sidebar_collapsed",

  // Animation duration (ms)
  ANIMATION_DURATION: 200,

  // Debounce delay for mutation observer (ms)
  DEBOUNCE_DELAY: 100,

  // Max retry attempts for injection
  MAX_RETRIES: 10,

  // Retry interval (ms)
  RETRY_INTERVAL: 500,
};

// Menu items for the Semantix section
export const MENU_ITEMS = [
  {
    id: "favorites",
    label: "Favorites",
    icon: "star",
    action: "openFavorites",
  },
];

// SVG icons for menu items
export const ICONS = {
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

  starFilled: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

  chevronRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,

  chevronDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,

  semantix: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
};

// CSS classes for different states
export const CLASSES = {
  SECTION: "semantix-sidebar-section",
  HEADER: "semantix-sidebar-header",
  HEADER_CONTENT: "semantix-sidebar-header-content",
  TITLE: "semantix-sidebar-title",
  CHEVRON: "semantix-sidebar-chevron",
  MENU: "semantix-sidebar-menu",
  MENU_ITEM: "semantix-sidebar-menu-item",
  MENU_ICON: "semantix-sidebar-menu-icon",
  MENU_LABEL: "semantix-sidebar-menu-label",
  COLLAPSED: "semantix-sidebar--collapsed",
  EXPANDED: "semantix-sidebar--expanded",
  // Favorite button classes
  FAVORITE_BTN: "semantix-favorite-btn",
  FAVORITE_BTN_ACTIVE: "semantix-favorite-btn--active",
};
