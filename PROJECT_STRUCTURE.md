# Semantix Bridge - GPT Extension Project Structure

## Project Overview
A Chrome extension for intercepting and exporting ChatGPT conversations in real-time. Built with React for the popup UI and vanilla JavaScript for content scripts.

**Project Name:** gpt-extenstion
**Version:** 1.0.0
**License:** ISC

---

## Directory Structure

```
gpt-extenstion/
├── .claude/                          # Claude Code configuration
│   ├── commands/
│   │   └── refactor.md              # Custom Claude refactor command
│   └── settings.local.json          # Local Claude settings
│
├── dist/                            # Build output directory
│   ├── assets/
│   │   ├── popup.css               # Compiled popup styles
│   │   └── popup.js                # Compiled popup JavaScript
│   ├── src/
│   │   ├── content.js              # Compiled content script
│   │   ├── loader.js               # Compiled module loader
│   │   ├── modules/
│   │   │   ├── ConversationManager/
│   │   │   │   └── index.js       # Compiled conversation manager
│   │   │   ├── MessageManager/
│   │   │   │   └── index.js       # Compiled message manager
│   │   │   ├── StorageManager/
│   │   │   │   └── index.js       # Compiled storage manager
│   │   │   ├── eventBus.js        # Compiled event bus
│   │   │   ├── interceptor.js     # Compiled network interceptor
│   │   │   └── streamParser.js    # Compiled stream parser
│   │   └── popup/
│   │       └── index.html         # Popup HTML
│   └── manifest.json               # Compiled manifest
│
├── docs/                            # Documentation directory
│
├── icons/                           # Extension icons
│   ├── icon16.svg                  # 16x16 icon
│   ├── icon48.svg                  # 48x48 icon
│   ├── icon128.svg                 # 128x128 icon
│   └── semantix.svg                # Semantix logo
│
├── node_modules/                    # Dependencies (not tracked)
│
├── public/                          # Static public assets
│   ├── src/
│   │   ├── content.js
│   │   ├── loader.js
│   │   └── modules/
│   │       ├── ConversationManager/
│   │       │   └── index.js
│   │       ├── MessageManager/
│   │       │   └── index.js
│   │       ├── StorageManager/
│   │       │   └── index.js
│   │       ├── eventBus.js
│   │       ├── interceptor.js
│   │       └── streamParser.js
│   └── manifest.json
│
├── src/                             # Source code
│   ├── content/                     # Content scripts (vanilla JS)
│   │   ├── content.js              # Main entry point (minimal bootstrap)
│   │   ├── loader.js               # Module loader for content script
│   │   ├── core/                   # Core application modules
│   │   │   ├── Application.js      # Main application orchestrator
│   │   │   ├── constants.js        # Application constants and event names
│   │   │   └── eventBus.js         # Event-driven communication system
│   │   └── modules/                # Feature modules
│   │       ├── eventHandlers/      # Event handler functions
│   │       │   ├── index.js        # Handler exports
│   │       │   ├── messageHandlers.js    # Message event handlers
│   │       │   ├── streamHandlers.js     # Stream event handlers
│   │       │   └── markerHandlers.js     # Marker/metadata handlers
│   │       ├── publicAPI.js        # Public API exposure (window.chatGPTMessages)
│   │       └── utils/              # Utility modules
│   │           └── logger.js       # Logging utility
│   │
│   ├── modules/                     # Shared core logic modules (vanilla JS)
│   │   ├── ConversationManager/
│   │   │   └── index.js            # Manages conversation state
│   │   ├── MessageManager/
│   │   │   └── index.js            # Handles message operations
│   │   ├── StorageManager/
│   │   │   └── index.js            # Manages data persistence
│   │   ├── NetworkInterceptor/     # Network interception module
│   │   │   ├── index.js            # Main interceptor orchestrator
│   │   │   ├── ChunkProcessor.js   # Processes stream chunks
│   │   │   └── FetchHandler.js     # Handles fetch interception
│   │   └── streamParser.js         # Parses streaming ChatGPT responses
│   │
│   └── popup/                       # React popup UI
│       ├── App.jsx                 # Main React component
│       ├── index.css               # Popup styles
│       ├── index.html              # Popup HTML template
│       └── main.jsx                # React entry point
│
├── .gitignore                       # Git ignore rules
├── manifest.json                    # Chrome extension manifest (root)
├── package.json                     # NPM package configuration
├── package-lock.json               # NPM lock file
├── popup.css                        # Root popup CSS
├── popup.html                       # Root popup HTML
├── popup.js                         # Root popup JS
├── README.md                        # Project documentation
└── vite.config.js                   # Vite build configuration
```

