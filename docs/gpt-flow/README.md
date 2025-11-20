# GPT Extension Workflow Documentation

## Overview

This documentation provides a comprehensive guide to the AI Conversation Bridge Extension workflow, with a focus on the memory injection system. The extension intercepts AI conversations from ChatGPT, Claude, and Qwen, and syncs them to a backend API with semantic memory capabilities.

## Table of Contents

### Core Documentation

1. **[Architecture Overview](01-architecture-overview.md)**
   - High-level architecture
   - Design patterns (Event-Driven, Provider, Registry, Singleton, Circuit Breaker)
   - Module dependency graph
   - Extension manifest configuration
   - File structure overview

2. **[Extension Contexts](02-extension-contexts.md)**
   - Page Context (content.js)
   - Content Script Context (loader.js)
   - Background Script Context (background.js)
   - CSP bypass strategy
   - Message bridge implementation
   - Security considerations

3. **[Provider System](03-provider-system.md)**
   - Base provider architecture
   - Provider Registry (Singleton)
   - ChatGPT Provider implementation
   - Claude Provider implementation
   - Qwen Provider implementation
   - Adding new providers
   - Stream parsing for each provider

4. **[Data Flow](04-data-flow.md)**
   - Complete user message flow
   - Request interception and modification
   - Response stream processing
   - Chunk processing and event emission
   - State management updates
   - Backend synchronization
   - Error handling flow

### Memory Injection System

5. **[Memory Injection](11-memory-injection.md)** ⭐ **Key Documentation**
   - Memory injection architecture
   - Request modification process
   - CSP bypass for memory fetch
   - Content script bridge
   - Background script handler
   - Backend API integration
   - Message transformation examples
   - Configuration and debugging

6. **[UI Controls - Memory Block Transformation](09-ui-controls.md)** ⭐ **Key Documentation**
   - UserMessageController implementation
   - MutationObserver setup
   - Memory block detection
   - UI transformation process
   - Collapsible UI creation
   - Styling and visual states
   - Performance optimization
   - Debugging tips

## Quick Start

### Understanding Memory Injection

The memory injection system is the core feature that enhances ChatGPT conversations with context from previous interactions:

```
User Message → Memory Search → Inject Context → Send to ChatGPT → Transform UI
```

**Read these in order**:
1. [Extension Contexts](02-extension-contexts.md) - Understand the three-context architecture
2. [Memory Injection](11-memory-injection.md) - Learn how memory is fetched and injected
3. [UI Controls](09-ui-controls.md) - See how memory blocks become interactive UI elements

### Architecture Quick Reference

**Three Contexts**:
- **Page Context**: Intercepts fetch, processes streams, manages state
- **Content Script**: Bridges page and background contexts
- **Background Script**: Executes API requests (no CSP restrictions)

**Key Components**:
- **ProviderRegistry**: Detects and manages AI providers (ChatGPT/Claude/Qwen)
- **NetworkInterceptor**: Intercepts and processes fetch requests
- **EventBus**: Central pub/sub system for component communication
- **APIClient**: Manages backend communication with retry/circuit breaker
- **UIController**: Transforms memory blocks into collapsible UI

