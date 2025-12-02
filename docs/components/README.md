# Components Quick Start

## 1. Overview
Semantix bundles small UI utilities (toolbars, widgets, inputs, etc.) under `src/modules`. Each component exports a minimal API so content scripts can reuse DOM logic without duplicating selectors or styling. Most components expose factory helpers (e.g., `forChatGPT`) and expect you to call `.init()`/`.attach()` before using them.

## 2. Input Component
Path: `src/modules/ui/components/input`. Import via:
```js
import { InputComponent } from '../../modules/ui/components/input/index.js';
```

Key helpers:
- `setText(text)` – replace the entire message.
- `addText(text)` – append text/emoji without clearing.
- `getText()` – current composer value (handles ProseMirror or `<textarea>`).
- `sendMessage()` – clicks the provider send button.
- `focus()` / `clear()` – utility helpers.

Use `InputComponent.forChatGPT()` to auto-wire `#prompt-textarea` and the send button selectors. For other providers pass custom `selector`/`sendButtonSelector` options.