---

## Key Files Description

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM configuration, dependencies, and build scripts |
| `vite.config.js` | Vite bundler configuration for building the extension |
| `manifest.json` | Chrome extension manifest (V3) |
| `.gitignore` | Specifies files to ignore in version control |

### Source Code (`src/`)

#### Content Scripts (`src/content/`)
- **`content.js`** - Main entry point (minimal bootstrap - 8 lines)
- **`loader.js`** - Dynamically loads modules into the page context

#### Core Application (`src/content/core/`)
- **`Application.js`** - Main orchestrator coordinating all modules
- **`constants.js`** - Application constants, event names, and configuration
- **`eventBus.js`** - Centralized event system for component communication

#### Content Modules (`src/content/modules/`)
- **`eventHandlers/`** - Event handler functions organized by domain
  - **`registry.js`** - Central handler registry (maps events to handlers)
  - **`messageHandlers.js`** - Handles message input events
  - **`streamHandlers.js`** - Handles stream start/text/complete events
  - **`markerHandlers.js`** - Handles marker and metadata events
  - **`index.js`** - Exports all handlers
- **`publicAPI.js`** - Exposes public API (window.chatGPTMessages)
- **`utils/logger.js`** - Structured logging utility

#### Shared Modules (`src/modules/`)
- **`NetworkInterceptor/`** - Network interception module
  - **`index.js`** - Main interceptor orchestrator
  - **`ChunkProcessor.js`** - Processes stream chunks and emits events
  - **`FetchHandler.js`** - Handles fetch API interception
- **`streamParser.js`** - Parses streaming SSE (Server-Sent Events) responses
- **`ConversationManager/index.js`** - Manages conversation state and metadata
- **`MessageManager/index.js`** - Handles message storage and retrieval
- **`StorageManager/index.js`** - Manages data persistence (localStorage/chrome.storage)

#### Popup UI (`src/popup/`)
- **`main.jsx`** - React application entry point
- **`App.jsx`** - Main React component with UI logic
- **`index.html`** - HTML template for popup
- **`index.css`** - Popup styling

### Build Output (`dist/`)
Contains the compiled extension ready for Chrome installation. Generated by running `npm run build`.

### Icons (`icons/`)
SVG icons for the extension in various sizes (16x16, 48x48, 128x128).

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        ChatGPT Web Page                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌────────────────────────────────┐     │
│  │   loader.js  │────────>│       content.js               │     │
│  │  (injected)  │         │   (minimal bootstrap)          │     │
│  └──────────────┘         └──────────┬─────────────────────┘     │
│                                       │                            │
│                          ┌────────────▼──────────────┐            │
│                          │     Application.js        │            │
│                          │  (Main Orchestrator)      │            │
│                          └────────┬──────────────────┘            │
│                                   │                                │
│            ┌──────────────────────┼─────────────────┐             │
│            │                      │                 │             │
│    ┌───────▼─────────┐  ┌─────────▼────────┐  ┌────▼──────────┐  │
│    │  eventBus.js    │  │ Event Handlers   │  │  publicAPI.js │  │
│    │ (Pub/Sub Core)  │  │ - message        │  │ (window API)  │  │
│    └────────┬────────┘  │ - stream         │  └───────────────┘  │
│             │           │ - marker         │                      │
│             │           └──────────────────┘                      │
│             │                                                      │
│    ┌────────▼───────────────────────────────────────┐            │
│    │                                                  │            │
│    │  NetworkInterceptor  │  Managers  │  Utils      │            │
│    │  - ChunkProcessor    │  - Convo   │  - logger   │            │
│    │  - FetchHandler      │  - Message │             │            │
│    │  - StreamParser      │  - Storage │             │            │
│    │                                                  │            │
│    └──────────────────────────────────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ chrome.runtime.sendMessage
                              ▼
                    ┌──────────────────┐
                    │   Popup (React)  │
                    │   - App.jsx      │
                    │   - main.jsx     │
                    └──────────────────┘
```

### Event-Driven Flow

```
User Action → NetworkInterceptor.FetchHandler
                    ↓
            ChunkProcessor (parse stream)
                    ↓
            eventBus.emit(event, data)
                    ↓
            Event Handlers (message/stream/marker)
                    ↓
            Managers (ConversationManager, MessageManager, StorageManager)
                    ↓
            Storage (localStorage) + Public API (window.chatGPTMessages)
