# UI Controls - Memory Block Transformation

## Overview

The UI Controls module enhances the user interface by transforming memory blocks injected into messages into interactive, collapsible UI elements. This provides a clean, user-friendly way to view context from previous conversations.

## Architecture

```
UIController
    └── UserMessageController
            ├── MutationObserver (detects DOM changes)
            ├── scanForMemoryBlocks() (finds memory blocks)
            ├── processMemoryBlock() (transforms to UI)
            └── toggleMemoryBlock() (expand/collapse)
```

## Files

- **Controller**: [UIController/index.js](../src/modules/UIControls/index.js)
- **User Message Controller**: [UserMessageController.js](../src/modules/UIControls/UserMessageController.js)
- **Styles**: [styles.css](../src/modules/UIControls/styles.css)

## UIController (Orchestrator)

**File**: [UIController/index.js](../src/modules/UIControls/index.js)

**Purpose**: Main entry point for UI enhancements.

```javascript
import { UserMessageController } from './UserMessageController.js';

export class UIController {
  constructor() {
    this.userMessageController = new UserMessageController();
  }

  init() {
    this.userMessageController.init();
  }
}
```

**Usage** (in [Application.js](../src/content/core/Application.js)):
```javascript
constructor() {
  // ... other managers ...
  this.uiController = new UIController();
}

init() {
  // ... other initializations ...
  this.uiController.init();
}
```

## UserMessageController

**File**: [UserMessageController.js](../src/modules/UIControls/UserMessageController.js)

### Purpose

Detect and transform memory blocks in user messages from plain text to interactive UI elements.

### Memory Block Format

**Input** (raw text):
```
[semantix-memory-block]
Based on your previous conversations:

- You discussed neural networks last week
- We talked about machine learning algorithms
[semantix-end-memory-block]

What is deep learning?
```

**Output** (HTML):
```html
<div class="semantix-memory-container collapsed">
  <div class="semantix-memory-header">
    💭 Memory Context
    <span class="semantix-memory-toggle-icon">▼</span>
  </div>
  <div class="semantix-memory-content">
    Based on your previous conversations:

    - You discussed neural networks last week
    - We talked about machine learning algorithms
  </div>
</div>
<div>What is deep learning?</div>
```

### Implementation

#### Initialization

```javascript
export class UserMessageController {
  constructor() {
    this.observer = null;
    this.processedBlocks = new Set();
  }

  init() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              this.scanForMemoryBlocks(node);
            }
          });
        }
      });
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('[UserMessageController] Initialized');
  }
}
```

**MutationObserver Configuration**:
- `childList: true` - Watch for added/removed nodes
- `subtree: true` - Watch entire DOM tree
- `characterData: true` - Watch for text content changes

#### Scanning for Memory Blocks

```javascript
scanForMemoryBlocks(node) {
  // Skip if already processed
  if (node.hasAttribute?.('data-processed')) return;

  // Use TreeWalker to efficiently find text nodes
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    if (textNode.textContent.includes('[semantix-memory-block]')) {
      const element = textNode.parentElement;

      // Skip if already processed
      if (this.processedBlocks.has(element)) continue;

      this.processedBlocks.add(element);
      this.processMemoryBlock(element);
    }
  }
}
```

**TreeWalker Benefits**:
- More efficient than recursive DOM traversal
- Only processes text nodes
- Skips already-processed elements

#### Processing Memory Blocks

```javascript
processMemoryBlock(element) {
  try {
    const text = element.textContent;

    // Define markers
    const startMarker = '[semantix-memory-block]';
    const endMarker = '[semantix-end-memory-block]';

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    // Validate markers exist
    if (startIndex === -1 || endIndex === -1) {
      console.warn('[UserMessageController] Invalid memory block markers');
      return;
    }

    // Extract memory content
    const memoryContent = text.substring(
      startIndex + startMarker.length,
      endIndex
    ).trim();

    // Extract remaining user message
    const remainingText = text.substring(
      endIndex + endMarker.length
    ).trim();

    // Create UI components
    const container = this.createMemoryContainer(memoryContent);
    const wrapper = document.createElement('div');
    wrapper.appendChild(container);

    // Add remaining text if present
    if (remainingText) {
      const textDiv = document.createElement('div');
      textDiv.textContent = remainingText;
      wrapper.appendChild(textDiv);
    }

    // Replace original element
    element.replaceWith(wrapper);

    console.log('[UserMessageController] Memory block transformed');

  } catch (error) {
    console.error('[UserMessageController] Error processing memory block:', error);
  }
}
```

#### Creating Memory Container

```javascript
createMemoryContainer(memoryContent) {
  // Main container
  const container = document.createElement('div');
  container.className = 'semantix-memory-container collapsed';
  container.setAttribute('data-processed', 'true');

  // Header (clickable)
  const header = document.createElement('div');
  header.className = 'semantix-memory-header';
  header.innerHTML = `
    💭 Memory Context
    <span class="semantix-memory-toggle-icon">▼</span>
  `;
  header.onclick = () => this.toggleMemoryBlock(container);

  // Content (collapsible)
  const content = document.createElement('div');
  content.className = 'semantix-memory-content';
  content.textContent = memoryContent;

  // Assemble
  container.appendChild(header);
  container.appendChild(content);

  return container;
}
```

