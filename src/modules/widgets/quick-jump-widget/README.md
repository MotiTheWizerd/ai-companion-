# QuickJump Widget

A vertical navigation bar with dots for quickly jumping between messages in a conversation.

## Overview

The QuickJump widget provides a fixed-position panel on the right side of the screen with dots representing each message in the conversation. Users can click on any dot to instantly scroll to that message.

## Features

- **Visual Message Map**: Each message is represented by a dot
- **Role Differentiation**: User messages (green/filled) vs Assistant messages (gray/hollow)
- **Click Navigation**: Click any dot to smooth-scroll to that message
- **Active Indicator**: Currently selected message dot is highlighted
- **Auto-Update**: MutationObserver detects new messages automatically
- **Max Limit**: Displays up to 20 most recent messages to prevent overcrowding

## Usage

```javascript
import { QuickJumpWidget } from './QuickJumpWidget.js';

// Create instance
const quickJump = new QuickJumpWidget({
  document: document,
  maxDots: 20,
});

// Attach to DOM (creates panel, scans messages, starts observing)
quickJump.attach();

// Manual controls
quickJump.show();          // Show the widget
quickJump.hide();          // Hide the widget
quickJump.toggle();        // Toggle visibility
quickJump.refresh();       // Re-scan and re-render
quickJump.destroy();       // Cleanup and remove
```

## Provider Support

Currently supports **ChatGPT** only.

Message selectors are defined in `constants.js`:
- User: `[data-message-author-role="user"]`
- Assistant: `[data-message-author-role="assistant"]`

To add support for other providers (Claude, etc.), extend the selectors in constants.js.

## Configuration

Edit `constants.js` to customize:

| Option | Default | Description |
|--------|---------|-------------|
| `MAX_DOTS` | 20 | Maximum dots to display |
| `DOT_SIZE` | 8px | Diameter of each dot |
| `DOT_GAP` | 6px | Space between dots |
| `SCROLL_BEHAVIOR` | 'smooth' | Scroll animation type |
| `SCROLL_BLOCK` | 'center' | Where message appears in viewport |

## Styling

Styles are injected inline via `PANEL_STYLES` constant in `QuickJumpWidget.js`.

CSS Classes:
- `.semantix-quickjump` - Main panel container
- `.semantix-quickjump--visible` - Visible state
- `.semantix-quickjump__dot` - Individual dot button
- `.semantix-quickjump__dot--user` - User message dot (green)
- `.semantix-quickjump__dot--assistant` - Assistant message dot (gray)
- `.semantix-quickjump__dot--active` - Currently active/selected dot

## Integration

This widget is initialized by `WidgetController` and auto-attaches on page load for supported providers.