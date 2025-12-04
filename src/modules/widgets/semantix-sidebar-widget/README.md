# Semantix Sidebar Widget

A collapsible sidebar section that integrates seamlessly with ChatGPT's native sidebar UI.

## Overview

The Semantix Sidebar Widget injects a "Semantix" section into ChatGPT's left sidebar, positioned as the **first child** of the `<aside>` element. This places it above the native sections (GPTs, Projects, Your Chats).

## Features

- 🎨 **Native Look & Feel** - Matches ChatGPT's sidebar styling perfectly
- 📂 **Collapsible** - Click to expand/collapse, state persisted in localStorage
- 🔄 **Auto-Recovery** - Re-injects if removed by ChatGPT's dynamic updates
- 📡 **Event System** - Emits events for menu item clicks
- ⚡ **Lightweight** - Minimal footprint, no external dependencies

## Architecture

```
semantix-sidebar-widget/
├── constants.js              # Selectors, config, menu items, icons
├── SemantixSidebarWidget.js  # Main widget class
└── README.md                 # This file
```

## Usage

### Basic Initialization

```javascript
import { createSemantixSidebarWidget } from './SemantixSidebarWidget.js';

// Create and initialize the widget
const widget = createSemantixSidebarWidget();

// Later, to clean up:
widget.destroy();
```

### With Custom Options

```javascript
import { SemantixSidebarWidget } from './SemantixSidebarWidget.js';

const widget = new SemantixSidebarWidget({
  document: document,  // Optional: custom document reference
  window: window,      // Optional: custom window reference
});

widget.init();
```

## Event Handling

The widget emits events when menu items are clicked:

### Via Custom Event

```javascript
window.addEventListener('semantix-sidebar-action', (event) => {
  const { action, itemId } = event.detail;
  
  switch (action) {
    case 'openMemorySearch':
      // Handle memory search
      break;
    case 'openRecentMemories':
      // Handle recent memories
      break;
    case 'openProjects':
      // Handle projects
      break;
    case 'openSettings':
      // Handle settings
      break;
  }
});
```

### Via PostMessage (for content script communication)

```javascript
window.addEventListener('message', (event) => {
  if (event.data?.source === 'semantix-sidebar' && event.data?.type === 'MENU_ACTION') {
    const { action, itemId } = event.data;
    // Handle action...
  }
});
```

## Menu Items

Default menu items defined in `constants.js`:

| ID | Label | Icon | Action |
|----|-------|------|--------|
| `memory-search` | Memory Search | 🔍 | `openMemorySearch` |
| `recent-memories` | Recent Memories | 🕐 | `openRecentMemories` |
| `projects` | Projects | 📁 | `openProjects` |
| `settings` | Settings | ⚙️ | `openSettings` |

### Customizing Menu Items

Edit `MENU_ITEMS` in `constants.js`:

```javascript
export const MENU_ITEMS = [
  {
    id: "my-custom-item",
    label: "My Custom Item",
    icon: "search",  // Must match a key in ICONS
    action: "myCustomAction",
  },
  // ...
];
```

## Selectors

The widget uses these selectors to find the sidebar (defined in `constants.js`):

```javascript
export const GPT_SELECTORS = {
  SIDEBAR_ASIDE: [
    'aside[class*="sidebar-section"]',
    "aside.sticky",
    "nav aside",
    "aside",
  ],
  // ...
};
```

These are also exposed via `ChatGPTSelector.js` for consistency with other components.

## Configuration

Key configuration options in `constants.js`:

```javascript
export const CONFIG = {
  SECTION_ID: "semantix-sidebar-section",  // DOM element ID
  CLASS_PREFIX: "semantix-sidebar",        // CSS class prefix
  DEFAULT_COLLAPSED: false,                // Initial state
  STORAGE_KEY: "semantix_sidebar_collapsed", // localStorage key
  MAX_RETRIES: 10,                         // Injection retry attempts
  RETRY_INTERVAL: 500,                     // Retry delay (ms)
};
```

## Styling

The widget injects its own `<style>` element with ID `semantix-sidebar-styles`.

Key CSS classes:
- `.semantix-sidebar-section` - Main container
- `.semantix-sidebar-header` - Clickable header
- `.semantix-sidebar-menu` - Menu container
- `.semantix-sidebar-menu-item` - Individual menu items
- `.semantix-sidebar--expanded` - Expanded state
- `.semantix-sidebar--collapsed` - Collapsed state

### Customizing Styles

Override styles in your own CSS:

```css
.semantix-sidebar-section .semantix-sidebar-title {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## Integration with ChatGPTSelector

The widget's selectors are also available via `ChatGPTSelector.js`:

```javascript
import { ChatGPTSelector } from '../ConversationManager/selectors/providers/ChatGPTSelector.js';

const selector = new ChatGPTSelector();
const sidebarAside = selector.getSidebarAside();     // Returns selector array
const position = selector.getSidebarPosition();       // Returns 'prepend'
```

## Lifecycle

1. **init()** - Load state, inject styles, attempt injection, set up observer
2. **tryInject()** - Find aside, create section, insert as first child
3. **setupObserver()** - Watch for DOM changes, re-inject if removed
4. **destroy()** - Clean up observers, remove elements, unbind events

## Troubleshooting

### Section not appearing?

1. Check console for `[SemantixSidebarWidget]` logs
2. Verify the sidebar is loaded (may need to wait for ChatGPT's hydration)
3. Inspect the DOM for `<aside>` element

### Section disappears after navigation?

The mutation observer should handle this automatically. If not:
- Check if observer is connected
- Verify `handleMutations` is being called

### Styling looks wrong?

- Ensure styles are injected (check for `#semantix-sidebar-styles` in `<head>`)
- Check for CSS variable conflicts with ChatGPT's theme