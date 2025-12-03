import { GPT_SELECTORS, CONFIG, MESSAGE_ROLES } from "./constants.js";

// GPT scroll container selector
const SCROLL_CONTAINER_SELECTOR =
  'main .overflow-y-auto, main [class*="overflow-y-auto"], main';

/**
 * QuickJump Widget
 * Vertical navigation bar with dots for jumping between messages
 */

const PANEL_STYLES = `
.semantix-quickjump {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;

  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  z-index: 99998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.semantix-quickjump--visible {
  opacity: .8;
  pointer-events: auto;
}

.semantix-quickjump__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  padding: 0;
  opacity: 0.4;
  transition:
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease,
    box-shadow 0.25s ease,
    width 0.2s ease,
    height 0.2s ease;
}

/* User message - soft warm tone */
.semantix-quickjump__dot--user {
  background: linear-gradient(135deg, #a8b4a5 0%, #8a9a87 100%);
  box-shadow: 0 0 0 0 rgba(168, 180, 165, 0);
}

/* Assistant message - soft cool tone */
.semantix-quickjump__dot--assistant {
  background: linear-gradient(135deg, #9ca3af 0%, #7a8290 100%);
  box-shadow: 0 0 0 0 rgba(156, 163, 175, 0);
}

/* Hover state - gentle bloom */
.semantix-quickjump__dot:hover {
  opacity: 0.9;
  transform: scale(1.6);
}

.semantix-quickjump__dot--user:hover {
  box-shadow: 0 0 8px 2px rgba(168, 180, 165, 0.3);
}

.semantix-quickjump__dot--assistant:hover {
  box-shadow: 0 0 8px 2px rgba(156, 163, 175, 0.3);
}

/* Active state - soft glow ring */
.semantix-quickjump__dot--active {
  opacity: 1;
  transform: scale(1.4);
  width: 8px;
  height: 8px;
}

.semantix-quickjump__dot--active.semantix-quickjump__dot--user {
  box-shadow:
    0 0 0 3px rgba(168, 180, 165, 0.15),
    0 0 12px 2px rgba(168, 180, 165, 0.25);
}

.semantix-quickjump__dot--active.semantix-quickjump__dot--assistant {
  box-shadow:
    0 0 0 3px rgba(156, 163, 175, 0.15),
    0 0 12px 2px rgba(156, 163, 175, 0.25);
}

/* Subtle container hover - reveal dots more */
.semantix-quickjump:hover .semantix-quickjump__dot {
  opacity: 0.6;
}

.semantix-quickjump:hover .semantix-quickjump__dot--active {
  opacity: 1;
}
`;

export class QuickJumpWidget {
  constructor(options = {}) {
    console.log("[QuickJumpWidget] Constructor called");
    this.documentRef = options.document || document;
    this.maxDots = options.maxDots || CONFIG.MAX_DOTS;
    this.panelElement = null;
    this.messages = [];
    this.dots = [];
    this.activeIndex = -1;
    this.observer = null;
    this.stylesInjected = false;
    this.isVisible = false;
  }

  /**
   * Initialize and attach widget to DOM
   */
  attach() {
    console.log("[QuickJumpWidget] attach() called");
    if (this.panelElement) {
      console.log("[QuickJumpWidget] Panel already exists, skipping");
      return this.panelElement;
    }

    this.injectStyles();
    console.log("[QuickJumpWidget] Styles injected");

    this.panelElement = this.createPanel();
    this.documentRef.body.appendChild(this.panelElement);
    console.log("[QuickJumpWidget] Panel appended to body");

    // Initial scan and render
    this.scan();
    this.render();

    // Start observing for new messages
    this.observe();

    return this.panelElement;
  }

  /**
   * Create the panel container
   */
  createPanel() {
    const panel = this.documentRef.createElement("div");
    panel.className = "semantix-quickjump";
    panel.setAttribute("role", "navigation");
    panel.setAttribute("aria-label", "Message quick jump");
    return panel;
  }

  /**
   * Scan DOM for messages
   */
  scan() {
    console.log(
      "[QuickJumpWidget] scan() - Looking for:",
      GPT_SELECTORS.ALL_MESSAGES,
    );
    const allMessages = Array.from(
      this.documentRef.querySelectorAll(GPT_SELECTORS.ALL_MESSAGES),
    );
    console.log("[QuickJumpWidget] Found messages:", allMessages.length);

    // Limit to max dots (take most recent if over limit)
    if (allMessages.length > this.maxDots) {
      this.messages = allMessages.slice(-this.maxDots);
    } else {
      this.messages = allMessages;
    }

    return this.messages;
  }

  /**
   * Render dots based on scanned messages
   */
  render() {
    console.log(
      "[QuickJumpWidget] render() - Messages to render:",
      this.messages.length,
    );
    if (!this.panelElement) {
      console.log("[QuickJumpWidget] No panel element, skipping render");
      return;
    }

    // Clear existing dots
    this.panelElement.innerHTML = "";
    this.dots = [];

    if (this.messages.length === 0) {
      console.log("[QuickJumpWidget] No messages, hiding widget");
      this.hide();
      return;
    }

    this.messages.forEach((message, index) => {
      const role = message.getAttribute("data-message-author-role");
      const dot = this.createDot(index, role);
      this.panelElement.appendChild(dot);
      this.dots.push(dot);
    });

    console.log(
      "[QuickJumpWidget] Rendered",
      this.dots.length,
      "dots, calling show()",
    );
    this.show();
  }

