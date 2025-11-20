/**
 * Controls the display of user messages, specifically handling memory blocks.
 */
export class UserMessageController {
  constructor() {
    this.observer = null;
    this.processedNodes = new WeakSet();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    console.log('[UserMessageController] Initialized');
    this.startObserver();
    this.isInitialized = true;
  }

  startObserver() {
    console.log('[UserMessageController] Starting MutationObserver...');
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForMemoryBlocks(node);
            }
          });
        } else if (mutation.type === 'characterData') {
          // Handle text updates in existing nodes
          this.scanForMemoryBlocks(mutation.target.parentElement);
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial scan
    this.scanForMemoryBlocks(document.body);
  }

  scanForMemoryBlocks(rootNode) {
    if (!rootNode) return;

    // Look for elements that might contain the memory block text
    // We target specific message containers to avoid scanning everything
    // ChatGPT user messages usually have specific classes, but searching for text is safer initially

    // Using a TreeWalker for efficient text node traversal
    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes('[semantix-memory-block]')) {
        // Found a text node with the block. 
        // We need to operate on its parent element to replace HTML.
        this.processMemoryBlock(node.parentElement);
      }
    }
  }

  processMemoryBlock(element) {
    if (!element || this.processedNodes.has(element)) return;

    const content = element.innerHTML;
    const startTag = '[semantix-memory-block]';
    const endTag = '[semantix-end-memory-block]';

    if (!content.includes(startTag) || !content.includes(endTag)) return;

    console.log('[UserMessageController] Found potential memory block in:', element);

    // Mark as processed to avoid infinite loops if we modify DOM
    this.processedNodes.add(element);

    // Regex to capture the block
    // We use a non-greedy match for the content
    const regex = /\[semantix-memory-block\]([\s\S]*?)\[semantix-end-memory-block\]/g;

    const newContent = content.replace(regex, (match, memoryContent) => {
      // Create unique ID for this block
      const id = `memory-${Math.random().toString(36).substr(2, 9)}`;
      console.log('[UserMessageController] Creating collapsible block with ID:', id);

      return `
        <div class="semantix-memory-container collapsed" id="${id}">
          <div class="semantix-memory-header" onclick="document.getElementById('${id}').classList.toggle('collapsed')">
            Memory Context
            <span class="semantix-memory-toggle-icon">▼</span>
          </div>
          <div class="semantix-memory-content">${this.escapeHtml(memoryContent.trim())}</div>
        </div>
      `;
    });

    if (newContent !== content) {
      element.innerHTML = newContent;
      console.log('[UserMessageController] Transformed memory block successfully');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