**Structure**:
```
container (.semantix-memory-container.collapsed)
├── header (.semantix-memory-header) [clickable]
│   ├── "💭 Memory Context"
│   └── icon (.semantix-memory-toggle-icon) "▼"
└── content (.semantix-memory-content) [hidden when collapsed]
    └── memoryContent (text)
```

#### Toggle Functionality

```javascript
toggleMemoryBlock(container) {
  const isCollapsed = container.classList.contains('collapsed');
  const icon = container.querySelector('.semantix-memory-toggle-icon');

  if (isCollapsed) {
    // Expand
    container.classList.remove('collapsed');
    icon.textContent = '▲';
  } else {
    // Collapse
    container.classList.add('collapsed');
    icon.textContent = '▼';
  }
}
```

**States**:
- **Collapsed** (default): Content hidden, shows "▼"
- **Expanded**: Content visible, shows "▲"

## Styling

**File**: [styles.css](../src/modules/UIControls/styles.css)

**Injected by**: [loader.js](../src/content/loader.js)

```javascript
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = chrome.runtime.getURL('src/modules/UIControls/styles.css');
document.head.appendChild(linkElement);
```

### Complete Styles

```css
/* Container */
.semantix-memory-container {
  background: #f0f4f8;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Header (clickable) */
.semantix-memory-header {
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  background: #e8eef3;
  transition: background 0.2s ease;
}

.semantix-memory-header:hover {
  background: #dce4eb;
}

/* Toggle icon */
.semantix-memory-toggle-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

/* Content (collapsible) */
.semantix-memory-content {
  padding: 12px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  max-height: 500px;
  overflow-y: auto;
  transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
  opacity: 1;
}

/* Collapsed state */
.semantix-memory-container.collapsed .semantix-memory-content {
  max-height: 0;
  padding: 0 12px;
  overflow: hidden;
  opacity: 0;
}

/* Scrollbar styling (for long memory content) */
.semantix-memory-content::-webkit-scrollbar {
  width: 6px;
}

.semantix-memory-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.semantix-memory-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.semantix-memory-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### Style Breakdown

**Container Styling**:
- Light blue background (#f0f4f8)
- Subtle border and rounded corners
- Smooth transitions for expand/collapse

**Header Styling**:
- Slightly darker background (#e8eef3)
- Hover effect for better UX
- Flexbox for icon alignment
- Pointer cursor indicates clickability

**Content Styling**:
- `white-space: pre-wrap` preserves formatting
- Max height 500px with scrollbar for long content
- Smooth opacity transition
- Custom scrollbar styling

**Collapsed State**:
- `max-height: 0` hides content
- `opacity: 0` for smooth fade-out
- Padding adjusted to prevent layout shift

## Visual States

### Collapsed (Default)

```
┌─────────────────────────────────────────┐
│ 💭 Memory Context               ▼      │ ← Clickable header
└─────────────────────────────────────────┘
What is deep learning?
```

### Expanded

```
┌─────────────────────────────────────────┐
│ 💭 Memory Context               ▲      │ ← Clickable header
├─────────────────────────────────────────┤
│ Based on your previous conversations:  │
│                                         │
│ - You discussed neural networks last   │
│   week                                  │
│ - We talked about machine learning     │
│   algorithms                            │
└─────────────────────────────────────────┘
What is deep learning?
```

## Workflow

```
1. ChatGPT Displays User Message
   (with injected memory block)
    ↓
2. DOM Updates with New Message Element
    ↓
3. MutationObserver Triggers
    ↓
4. scanForMemoryBlocks() Executes
    ↓
5. TreeWalker Finds Text Node with "[semantix-memory-block]"
    ↓
6. processMemoryBlock() Called
    ↓
7. Extract Memory Content & User Message
    ↓
8. createMemoryContainer() Creates UI
    ↓
9. Replace Original Element with UI
    ↓
10. User Sees Collapsible Memory Block
    ↓
11. User Clicks Header
    ↓
12. toggleMemoryBlock() Expands/Collapses
```

## Edge Cases

### 1. Multiple Memory Blocks

**Scenario**: Multiple messages with memory blocks on the same page.

**Handling**:
```javascript
this.processedBlocks = new Set();

// Skip already processed
if (this.processedBlocks.has(element)) continue;

this.processedBlocks.add(element);
```

### 2. Invalid Markers

**Scenario**: Malformed memory block (missing start or end marker).

**Handling**:
```javascript
if (startIndex === -1 || endIndex === -1) {
  console.warn('[UserMessageController] Invalid memory block markers');
  return;  // Don't transform
}
```

### 3. Empty Memory Content

**Scenario**: Memory block with no content.

**Handling**:
```javascript
const memoryContent = text.substring(startIndex, endIndex).trim();

