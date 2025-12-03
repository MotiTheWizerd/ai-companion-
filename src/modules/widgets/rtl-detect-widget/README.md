# RTL Detect Widget

Automatically detects Hebrew/Arabic text in the chat input and switches the text direction to RTL (Right-to-Left). Switches back to LTR when typing English or other LTR languages.

## Overview

This widget solves the frustration of typing Hebrew/Arabic in ChatGPT where the input doesn't automatically adjust direction. It monitors the input field and intelligently detects the language based on the first meaningful character.

## Features

- **Auto-Detection**: Detects RTL languages (Hebrew, Arabic) on keystroke
- **Smart Analysis**: Skips neutral characters (numbers, punctuation, emojis) to find first directional character
- **Smooth Switching**: Debounced detection prevents flickering
- **ProseMirror Support**: Handles ChatGPT's contenteditable structure
- **Zero UI**: Works invisibly in the background

## Supported Languages

| Language | Unicode Range |
|----------|---------------|
| Hebrew | U+0590 - U+05FF |
| Arabic | U+0600 - U+06FF |
| Arabic Supplement | U+0750 - U+077F |
| Arabic Extended | U+08A0 - U+08FF |

## Usage

```javascript
import { RTLDetectWidget } from './RTLDetectWidget.js';

// Create and attach
const rtlWidget = new RTLDetectWidget({
  document: document,
  inputSelector: '#prompt-textarea',
  debounceDelay: 50,
});

rtlWidget.attach();

// Manual controls
rtlWidget.setDirection('rtl');  // Force RTL
rtlWidget.setDirection('ltr');  // Force LTR
rtlWidget.getDirection();       // Get current direction
rtlWidget.reattach();           // Re-attach after navigation
rtlWidget.destroy();            // Cleanup
```

## How Detection Works

1. Listen to `input` events on the textarea
2. Get the text content
3. Iterate through characters, skipping neutral ones (numbers, punctuation, emojis)
4. First Hebrew/Arabic character → RTL
5. First Latin character → LTR
6. Apply `dir` attribute and inline styles

## Integration

This widget is initialized by `WidgetController` and auto-attaches on page load for ChatGPT.

## Configuration

Edit `constants.js` to customize:

| Option | Default | Description |
|--------|---------|-------------|
| `DEBOUNCE_DELAY` | 50ms | Delay before detecting direction |
| `DEFAULT_DIRECTION` | 'ltr' | Direction when input is empty |

## Provider Support

Currently supports **ChatGPT** only (`#prompt-textarea`).

To add other providers, extend `GPT_SELECTORS` in `constants.js` with appropriate input selectors.