  /**
   * Create a single dot element
   */
  createDot(index, role) {
    const dot = this.documentRef.createElement("button");
    dot.type = "button";
    dot.className = `semantix-quickjump__dot semantix-quickjump__dot--${role}`;
    dot.setAttribute("aria-label", `Jump to ${role} message ${index + 1}`);
    dot.setAttribute("data-index", index);

    dot.addEventListener("click", () => {
      this.scrollToMessage(index);
    });

    return dot;
  }

  /**
   * Scroll to a specific message with smooth animation
   */
  scrollToMessage(index) {
    const message = this.messages[index];
    if (!message) return;

    console.log("[QuickJumpWidget] Scrolling to message", index);

    // Find the scroll container (GPT uses a custom scrollable div)
    const scrollContainer = this.findScrollContainer(message);

    if (scrollContainer) {
      // Calculate target scroll position (center message in viewport)
      const containerRect = scrollContainer.getBoundingClientRect();
      const messageRect = message.getBoundingClientRect();
      const currentScrollTop = scrollContainer.scrollTop;

      // Target: put message in center of container
      const targetScrollTop =
        currentScrollTop +
        (messageRect.top - containerRect.top) -
        containerRect.height / 2 +
        messageRect.height / 2;

      // Smooth scroll with custom animation
      this.smoothScrollTo(scrollContainer, targetScrollTop, 400);
    } else {
      // Fallback to native scrollIntoView
      message.scrollIntoView({
        behavior: CONFIG.SCROLL_BEHAVIOR,
        block: CONFIG.SCROLL_BLOCK,
      });
    }

    this.setActive(index);
  }

  /**
   * Find the scrollable container for a message
   */
  findScrollContainer(element) {
    // Try to find GPT's scroll container
    const containers = this.documentRef.querySelectorAll(
      SCROLL_CONTAINER_SELECTOR,
    );

    for (const container of containers) {
      if (
        container.contains(element) &&
        container.scrollHeight > container.clientHeight
      ) {
        return container;
      }
    }

    // Fallback: walk up the DOM to find scrollable parent
    let parent = element.parentElement;
    while (parent && parent !== this.documentRef.body) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * Custom smooth scroll animation
   */
  smoothScrollTo(container, targetScrollTop, duration = 400) {
    const startScrollTop = container.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const startTime = performance.now();

    // Clamp target to valid range
    const maxScroll = container.scrollHeight - container.clientHeight;
    const clampedTarget = Math.max(0, Math.min(targetScrollTop, maxScroll));
    const clampedDistance = clampedTarget - startScrollTop;

    // Easing function (ease-out cubic)
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      container.scrollTop = startScrollTop + clampedDistance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }

  /**
   * Set active dot
   */
  setActive(index) {
    // Remove active from previous
    if (this.activeIndex >= 0 && this.dots[this.activeIndex]) {
      this.dots[this.activeIndex].classList.remove(
        "semantix-quickjump__dot--active",
      );
    }

    // Set new active
    this.activeIndex = index;
    if (this.dots[index]) {
      this.dots[index].classList.add("semantix-quickjump__dot--active");
    }
  }

  /**
   * Start observing DOM for new messages
   */
  observe() {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if added node or its children contain messages
              if (
                node.matches?.(GPT_SELECTORS.ALL_MESSAGES) ||
                node.querySelector?.(GPT_SELECTORS.ALL_MESSAGES)
              ) {
                shouldRescan = true;
                break;
              }
            }
          }
        }
        if (shouldRescan) break;
      }

      if (shouldRescan) {
        this.scan();
        this.render();
      }
    });

    this.observer.observe(this.documentRef.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Show the widget
   */
  show() {
    console.log("[QuickJumpWidget] show() called");
    if (!this.panelElement) return;
    this.panelElement.classList.add("semantix-quickjump--visible");
    this.isVisible = true;
    console.log("[QuickJumpWidget] Widget is now visible");
  }

  /**
   * Hide the widget
   */
  hide() {
    if (!this.panelElement) return;
    this.panelElement.classList.remove("semantix-quickjump--visible");
    this.isVisible = false;
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Refresh - rescan and re-render
   */
  refresh() {
    this.scan();
    this.render();
  }

  /**
   * Cleanup and destroy widget
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.remove();
    }

    this.panelElement = null;
    this.messages = [];
    this.dots = [];
    this.activeIndex = -1;
    this.isVisible = false;
  }

  /**
   * Inject styles into document head
   */
  injectStyles() {
    if (this.stylesInjected) return;

    const styleId = "semantix-quickjump-styles";
    if (this.documentRef.getElementById(styleId)) {
      this.stylesInjected = true;
      return;
    }

    const styleEl = this.documentRef.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = PANEL_STYLES;
    this.documentRef.head.appendChild(styleEl);
    this.stylesInjected = true;
  }
}
