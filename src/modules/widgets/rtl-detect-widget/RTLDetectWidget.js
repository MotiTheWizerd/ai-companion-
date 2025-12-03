import { RTL_PATTERN, LTR_PATTERN, GPT_SELECTORS, CONFIG, DIRECTIONS } from "./constants.js";

/**
 * RTL Detect Widget
 * Automatically detects Hebrew/Arabic text and switches input direction
 */
export class RTLDetectWidget {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.inputSelector = options.inputSelector || GPT_SELECTORS.INPUT;
    this.debounceDelay = options.debounceDelay || CONFIG.DEBOUNCE_DELAY;

    this.inputElement = null;
    this.currentDirection = CONFIG.DEFAULT_DIRECTION;
    this.debounceTimer = null;
    this.isAttached = false;

    // Bound handlers for cleanup
    this.handleInput = this.handleInput.bind(this);
  }

  /**
   * Initialize and attach to input element
   */
  attach() {
    if (this.isAttached) {
      console.log("[RTLDetectWidget] Already attached");
      return this;
    }

    this.inputElement = this.documentRef.querySelector(this.inputSelector);

    if (!this.inputElement) {
      console.warn("[RTLDetectWidget] Input element not found:", this.inputSelector);
      return this;
    }

    console.log("[RTLDetectWidget] Attaching to input element");

    // Listen for input events
    this.inputElement.addEventListener("input", this.handleInput);

    // Check initial content
    this.detectAndApply();

    this.isAttached = true;
    console.log("[RTLDetectWidget] Attached successfully");

    return this;
  }

  /**
   * Handle input event with debounce
   */
  handleInput() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.detectAndApply();
    }, this.debounceDelay);
  }

  /**
   * Detect direction and apply to input
   */
  detectAndApply() {
    const text = this.getText();
    const direction = this.detectDirection(text);

    if (direction !== this.currentDirection) {
      this.applyDirection(direction);
      this.currentDirection = direction;
      console.log("[RTLDetectWidget] Direction changed to:", direction);
    }
  }

  /**
   * Get text from input element
   */
  getText() {
    if (!this.inputElement) return "";

    // Handle both textarea and contenteditable
    if (this.inputElement.isContentEditable) {
      return this.inputElement.textContent || "";
    }

    return this.inputElement.value || this.inputElement.textContent || "";
  }

  /**
   * Detect direction based on first meaningful character
   */
  detectDirection(text) {
    if (!text || text.trim().length === 0) {
      return CONFIG.DEFAULT_DIRECTION;
    }

    // Strip whitespace and find first meaningful character
    const trimmed = text.trim();

    // Check character by character until we find a directional one
    for (const char of trimmed) {
      // Skip neutral characters (numbers, punctuation, spaces, emojis)
      if (this.isNeutralChar(char)) {
        continue;
      }

      // Check if RTL
      if (RTL_PATTERN.test(char)) {
        return DIRECTIONS.RTL;
      }

      // Check if LTR
      if (LTR_PATTERN.test(char)) {
        return DIRECTIONS.LTR;
      }
    }

    // Default if no directional characters found
    return CONFIG.DEFAULT_DIRECTION;
  }

  /**
   * Check if character is directionally neutral
   */
  isNeutralChar(char) {
    const code = char.charCodeAt(0);

    // Numbers 0-9
    if (code >= 0x30 && code <= 0x39) return true;

    // Common punctuation and symbols
    if (code <= 0x40) return true; // Space, !, ", #, $, etc.
    if (code >= 0x5B && code <= 0x60) return true; // [, \, ], ^, _, `
    if (code >= 0x7B && code <= 0x7F) return true; // {, |, }, ~

    // Emoji ranges (simplified check)
    if (code >= 0x1F000) return true;

    return false;
  }

  /**
   * Apply direction to input element
   */
  applyDirection(direction) {
    if (!this.inputElement) return;

    const isRTL = direction === DIRECTIONS.RTL;

    // Apply direction attribute
    this.inputElement.setAttribute("dir", direction);

    // Apply inline styles for better compatibility
    this.inputElement.style.direction = direction;
    this.inputElement.style.textAlign = isRTL ? "right" : "left";

    // Also try to apply to inner contenteditable if present (ProseMirror)
    const innerEditable = this.inputElement.querySelector('[contenteditable="true"]');
    if (innerEditable) {
      innerEditable.setAttribute("dir", direction);
      innerEditable.style.direction = direction;
      innerEditable.style.textAlign = isRTL ? "right" : "left";
    }

    // Apply to paragraphs inside (ProseMirror structure)
    const paragraphs = this.inputElement.querySelectorAll("p");
    paragraphs.forEach((p) => {
      p.setAttribute("dir", direction);
      p.style.direction = direction;
      p.style.textAlign = isRTL ? "right" : "left";
    });
  }

  /**
   * Manually set direction
   */
  setDirection(direction) {
    if (direction === DIRECTIONS.RTL || direction === DIRECTIONS.LTR) {
      this.applyDirection(direction);
      this.currentDirection = direction;
    }
  }

  /**
   * Get current direction
   */
  getDirection() {
    return this.currentDirection;
  }

  /**
   * Detach and cleanup
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.inputElement) {
      this.inputElement.removeEventListener("input", this.handleInput);
      // Reset to default direction
      this.applyDirection(CONFIG.DEFAULT_DIRECTION);
    }

    this.inputElement = null;
    this.isAttached = false;
    console.log("[RTLDetectWidget] Destroyed");
  }

  /**
   * Re-attach (useful after navigation)
   */
  reattach() {
    this.destroy();
    this.attach();
  }
}