## Memory Injection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Types Message in ChatGPT                                │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FetchHandler Intercepts Request (Page Context)               │
│    - ChatGPTProvider.handleRequest() called                     │
│    - Extract user message text                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Fetch Memory via Bridge                                      │
│    Page → window.postMessage → Content Script                   │
│         → chrome.runtime.sendMessage → Background               │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Background Script Executes Memory Search                     │
│    - POST /conversations/fetch-memory                           │
│    - Backend searches vector database                           │
│    - Returns synthesized_memory                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Response Flows Back Through Bridge                           │
│    Background → Content Script → Page Context                   │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Inject Memory Block into User Message                        │
│    [semantix-memory-block]                                      │
│    {synthesized memory content}                                 │
│    [semantix-end-memory-block]                                  │
│                                                                  │
│    {original user message}                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Send Modified Request to ChatGPT                             │
│    - ChatGPT receives message with memory context               │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ChatGPT Response Displayed in DOM                            │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. UserMessageController Detects Memory Block                   │
│    - MutationObserver triggers on DOM change                    │
│    - scanForMemoryBlocks() finds markers                        │
└───────────────────────┬─────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Transform to Collapsible UI                                 │
│     ┌───────────────────────────────────┐                       │
│     │ 💭 Memory Context          ▼     │ ← Clickable           │
│     └───────────────────────────────────┘                       │
│     {original user message}                                     │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── background/
│   └── background.js                    # Service worker, API bridge
│
├── configuration/
│   ├── userSettings.json                # User ID
│   └── apiConfig.json                   # Backend URL, settings
│
├── content/
│   ├── content.js                       # Page context entry point
│   ├── loader.js                        # Content script bridge
│   └── core/
│       ├── Application.js               # Main orchestrator
│       ├── eventBus.js                  # Event system
│       └── constants.js                 # Event names, configs
│
└── modules/
    ├── providers/
    │   ├── ProviderRegistry.js          # Singleton registry
    │   ├── base/
    │   │   ├── BaseProvider.js
    │   │   ├── BaseStreamParser.js
    │   │   └── BaseURLMatcher.js
    │   ├── chatgpt/
    │   │   ├── ChatGPTProvider.js       # ⭐ Memory injection here
    │   │   ├── ChatGPTStreamParser.js
    │   │   └── chatgpt.config.js
    │   ├── claude/
    │   └── qwen/
    │
    ├── NetworkInterceptor/
    │   ├── FetchHandler.js              # Intercepts fetch calls
    │   └── ChunkProcessor.js            # Processes stream chunks
    │
    ├── UIControls/
    │   ├── UserMessageController.js     # ⭐ Memory block UI transformation
    │   └── styles.css                   # ⭐ Collapsible UI styles
    │
    ├── APIClient/
    │   ├── index.js                     # Backend communication
    │   └── services/
    │       └── RequestExecutor.js       # Dual-mode HTTP execution
    │
    ├── ConversationManager/             # State management
    ├── MessageManager/                  # Stream accumulation
    └── StorageManager/                  # localStorage persistence
```

## Key Concepts

### 1. Three-Context Architecture

**Why three contexts?**
- **Page Context**: Can intercept fetch and access DOM, but CSP blocks API calls
- **Content Script**: Can use chrome.runtime API but still CSP-restricted
- **Background Script**: No CSP restrictions, can make HTTP requests

This architecture enables memory injection by allowing the page context to fetch memories via the background script.

### 2. Memory Injection (ChatGPT Only)

**Process**:
1. User types message
2. Extension intercepts request before sending
3. Fetches relevant memories from backend (via bridge)
4. Prepends memory block to user message
5. Sends modified request to ChatGPT
6. ChatGPT sees context from previous conversations

**Why ChatGPT only?**
- Currently implemented only for ChatGPT
- Can be extended to Claude and Qwen providers
- See [Provider System](03-provider-system.md#adding-a-new-provider) for how to add

### 3. Event-Driven Architecture

**EventBus** coordinates all components:
```javascript
eventBus.emit('stream:start', { messageId, conversationId });
eventBus.emit('stream:text', { text: 'chunk' });
eventBus.emit('stream:complete', { conversationId });
```

Handlers automatically registered from [HANDLER_REGISTRY](../src/content/modules/eventHandlers/registry.js).

### 4. Provider Pattern

Support multiple AI platforms through unified interface:
- **BaseProvider** - Abstract interface
- **ChatGPTProvider** - ChatGPT-specific implementation
- **ClaudeProvider** - Claude-specific implementation
- **QwenProvider** - Qwen-specific implementation

Each provider has custom stream parsing and URL matching.

### 5. CSP Bypass Strategy

**Problem**: Content Security Policy blocks API requests from page context.

**Solution**:
```
Page Context → postMessage → Content Script → chrome.runtime.sendMessage
→ Background Script → HTTP fetch → Backend API
```

All memory fetches use this bridge.

## Configuration

### User Settings

**File**: [userSettings.json](../src/configuration/userSettings.json)

```json
{
  "userId": "84e17260-ff03-409b-bf30-0b5ba52a2ab4"
}
```

### API Configuration

**File**: [apiConfig.json](../src/configuration/apiConfig.json)

```json
{
  "baseUrl": "http://localhost:8000",
  "timeout": 30000,
  "retryAttempts": 3,
  "retryDelay": 1000,
  "maxConcurrent": 5
}
```

### Provider Configuration

**Example**: [chatgpt.config.js](../src/modules/providers/chatgpt/chatgpt.config.js)

```javascript
{
  name: 'ChatGPT',
  domain: 'chatgpt.com',
  projectId: '11',  // Backend project ID
  endpoints: {
    conversation: '/conversation'
  },
  streamFormat: 'sse'
}
```

## Debugging Tips

### View Logs by Context

**Page Context** (content.js):
- Open DevTools on ChatGPT page
- Console shows all page context logs

**Content Script** (loader.js):
- Right-click extension icon → Inspect
- Console shows bridge messages

**Background Script** (background.js):
- chrome://extensions → Inspect service worker
- Console shows API requests

### Enable Verbose Logging

Search for `console.log` statements in:
- [ChatGPTProvider.js](../src/modules/providers/chatgpt/ChatGPTProvider.js) - Memory injection logs
- [UserMessageController.js](../src/modules/UIControls/UserMessageController.js) - UI transformation logs
- [background.js](../src/background/background.js) - API request logs

### Inspect Memory Blocks

```javascript
// In DevTools console on ChatGPT:
document.querySelectorAll('.semantix-memory-container')
```

### Monitor Bridge Messages

```javascript
// In loader.js, add:
window.addEventListener('message', (event) => {
  if (event.data.source?.includes('chatgpt-extension')) {
    console.log('[Bridge]', event.data);
  }
});
```

## Development Workflow

### 1. Make Changes

Edit files in `src/` directory.

### 2. Build Extension

```bash
npm run build
```

Output: `dist/` directory

### 3. Load Extension

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` directory

