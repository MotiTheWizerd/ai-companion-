### InputComponent

Reusable helper that wraps provider composer inputs (contenteditable or textarea). It exposes tiny methods so modules can read/write/send messages without duplicating DOM logic.

#### Key methods
| Method | Description |
|--------|-------------|
| `setText(text)` | Replaces the entire input contents. |
| `addText(text)` | Appends to the existing text. |
| `getText()` | Returns the current input value. |
| `clear()` / `focus()` | Utility helpers. |
| `sendMessage()` | Clicks the send button (or runs the optional fallback). |

#### Usage
```js
import { InputComponent } from '../../ui/components/input/index.js';

const input = InputComponent.forChatGPT();
input.focus();
input.addText('Hello from Semantix!');
input.sendMessage();
```

`forChatGPT()` preconfigures the selectors for chatgpt.com (`#prompt-textarea`, `button[data-testid="send-button"]`). Pass custom selectors/document if you need to support other providers.
