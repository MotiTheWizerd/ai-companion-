import {
  GPT_SELECTORS,
  CONFIG,
  SLOT_STATES,
  SLOT_CLASSES,
} from "./constants.js";

/**
 * ReflectionSlot Widget
 * Observes for new assistant message blocks and injects a reflection-slot container
 * before each one. These slots can later be populated with reflection/analysis UI.
 */

const SLOT_STYLES = `
.reflection-slot {
  width: 100%;
  min-height: 0;
  overflow: hidden;
  transition: all ${CONFIG.ANIMATION_DURATION}ms ease-out;
  box-sizing: border-box;
}

.reflection-slot--empty {
  /* Empty state - visible for debugging, will be hidden in production */
  min-height: 32px;
  padding: 8px 12px;
  opacity: 1;
  background: rgba(100, 200, 255, 0.08);
  border: 1px dashed rgba(100, 200, 255, 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: rgba(100, 200, 255, 0.6);
}

.reflection-slot--empty::before {
  content: '🔮 Reflection Slot';
}

.reflection-slot--loading {
  min-height: 40px;
  padding: 12px 16px;
  opacity: 1;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin-bottom: 8px;
}

.reflection-slot--ready {
  min-height: 40px;
  padding: 12px 16px;
  opacity: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.reflection-slot--error {
  min-height: 32px;
  padding: 8px 12px;
  opacity: 0.7;
  background: rgba(255, 100, 100, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
}

.reflection-slot--hidden {
  display: none !important;
}

/* Loading spinner animation */
.reflection-slot__loader {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.reflection-slot__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: reflection-slot-spin 0.8s linear infinite;
}

@keyframes reflection-slot-spin {
  to {
    transform: rotate(360deg);
  }
}
`;

export class ReflectionSlotWidget {
  constructor(options = {}) {
    console.log("[ReflectionSlotWidget] Constructor called");
    this.documentRef = options.document || document;
    this.debounceDelay = options.debounceDelay || CONFIG.DEBOUNCE_DELAY;

    // Track injected slots by message ID
    this.slots = new Map(); // messageId -> slotElement

    this.observer = null;
    this.debounceTimer = null;
    this.stylesInjected = false;
    this.isAttached = false;

    // Callbacks for external integration
    this.onSlotCreated = options.onSlotCreated || null;
    this.onSlotRemoved = options.onSlotRemoved || null;
  }

  /**
   * Initialize and attach widget - start observing
   */
  attach() {
    console.log("[ReflectionSlotWidget] attach() called");

    if (this.isAttached) {
      console.log("[ReflectionSlotWidget] Already attached, skipping");
      return this;
    }

    this.injectStyles();
    console.log("[ReflectionSlotWidget] Styles injected");

    // Initial scan for existing assistant messages
    this.scanAndInject();

    // Start observing for new messages
    this.observe();

    this.isAttached = true;
    console.log("[ReflectionSlotWidget] Attached successfully");

    return this;
  }

  /**
   * Scan DOM for assistant messages and inject slots
   */
  scanAndInject() {
    console.log("[ReflectionSlotWidget] scanAndInject() called");

    const assistantMessages = this.documentRef.querySelectorAll(
      GPT_SELECTORS.ASSISTANT_MESSAGE,
    );

    console.log(
      "[ReflectionSlotWidget] Found assistant messages:",
      assistantMessages.length,
    );

    assistantMessages.forEach((message) => {
      this.injectSlotForMessage(message);
    });
  }