if (!memoryContent) {
  // Still create UI, but with empty content
  // OR skip transformation
}
```

### 4. Rapid DOM Changes

**Scenario**: ChatGPT updates DOM rapidly during streaming.

**Handling**:
- `data-processed` attribute prevents re-processing
- `processedBlocks` Set tracks processed elements
- MutationObserver batches mutations

### 5. Memory Block in Code Block

**Scenario**: User discusses memory blocks in code examples.

**Handling**:
- Currently transforms all occurrences
- **Enhancement**: Check if parent is `<code>` or `<pre>` element

```javascript
scanForMemoryBlocks(node) {
  // ... existing code ...

  if (textNode.textContent.includes('[semantix-memory-block]')) {
    const element = textNode.parentElement;

    // Skip if inside code block
    if (element.closest('code, pre')) {
      return;
    }

    // ... process ...
  }
}
```

## Performance Optimization

### 1. Efficient DOM Traversal

**TreeWalker** vs **Recursive Search**:
- TreeWalker is native browser API (faster)
- Only processes text nodes
- No function call overhead

### 2. Processed Tracking

```javascript
// Set lookup is O(1)
this.processedBlocks = new Set();

if (this.processedBlocks.has(element)) continue;
```

### 3. Early Exit

```javascript
// Skip if already has data-processed attribute
if (node.hasAttribute?.('data-processed')) return;
```

### 4. Mutation Observer Optimization

```javascript
// Only watch necessary mutation types
this.observer.observe(document.body, {
  childList: true,     // New nodes only
  subtree: true,       // Entire tree
  characterData: true  // Text changes
  // attributes: false (not needed)
});
```

## Debugging

### Enable Logging

```javascript
// Add verbose logging
scanForMemoryBlocks(node) {
  console.log('[Scan] Scanning node:', node);

  // ...

  while (textNode = walker.nextNode()) {
    console.log('[Scan] Text node:', textNode.textContent.substring(0, 50));

    if (textNode.textContent.includes('[semantix-memory-block]')) {
      console.log('[Scan] Found memory block!');
    }
  }
}
```

### Inspect Processed Blocks

```javascript
// In browser console:
// Access the controller instance
const controller = window.__userMessageController;
console.log('Processed blocks:', controller.processedBlocks);
```

### CSS Debugging

```css
/* Add border to visualize containers */
.semantix-memory-container {
  border: 2px solid red !important;
}

/* Highlight header */
.semantix-memory-header {
  border: 2px solid blue !important;
}

/* Show content even when collapsed */
.semantix-memory-container.collapsed .semantix-memory-content {
  max-height: 100px !important;
  opacity: 0.5 !important;
}
```

## Customization

### Change Icon

```javascript
header.innerHTML = `
  🧠 Memory Context  <!-- Brain icon -->
  <span class="semantix-memory-toggle-icon">▼</span>
`;
```

### Change Colors

```css
.semantix-memory-container {
  background: #e3f2fd;  /* Light blue */
  border: 1px solid #90caf9;
}

.semantix-memory-header {
  background: #bbdefb;
}
```

### Add Animation

```css
@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.semantix-memory-content {
  animation: slideDown 0.3s ease;
}
```

### Custom Memory Formatting

```javascript
createMemoryContainer(memoryContent) {
  // Parse memory content as markdown or HTML
  const formattedContent = parseMarkdown(memoryContent);

  const content = document.createElement('div');
  content.className = 'semantix-memory-content';
  content.innerHTML = formattedContent;  // Use innerHTML for formatted content

  // ...
}
```

## Future Enhancements

### 1. Syntax Highlighting for Code

```javascript
if (memoryContent.includes('```')) {
  // Apply syntax highlighting
  content.innerHTML = highlightCode(memoryContent);
}
```

### 2. Memory Source Links

```javascript
// Include links to original conversations
header.innerHTML = `
  💭 Memory Context (3 sources)
  <span class="semantix-memory-toggle-icon">▼</span>
`;

// Add source links in content
content.innerHTML = `
  ${memoryContent}
  <div class="memory-sources">
    <a href="/c/conv_123">Source 1</a>
    <a href="/c/conv_456">Source 2</a>
  </div>
`;
```

### 3. Relevance Indicators

```javascript
// Show relevance scores
header.innerHTML = `
  💭 Memory Context
  <span class="relevance-badge">85% relevant</span>
  <span class="semantix-memory-toggle-icon">▼</span>
`;
```

### 4. Inline Expansion

```javascript
// Expand inline instead of block
container.style.display = 'inline-block';
container.style.maxWidth = '400px';
```

## Related Documentation

- **Memory Injection**: [11-memory-injection.md](11-memory-injection.md)
- **Provider System**: [03-provider-system.md](03-provider-system.md)
- **Extension Contexts**: [02-extension-contexts.md](02-extension-contexts.md)
