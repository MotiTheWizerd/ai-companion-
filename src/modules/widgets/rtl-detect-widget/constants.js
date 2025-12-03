/**
 * RTL Detect Widget Constants
 * Unicode ranges and configuration for RTL language detection
 */

// RTL Unicode Ranges
export const RTL_RANGES = {
  // Hebrew: U+0590 to U+05FF
  HEBREW: /[\u0590-\u05FF]/,

  // Arabic: U+0600 to U+06FF
  ARABIC: /[\u0600-\u06FF]/,

  // Arabic Supplement: U+0750 to U+077F
  ARABIC_SUPPLEMENT: /[\u0750-\u077F]/,

  // Arabic Extended-A: U+08A0 to U+08FF
  ARABIC_EXTENDED: /[\u08A0-\u08FF]/,
};

// Combined RTL detection pattern
export const RTL_PATTERN =
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// LTR pattern (basic Latin letters)
export const LTR_PATTERN = /[A-Za-z]/;

// GPT-specific selectors
export const GPT_SELECTORS = {
  INPUT: "#prompt-textarea",
  CONTENT_EDITABLE: '#prompt-textarea [contenteditable="true"]',
};

// Widget configuration
export const CONFIG = {
  // Debounce delay for input detection (ms)
  DEBOUNCE_DELAY: 50,

  // Default direction when input is empty
  DEFAULT_DIRECTION: "ltr",
};

// Direction values
export const DIRECTIONS = {
  RTL: "rtl",
  LTR: "ltr",
};