  /**
   * Inject a reflection slot before an assistant message
   */
  injectSlotForMessage(messageElement) {
    // Get message ID for tracking
    const messageId = messageElement.getAttribute(
      GPT_SELECTORS.MESSAGE_ID_ATTR,
    );

    if (!messageId) {
      console.warn("[ReflectionSlotWidget] Message has no ID, generating one");
    }

    const trackingId = messageId || this.generateId();

    // Check if already processed
    if (messageElement.hasAttribute(CONFIG.PROCESSED_ATTR)) {
      return null;
    }

    // Check if we already have a slot for this message
    if (this.slots.has(trackingId)) {
      return this.slots.get(trackingId);
    }

    // Create the slot container
    const slot = this.createSlot(trackingId);

    // Insert BEFORE the assistant message (as previous sibling)
    const parent = messageElement.parentNode;
    if (parent) {
      parent.insertBefore(slot, messageElement);

      // Mark message as processed
      messageElement.setAttribute(CONFIG.PROCESSED_ATTR, "true");

      // Track the slot
      this.slots.set(trackingId, slot);

      console.log(
        "[ReflectionSlotWidget] Injected slot for message:",
        trackingId,
      );

      // Trigger callback if provided
      if (this.onSlotCreated) {
        this.onSlotCreated({
          slotElement: slot,
          messageElement: messageElement,
          messageId: trackingId,
        });
      }

      return slot;
    }

    return null;
  }

  /**
   * Create a slot container element
   */
  createSlot(messageId) {
    const slot = this.documentRef.createElement("div");
    slot.className = `${SLOT_CLASSES.BASE} ${SLOT_CLASSES.EMPTY}`;
    slot.setAttribute("data-reflection-message-id", messageId);
    slot.setAttribute("role", "complementary");
    slot.setAttribute("aria-label", "Reflection content for assistant message");

    return slot;
  }