### 4. Test Memory Injection

1. Open ChatGPT
2. Type a message
3. Check DevTools console for memory injection logs
4. Look for collapsible memory block in UI

### 5. Reload After Changes

- Click reload icon on extension card
- Or use keyboard shortcut (Ctrl+R on extension page)

## Common Issues

### Memory Block Not Appearing

**Check**:
1. Is backend running on localhost:8000?
2. Are there relevant memories in the database?
3. Check browser console for errors
4. Verify `min_similarity` threshold (default: 0.5)

### UI Not Transforming

**Check**:
1. Is [styles.css](../src/modules/UIControls/styles.css) loaded?
2. Check for errors in [UserMessageController.js](../src/modules/UIControls/UserMessageController.js)
3. Verify MutationObserver is running
4. Look for `data-processed` attribute on elements

### Bridge Communication Failing

**Check**:
1. Content script injected? (check chrome://extensions)
2. Background script running? (should see service worker)
3. Message source validation (should be 'chatgpt-extension')
4. CORS enabled on backend?

## API Endpoints

### Memory Search

**Endpoint**: `POST /conversations/fetch-memory`

**Request**:
```json
{
  "query": "What is machine learning?",
  "user_id": "84e17260-ff03-409b-bf30-0b5ba52a2ab4",
  "project_id": "11",
  "limit": 5,
  "min_similarity": 0.5
}
```

**Response**:
```json
{
  "synthesized_memory": "Based on your previous conversations:\n\n- You discussed...",
  "results": [
    {
      "conversation_id": "conv_123",
      "similarity": 0.85,
      "text": "..."
    }
  ]
}
```

### Conversation Sync

**Endpoint**: `POST /conversations`

**Request**:
```json
{
  "user_id": "84e17260-ff03-409b-bf30-0b5ba52a2ab4",
  "project_id": "11",
  "conversation_id": "conv_abc123",
  "session_id": "conv_abc123",
  "model": "gpt-4",
  "conversation": [
    {
      "role": "user",
      "message_id": "user_123",
      "text": "What is machine learning?"
    },
    {
      "role": "assistant",
      "message_id": "msg_456",
      "text": "Machine learning is..."
    }
  ]
}
```

## Contributing

### Adding Memory Injection to Other Providers

See [Provider System - Adding Memory Injection to Claude](03-provider-system.md#add-to-claude-provider)

### Customizing Memory UI

See [UI Controls - Customization](09-ui-controls.md#customization)

### Extending Event System

Add new event handlers to [registry.js](../src/content/modules/eventHandlers/registry.js)

## Related Resources

- **Extension Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/
- **MutationObserver API**: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
- **Content Security Policy**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **Chrome Extension Messaging**: https://developer.chrome.com/docs/extensions/mv3/messaging/

## License

See main project LICENSE file.

---

**Last Updated**: 2025-11-20

**Version**: 2.0.0
