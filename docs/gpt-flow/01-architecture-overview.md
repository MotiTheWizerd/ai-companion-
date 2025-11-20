# Architecture Overview

## Introduction

The AI Conversation Bridge Extension is a Chrome Manifest V3 extension designed to intercept, process, and sync AI conversations from multiple providers (ChatGPT, Claude, Qwen) to a backend API. The architecture follows modern software design patterns with a focus on modularity, extensibility, and fault tolerance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Page Context   │◄─┤Content Script│◄─┤Background Script│ │
│  │ (content.js)   │  │ (loader.js)  │  │(background.js)  │ │
│  │                │  │              │  │                 │ │
│  │ • Application  │  │ • Bridge     │  │ • API Client    │ │
│  │ • Interceptor  │  │ • Messenger  │  │ • No CSP        │ │
│  │ • Providers    │  │              │  │                 │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│         │                    │                   │           │
└─────────┼────────────────────┼───────────────────┼───────────┘
          │                    │                   │
          ▼                    ▼                   ▼
     Full DOM            postMessage          HTTP Fetch
     Access              Bridge              to Backend
```

## Architectural Patterns

### 1. Event-Driven Architecture
- **EventBus**: Central publish/subscribe system ([eventBus.js](../src/content/core/eventBus.js))
- **Handler Registry**: Decoupled event handlers ([registry.js](../src/content/modules/eventHandlers/registry.js))
- **Loose Coupling**: Components communicate via events, not direct calls

### 2. Provider Pattern
- **Abstract Base Classes**:
  - [BaseProvider](../src/modules/providers/base/BaseProvider.js)
  - [BaseStreamParser](../src/modules/providers/base/BaseStreamParser.js)
  - [BaseURLMatcher](../src/modules/providers/base/BaseURLMatcher.js)
- **Concrete Implementations**: ChatGPT, Claude, Qwen
- **Polymorphism**: Provider-specific behavior through method overrides

### 3. Registry Pattern
- **ProviderRegistry**: Singleton managing all providers ([ProviderRegistry.js](../src/modules/providers/ProviderRegistry.js))
- **EndpointRegistry**: Centralized API endpoint definitions ([EndpointRegistry.js](../src/modules/APIClient/endpoints/EndpointRegistry.js))
- **Handler Registry**: Event handler mappings

### 4. Singleton Pattern
- **ProviderRegistry**: Single instance across application
- **EventBus**: Shared event bus instance
- **Application**: Single orchestrator instance

### 5. Factory Pattern
- **Request Factories**: Dynamic request creation in API client
- **Provider Detection**: Auto-instantiation based on URL

### 6. Circuit Breaker Pattern
- **Fault Tolerance**: Prevents cascading failures ([CircuitBreaker.js](../src/modules/APIClient/services/CircuitBreaker.js))
- **Auto-Recovery**: Automatic retry after cooldown period

## Module Dependency Graph

```
Application (Orchestrator)
├── ProviderRegistry (Singleton)
│   ├── ChatGPTProvider
│   │   ├── ChatGPTStreamParser
│   │   └── ChatGPTURLMatcher
│   ├── ClaudeProvider
│   │   ├── ClaudeStreamParser
│   │   └── ClaudeURLMatcher
│   └── QwenProvider
│       ├── QwenStreamParser
│       └── QwenURLMatcher
│
├── NetworkInterceptor
│   ├── FetchHandler → uses ProviderRegistry
│   └── ChunkProcessor → emits to EventBus
│
├── ConversationManager (State)
├── MessageManager (State)
├── StorageManager (Persistence)
│
├── UIController
│   └── UserMessageController
│
├── APIClient
│   ├── ConfigurationManager
│   ├── RequestStateManager
│   ├── RequestLifecycleHandler
│   ├── EventListenerManager → subscribes to EventBus
│   └── Services:
│       ├── RequestQueue
│       ├── CircuitBreaker
│       ├── RetryPolicy
│       └── RequestExecutor
│
└── EventBus (Central Hub)
    └── HANDLER_REGISTRY
        ├── messageHandlers
        ├── streamHandlers
        ├── markerHandlers
        └── apiHandlers