  /**
   * Generate a unique ID for messages without one
   */
  generateId() {
    return `reflection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start observing DOM for new assistant messages
   */
  observe() {
    if (this.observer) {
      console.log("[ReflectionSlotWidget] Observer already active");
      return;
    }

    console.log("[ReflectionSlotWidget] Starting MutationObserver");

    this.observer = new MutationObserver((mutations) => {
      // Debounce to avoid excessive processing
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.handleMutations(mutations);
      }, this.debounceDelay);
    });

    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Handle DOM mutations - look for new assistant messages
   */
  handleMutations(mutations) {
    let foundNewMessages = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node IS an assistant message
            if (this.isAssistantMessage(node)) {
              this.injectSlotForMessage(node);
              foundNewMessages = true;
            }

            // Check if the added node CONTAINS assistant messages
            const nestedMessages = node.querySelectorAll?.(
              GPT_SELECTORS.ASSISTANT_MESSAGE,
            );

            if (nestedMessages && nestedMessages.length > 0) {
              nestedMessages.forEach((msg) => {
                this.injectSlotForMessage(msg);
              });
              foundNewMessages = true;
            }
          }
        }
      }
    }

    if (foundNewMessages) {
      console.log("[ReflectionSlotWidget] Processed new assistant messages");
    }
  }

  /**
   * Check if an element is an assistant message
   */
  isAssistantMessage(element) {
    return element.matches?.(GPT_SELECTORS.ASSISTANT_MESSAGE);
  }

  /**
   * Get a slot by message ID
   */
  getSlot(messageId) {
    return this.slots.get(messageId) || null;
  }

  /**
   * Get all slots
   */
  getAllSlots() {
    return Array.from(this.slots.values());
  }

  /**
   * Get slot count
   */
  getSlotCount() {
    return this.slots.size;
  }

  /**
   * Set content in a specific slot
   */
  setSlotContent(messageId, content, state = SLOT_STATES.READY) {
    const slot = this.slots.get(messageId);
    if (!slot) {
      console.warn(
        "[ReflectionSlotWidget] Slot not found for message:",
        messageId,
      );
      return false;
    }

    // Update slot state
    this.setSlotState(slot, state);

    // Set content
    if (typeof content === "string") {
      slot.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      slot.innerHTML = "";
      slot.appendChild(content);
    }

    return true;
  }

  /**
   * Set slot state (empty, loading, ready, error)
   */
  setSlotState(slot, state) {
    // Remove all state classes
    Object.values(SLOT_CLASSES).forEach((cls) => {
      if (cls !== SLOT_CLASSES.BASE) {
        slot.classList.remove(cls);
      }
    });

    // Add new state class
    switch (state) {
      case SLOT_STATES.EMPTY:
        slot.classList.add(SLOT_CLASSES.EMPTY);
        break;
      case SLOT_STATES.LOADING:
        slot.classList.add(SLOT_CLASSES.LOADING);
        break;
      case SLOT_STATES.READY:
        slot.classList.add(SLOT_CLASSES.READY);
        break;
      case SLOT_STATES.ERROR:
        slot.classList.add(SLOT_CLASSES.ERROR);
        break;
    }
  }

  /**
   * Show loading state in a slot
   */
  setSlotLoading(messageId, text = "Processing...") {
    const slot = this.slots.get(messageId);
    if (!slot) return false;

    this.setSlotState(slot, SLOT_STATES.LOADING);
    slot.innerHTML = `
      <div class="reflection-slot__loader">
        <div class="reflection-slot__spinner"></div>
        <span>${text}</span>
      </div>
    `;

    return true;
  }

  /**
   * Clear a slot's content
   */
  clearSlot(messageId) {
    const slot = this.slots.get(messageId);
    if (!slot) return false;

    slot.innerHTML = "";
    this.setSlotState(slot, SLOT_STATES.EMPTY);

    return true;
  }

  /**
   * Hide a slot
   */
  hideSlot(messageId) {
    const slot = this.slots.get(messageId);
    if (!slot) return false;

    slot.classList.add(SLOT_CLASSES.HIDDEN);
    return true;
  }

  /**
   * Show a slot
   */
  showSlot(messageId) {
    const slot = this.slots.get(messageId);
    if (!slot) return false;

    slot.classList.remove(SLOT_CLASSES.HIDDEN);
    return true;
  }

  /**
   * Remove a specific slot
   */
  removeSlot(messageId) {
    const slot = this.slots.get(messageId);
    if (!slot) return false;

    // Find and unmark the associated message
    const message = this.documentRef.querySelector(
      `[${GPT_SELECTORS.MESSAGE_ID_ATTR}="${messageId}"]`,
    );
    if (message) {
      message.removeAttribute(CONFIG.PROCESSED_ATTR);
    }

    // Remove from DOM
    if (slot.parentNode) {
      slot.remove();
    }

    // Remove from tracking
    this.slots.delete(messageId);

    // Trigger callback
    if (this.onSlotRemoved) {
      this.onSlotRemoved({ messageId });
    }

    console.log("[ReflectionSlotWidget] Removed slot for message:", messageId);
    return true;
  }

  /**
   * Refresh - rescan and inject any missing slots
   */
  refresh() {
    console.log("[ReflectionSlotWidget] refresh() called");
    this.scanAndInject();
  }

  /**
   * Cleanup and destroy widget
   */
  destroy() {
    console.log("[ReflectionSlotWidget] destroy() called");

    // Stop observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Remove all slots from DOM
    this.slots.forEach((slot, messageId) => {
      // Unmark the associated message
      const message = this.documentRef.querySelector(
        `[${GPT_SELECTORS.MESSAGE_ID_ATTR}="${messageId}"]`,
      );
      if (message) {
        message.removeAttribute(CONFIG.PROCESSED_ATTR);
      }

      // Remove slot element
      if (slot.parentNode) {
        slot.remove();
      }
    });

    // Clear tracking
    this.slots.clear();
    this.isAttached = false;

    console.log("[ReflectionSlotWidget] Destroyed");
  }

  /**
   * Inject styles into document head
   */
  injectStyles() {
    if (this.stylesInjected) return;

    const styleId = "semantix-reflection-slot-styles";
    if (this.documentRef.getElementById(styleId)) {
      this.stylesInjected = true;
      return;
    }

    const styleEl = this.documentRef.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = SLOT_STYLES;
    this.documentRef.head.appendChild(styleEl);
    this.stylesInjected = true;
  }
}

// Export states and classes for external use
export { SLOT_STATES, SLOT_CLASSES };
