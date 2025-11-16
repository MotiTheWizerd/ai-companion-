# ChatGPT Extension

Chrome extension for intercepting and exporting ChatGPT conversations.

## Features

- Intercepts ChatGPT streaming responses in real-time
- Captures complete messages with metadata (conversation_id, message_id, model)
- React-based popup UI for viewing and exporting messages
- Event-driven architecture for scalability

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development mode (with HMR for popup)
npm run dev
```

## Installation

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

## Usage

1. Navigate to https://chatgpt.com/
2. Extension automatically intercepts conversations
3. Click extension icon to view messages
4. Click "Load Messages" to fetch current conversation
5. Click "Download JSON" to export

## Architecture

```
src/
├── popup/              # React popup UI
│   ├── App.jsx
│   ├── main.jsx
│   └── index.html
├── content/            # Content scripts (vanilla JS)
│   ├── content.js      # Main content script
│   └── loader.js       # Module loader
└── modules/            # Core logic (vanilla JS)
    ├── eventBus.js     # Event system
    ├── interceptor.js  # Network interception
    └── streamParser.js # Stream parsing
```

## Message Format

```json
{
  "role": "user" | "assistant",
  "conversation_id": "string",
  "message_id": "string",
  "text": "string",
  "model": "string"
}
```