```

---

## Dependencies

### Production Dependencies
- **react** (^19.2.0) - UI library for popup interface
- **react-dom** (^19.2.0) - React DOM renderer

### Development Dependencies
- **@vitejs/plugin-react** (^5.1.1) - Vite plugin for React support
- **vite** (^7.2.2) - Build tool and development server

---

## Build Scripts

```bash
# Start development server (with HMR for popup)
npm run dev

# Build production version to dist/
npm run build

# Preview production build
npm run preview
```

---

## Chrome Extension Manifest (V3)

**Permissions:**
- `host_permissions`: Access to `https://chatgpt.com/*`

**Content Scripts:**
- Injected into ChatGPT pages at `document_start`
- Entry point: `src/loader.js`

**Web Accessible Resources:**
- `src/content.js`
- `src/modules/*.js`

**Action:**
- Default popup: `popup.html`
- Icons: 16x16, 48x48, 128x128

---

## Message Format

Messages intercepted and stored follow this structure:

```json
{
  "role": "user" | "assistant",
  "conversation_id": "string",
  "message_id": "string",
  "text": "string",
  "model": "string"
}
```

---

## Installation & Usage

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

3. **Use the extension:**
   - Visit https://chatgpt.com/
   - Extension automatically intercepts conversations
   - Click extension icon to view messages
   - Use "Load Messages" to fetch current conversation
   - Use "Download JSON" to export data

---

## Development Notes

- **Content scripts** use vanilla JavaScript for performance
- **Popup UI** uses React for modern component-based development
- **Event-driven architecture** enables scalable, modular design
  - **Event handlers** organized by domain (message, stream, marker)
  - **Pure functions** for easy testing and maintainability
  - **Dependency injection** pattern in Application.js
- **Streaming support** captures ChatGPT responses in real-time
- **Module system** allows dynamic loading of functionality
- **Centralized constants** for event names and configuration
- **Structured logging** with consistent prefixes

### Refactoring History

#### Phase 1: Initial Modularization (2025-11-16)
The codebase was refactored from a monolithic `content.js` to a modular event-driven architecture:

**Before:**
- Single 92-line file with all logic inline
- Event handlers mixed with orchestration
- Hard-coded strings and magic values
- Difficult to test and maintain

**After Phase 1:**
- **8-line bootstrap** in content.js
- **Application.js** orchestrator (103 lines)
- **Separated event handlers** by domain (3 files)
- **Constants module** for event names
- **Logger utility** for consistent output
- **Public API module** for external access
- **Test-friendly** with dependency injection

#### Phase 2: Handler Registry Pattern (2025-11-16)
Implemented automatic event registration using a central registry:

**Changes:**
- Created **`registry.js`** - Single source of truth for event-handler mappings
- Updated all handlers to use **`(event, managers)` signature**
- Refactored Application.js to use **automatic registration loop**
- Reduced Application.js from 103 → **75 lines** (28% reduction)

**Benefits:**
- **Zero manual wiring** - Add handler to registry, done
- **Single source of truth** - All mappings in one file
- **Easy refactoring** - Change event names without touching handlers
- **Scalable** - Add 100 events without bloating Application.js
- **DI-friendly** - Clean manager injection pattern

**Final File Structure:**
```
src/content/
├── content.js (8 lines - minimal bootstrap)
├── core/
│   ├── Application.js (75 lines - orchestrator)
│   ├── constants.js (events, config)
│   └── eventBus.js (pub/sub)
└── modules/
    ├── eventHandlers/
    │   ├── registry.js (handler-event mapping)
    │   ├── messageHandlers.js
    │   ├── streamHandlers.js
    │   └── markerHandlers.js
    ├── publicAPI.js (window API)
    └── utils/
        └── logger.js (logging)
```

**Key Pattern:**
```javascript
// registry.js
export const HANDLER_REGISTRY = {
  [EVENTS.MESSAGE_INPUT]: handleMessageInput,
  [EVENTS.STREAM_START]: handleStreamStart,
  // ...
};

// Application.js
Object.entries(HANDLER_REGISTRY).forEach(([event, handler]) => {
  eventBus.on(event, (data) => handler(data, this.managers));
});
```

This architecture aligns with the **Semantix + SYNÆON** vision for scalable, maintainable systems.

---

## Git Repository Status

**Repository:** Not currently initialized as a Git repository
**Recommended:** Initialize with `git init` and commit files

---

*Document generated: 2025-11-16*