```

## Core Components

### 1. Application Orchestrator
**File**: [Application.js](../src/content/core/Application.js)

**Responsibilities**:
- Initialize all modules in correct order
- Coordinate module dependencies
- Expose public API to window object
- Manage application lifecycle

**Initialization Flow**:
```javascript
constructor() {
  1. initializeProviders()  // Register all providers
  2. Create NetworkInterceptor
  3. Create ConversationManager
  4. Create MessageManager
  5. Create StorageManager
  6. Create APIClient
  7. Create UIController
}

init() {
  1. apiClient.init()
  2. interceptor.init()
  3. setupEventListeners()  // Auto-register from HANDLER_REGISTRY
  4. exposeAPI()  // window.chatGPTMessages
  5. uiController.init()
}
```

### 2. EventBus System
**File**: [eventBus.js](../src/content/core/eventBus.js)

**Implementation**:
```javascript
class EventBus {
  listeners: Map<event, callback[]>

  on(event, callback)    // Subscribe
  off(event, callback)   // Unsubscribe
  emit(event, data)      // Publish
}
```

**Event Categories**:
- **Message Events**: `MESSAGE_INPUT`, `MESSAGE_MARKER`, `MESSAGE_METADATA`
- **Stream Events**: `STREAM_START`, `STREAM_TEXT`, `STREAM_COMPLETE`, `STREAM_DONE`
- **API Events**: `API_REQUEST_*`, `API_CIRCUIT_*`, `API_SYNC_*`

### 3. Provider System
**Central Registry**: [ProviderRegistry.js](../src/modules/providers/ProviderRegistry.js)

**Provider Detection**:
```javascript
1. Application.initializeProviders() creates instances
2. Each provider registered to singleton registry
3. detectActiveProvider() checks window.location.href
4. Matches against URLMatcher.matchesDomain()
5. Sets activeProvider if match found
```

**Provider Capabilities**:
- Domain/URL matching
- Stream parsing (provider-specific formats)
- Request modification (e.g., memory injection for ChatGPT)
- Prompt extraction

### 4. Network Interceptor
**File**: [NetworkInterceptor/index.js](../src/modules/NetworkInterceptor/index.js)

**Components**:
- **FetchHandler**: Intercepts window.fetch calls
- **ChunkProcessor**: Parses stream chunks and emits events

**Interception Strategy**:
```javascript
1. Replace native window.fetch
2. Check if URL matches active provider's conversation endpoint
3. Modify request (e.g., inject memory)
4. Execute original fetch
5. Tap into response stream
6. Process chunks while passing through
7. Return unmodified response to original caller
```

### 5. API Client
**File**: [APIClient/index.js](../src/modules/APIClient/index.js)

**Architecture**:
```javascript
APIClient
├── ConfigurationManager  // Config + initialization
├── RequestStateManager   // Track request states
├── RequestLifecycleHandler  // Execute requests
├── EventListenerManager  // Subscribe to events
└── Services:
    ├── RequestQueue      // FIFO queue, max 5 concurrent
    ├── CircuitBreaker    // Fault tolerance
    ├── RetryPolicy       // Exponential backoff
    └── RequestExecutor   // HTTP execution (dual-mode)
```

**Dual-Mode Execution**:
- **Background Context**: Direct fetch (no CSP)
- **Page Context**: postMessage bridge to bypass CSP

## Data Flow Overview

```
User Types Message
    ↓
FetchHandler Intercepts Request
    ↓
Provider Modifies Request (e.g., inject memory)
    ↓
Request Sent to AI Provider
    ↓
Response Stream Intercepted
    ↓
ChunkProcessor Parses Chunks
    ↓
Events Emitted to EventBus
    ↓
Handlers Process Events
    ↓
Managers Update State
    ↓
StorageManager Saves to localStorage
    ↓
API Sync Triggered (postMessage → Background → Backend)
    ↓
Success/Failure Logged
```

## Extension Contexts

### 1. Page Context
- **Script**: [content.js](../src/content/content.js)
- **Capabilities**: Full DOM access, can intercept native fetch
- **Limitations**: CSP prevents direct API calls
- **Communication**: `window.postMessage` to content script

### 2. Content Script
- **Script**: [loader.js](../src/content/loader.js)
- **Capabilities**: Bridge between page and background
- **Role**: Message relay, no business logic
- **Communication**: Bidirectional bridge

### 3. Background Script
- **Script**: [background.js](../src/background/background.js)
- **Capabilities**: No CSP restrictions, HTTP access
- **Role**: API client, request executor
- **Communication**: `chrome.runtime.sendMessage`

## Configuration System

**Files**:
- [userSettings.json](../src/configuration/userSettings.json) - User ID
- [apiConfig.json](../src/configuration/apiConfig.json) - Backend URL, timeouts
- [constants.js](../src/content/core/constants.js) - Event names, configs
- Provider configs: [chatgpt.config.js](../src/modules/providers/chatgpt/chatgpt.config.js), etc.

**Configuration Loading**:
```javascript
Configuration Module (configuration/index.js)
    ↓
Exports USER_CONFIG (userId)
Exports API_CONFIG (baseUrl, timeout, retries, etc.)
    ↓
Used by APIClient, Application, Providers
```

## Key Design Decisions

### 1. Why Three Contexts?
- **CSP Bypass**: Page context can't make API calls due to CSP
- **DOM Access**: Only page context has full DOM access for interception
- **Security**: Background context provides unrestricted API access

### 2. Why EventBus?
- **Decoupling**: Modules don't need direct references
- **Extensibility**: Easy to add new handlers
- **Testability**: Easy to mock events

### 3. Why Provider Pattern?
- **Multi-Platform**: Support ChatGPT, Claude, Qwen with same codebase
- **Extensibility**: Add new providers without changing core logic
- **Maintainability**: Provider-specific code isolated

### 4. Why Circuit Breaker?
- **Resilience**: Prevent overwhelming failed backend
- **Auto-Recovery**: Automatic retry after cooldown
- **User Experience**: Graceful degradation

## File Structure

```
src/
├── background/
│   └── background.js           # Service worker
├── content/
│   ├── content.js              # Entry point
│   ├── loader.js               # Bridge script
│   └── core/
│       ├── Application.js      # Orchestrator
│       ├── eventBus.js         # Event system
│       └── constants.js        # Constants
├── modules/
│   ├── providers/              # Provider system
│   ├── NetworkInterceptor/     # Fetch interception
│   ├── APIClient/              # Backend communication
│   ├── ConversationManager/    # State management
│   ├── MessageManager/         # State management
│   ├── StorageManager/         # Persistence
│   └── UIControls/             # UI enhancements
└── configuration/              # Config files
```

## Extension Manifest

**File**: [manifest.json](../public/manifest.json)

**Key Settings**:
```json
{
  "manifest_version": 3,
  "version": "2.0.0",
  "background": {
    "service_worker": "src/background/background.js"
  },
  "content_scripts": [{
    "matches": ["https://chatgpt.com/*", "https://claude.ai/*", "https://chat.qwen.ai/*"],
    "js": ["src/content/loader.js"],
    "run_at": "document_start"
  }],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://chat.qwen.ai/*",
    "http://localhost:8000/*"
  ],
  "web_accessible_resources": [{
    "resources": ["src/**/*"],
    "matches": ["<all_urls>"]
  }]
}
```

## Next Steps

- **Extension Contexts**: See [02-extension-contexts.md](02-extension-contexts.md)
- **Provider System**: See [03-provider-system.md](03-provider-system.md)
- **Data Flow**: See [04-data-flow.md](04-data-flow.md)
- **Event System**: See [05-event-system.md](05-event-system.md)
