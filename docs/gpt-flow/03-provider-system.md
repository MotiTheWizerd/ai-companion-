# Provider System

## Overview

The Provider System enables the extension to support multiple AI platforms (ChatGPT, Claude, Qwen) through a unified interface. It uses the **Provider Pattern** with abstract base classes and concrete implementations for each platform.

## Architecture

```
ProviderRegistry (Singleton)
    ├── register(provider)
    ├── detectActiveProvider()
    └── getActiveProvider()
          ↓
    Returns: BaseProvider implementation
          ↓
    ┌─────┴─────┬─────────┬──────────┐
    │           │         │          │
ChatGPTProvider ClaudeProvider QwenProvider
    │           │         │          │
    ├── Parser  ├── Parser ├── Parser
    ├── Matcher ├── Matcher ├── Matcher
    └── Config  └── Config  └── Config
```

## Base Classes

### 1. BaseProvider

**File**: [BaseProvider.js](../src/modules/providers/base/BaseProvider.js)

**Abstract Interface**:
```javascript
class BaseProvider {
  // Required implementations
  getName()           // Returns provider name (e.g., 'ChatGPT')
  getURLMatcher()     // Returns URLMatcher instance
  getStreamParser()   // Returns StreamParser instance

  // Optional implementations
  handleRequest(body)     // Modify request before sending
  extractPrompt(body)     // Extract user prompt from request body

  // Implemented methods
  isActive()          // Checks if provider is active (uses URLMatcher)
}
```

**Usage**:
```javascript
const provider = ProviderRegistry.getInstance().getActiveProvider();
if (provider) {
  const parser = provider.getStreamParser();
  const isConversationUrl = provider.getURLMatcher().isConversationEndpoint(url);

  // Optional: modify request
  if (provider.handleRequest) {
    modifiedBody = await provider.handleRequest(requestBody);
  }
}
```

### 2. BaseStreamParser

**File**: [BaseStreamParser.js](../src/modules/providers/base/BaseStreamParser.js)

**Abstract Interface**:
```javascript
class BaseStreamParser {
  // Required implementations
  parseChunk(line)              // Parse raw stream line to object
  extractTextFromDelta(data)    // Extract text chunks from parsed data
  extractCompletion(data)       // Detect stream completion
  extractMessageMarker(data)    // Extract message markers
  extractMetadata(data)         // Extract metadata (model, IDs, etc.)
  extractInputMessage(data)     // Extract user input message
}
```

**Return Types**:
```javascript
// extractTextFromDelta
{ type: 'stream_start', messageId, conversationId, model?, text? }
{ type: 'text_chunk', text }

// extractCompletion
{ type: 'stream_complete', conversationId }

// extractMetadata
{ type: 'metadata', model, messageId, conversationId, ... }

// extractInputMessage
{ type: 'input_message', text, role: 'user' }
```

### 3. BaseURLMatcher

**File**: [BaseURLMatcher.js](../src/modules/providers/base/BaseURLMatcher.js)

**Abstract Interface**:
```javascript
class BaseURLMatcher {
  // Required implementations
  matchesDomain(url)              // Check if URL belongs to provider
  isConversationEndpoint(url)     // Check if URL is conversation endpoint
}
```

**Usage**:
```javascript
const matcher = provider.getURLMatcher();

if (matcher.matchesDomain(window.location.href)) {
  // This provider is active on current page
}

if (matcher.isConversationEndpoint(requestUrl)) {
  // This request should be intercepted and processed
}
```

## Provider Registry

**File**: [ProviderRegistry.js](../src/modules/providers/ProviderRegistry.js)

**Singleton Implementation**:
```javascript
class ProviderRegistry {
  static instance = null;
  providers = new Map();
  activeProvider = null;

  static getInstance() {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider) {
    this.providers.set(provider.getName(), provider);
  }

  detectActiveProvider() {
    const currentUrl = window.location.href;
    for (const [name, provider] of this.providers) {
      if (provider.isActive()) {
        this.activeProvider = provider;
        return provider;
      }
    }
    return null;
  }

  getActiveProvider() {
    return this.activeProvider;
  }

  getProvider(name) {
    return this.providers.get(name);
  }
}
```

**Registration Flow** (in [Application.js](../src/content/core/Application.js)):
```javascript
initializeProviders() {
  const registry = ProviderRegistry.getInstance();

  // Register all providers
  registry.register(new ChatGPTProvider());
  registry.register(new ClaudeProvider());
  registry.register(new QwenProvider());

  // Detect active provider based on current URL
  registry.detectActiveProvider();
}
```

## ChatGPT Provider

### Files
- **Provider**: [ChatGPTProvider.js](../src/modules/providers/chatgpt/ChatGPTProvider.js)
- **Parser**: [ChatGPTStreamParser.js](../src/modules/providers/chatgpt/ChatGPTStreamParser.js)
- **Matcher**: [ChatGPTURLMatcher.js](../src/modules/providers/chatgpt/ChatGPTURLMatcher.js)
- **Config**: [chatgpt.config.js](../src/modules/providers/chatgpt/chatgpt.config.js)

### Configuration

```javascript
export const CHATGPT_CONFIG = {
  name: 'ChatGPT',
  domain: 'chatgpt.com',
  projectId: '11',
  endpoints: {
    conversation: '/conversation'
  },
  streamFormat: 'sse'
};
```

### URL Matching

```javascript
class ChatGPTURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('chatgpt.com');
  }

  isConversationEndpoint(url) {
    return url.includes('/backend-api/conversation') ||
           url.includes('/backend-api/f/conversation');
  }
}
```

**Conversation URL Pattern**:
```
https://chatgpt.com/backend-api/conversation
https://chatgpt.com/backend-api/f/conversation
```

**ConversationId Extraction** (from URL):
```javascript
// URL format: /chat_conversations/{conversationId}/completion
const match = url.match(/chat_conversations\/([^\/]+)/);
const conversationId = match ? match[1] : null;
```

### Request Modification (Memory Injection)

ChatGPT is the only provider with `handleRequest` implementation:

```javascript
async handleRequest(body) {
  try {
    // 1. Extract user's current message
    const userText = body.messages?.[0]?.content?.parts?.[0];
    if (!userText) return body;

    // 2. Fetch relevant memories from backend
    const memoryData = await this.fetchMemory({
      query: userText,
      user_id: USER_CONFIG.USER_ID,
      project_id: this.config.projectId,
      limit: 5,
      min_similarity: 0.5
    });

    if (!memoryData?.success || !memoryData.data?.synthesized_memory) {
      return body;
    }

    // 3. Prepend memory block to user message
    const memoryBlock = `[semantix-memory-block]\n${memoryData.data.synthesized_memory}\n[semantix-end-memory-block]\n\n`;
    const modifiedText = memoryBlock + userText;

    // 4. Create modified body
    const modifiedBody = JSON.parse(JSON.stringify(body));
    modifiedBody.messages[0].content.parts[0] = modifiedText;

    return modifiedBody;
  } catch (error) {
    console.error('[ChatGPT Provider] Request modification failed:', error);
    return body;
  }
}
```

**Memory Fetch via Background Bridge**:
```javascript
fetchMemory(data) {
  return new Promise((resolve, reject) => {
    const requestId = `memory_${Date.now()}`;

    window.addEventListener('message', function handler(event) {
      if (event.data.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (event.data.success) {
          resolve(event.data);
        } else {
          reject(new Error(event.data.error));
        }
      }
    });

    window.postMessage({
      source: 'chatgpt-extension',
      type: 'FETCH_MEMORY',
      requestId,
      data
    }, '*');
  });
}
```

### Stream Parsing

**Stream Format**: Server-Sent Events (SSE) with JSON data

**Example Stream**:
```
data: {"o":"add","v":{"message":{"id":"msg_123"},"conversation_id":"conv_456"}}

data: {"o":"patch","v":[{"p":"/message/content/parts/0","o":"append","v":"Hello"}]}

data: {"o":"patch","v":[{"p":"/message/content/parts/0","o":"append","v":" world"}]}

data: {"type":"message_stream_complete","conversation_id":"conv_456"}

data: [DONE]
```

**Parser Implementation**:
```javascript
class ChatGPTStreamParser extends BaseStreamParser {
  parseChunk(line) {
    if (!line.startsWith('data: ')) return null;

    const data = line.slice(6).trim();
    if (data === '[DONE]') {
      return { type: 'done' };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  extractTextFromDelta(data) {
    // Stream start: {"o":"add","v":{"message":{...}}}
    if (data.o === 'add' && data.v?.message) {
      return {
        type: 'stream_start',
        messageId: data.v.message.id,
        conversationId: data.v.conversation_id,
        model: data.v.message.metadata?.model_slug
      };
    }

    // Text chunks: {"o":"patch","v":[{"o":"append","v":"text"}]}
    if (data.o === 'patch' && Array.isArray(data.v)) {
      for (const patch of data.v) {
        if (patch.o === 'append' && typeof patch.v === 'string') {
          return {
            type: 'text_chunk',
            text: patch.v
          };
        }
      }
    }

    return null;
  }

  extractCompletion(data) {
    if (data.type === 'message_stream_complete') {
      return {
        type: 'stream_complete',
        conversationId: data.conversation_id
      };
    }
    return null;
  }

  extractMetadata(data) {
    if (data.type === 'server_ste_metadata') {
      return {
        type: 'metadata',
        model: data.model_slug,
        messageId: data.message_id,
        conversationId: data.conversation_id
      };
    }
    return null;
  }

  extractInputMessage(data) {
    if (data.type === 'input_message') {
      return {
        type: 'input_message',
        text: data.message?.content?.parts?.[0],
        role: 'user'
      };
    }
    return null;
  }
}
```

## Claude Provider

### Files
- **Provider**: [ClaudeProvider.js](../src/modules/providers/claude/ClaudeProvider.js)
- **Parser**: [ClaudeStreamParser.js](../src/modules/providers/claude/ClaudeStreamParser.js)
- **Matcher**: [ClaudeURLMatcher.js](../src/modules/providers/claude/ClaudeURLMatcher.js)
- **Config**: [claude.config.js](../src/modules/providers/claude/claude.config.js)

### Configuration

```javascript
export const CLAUDE_CONFIG = {
  name: 'Claude',
  domain: 'claude.ai',
  projectId: '11',
  endpoints: {
    conversation: '/api/organizations'
  },
  streamFormat: 'sse'
};
```

### URL Matching

```javascript
class ClaudeURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('claude.ai');
  }

  isConversationEndpoint(url) {
    return url.includes('/completion');
  }
}
```

**Conversation URL Pattern**:
```
https://claude.ai/api/organizations/{org_id}/chat_conversations/{conversation_id}/completion
```

### Stream Parsing

**Stream Format**: SSE with event types and JSON data

**Example Stream**:
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_123","model":"claude-3-5-sonnet"}}

event: content_block_start
data: {"type":"content_block_start","index":0}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}

event: content_block_stop
data: {"type":"content_block_stop"}

event: message_stop
data: {"type":"message_stop"}
```

**Parser Implementation**:
```javascript
class ClaudeStreamParser extends BaseStreamParser {
  constructor() {
    super();
    this.currentEventType = null;
  }

  parseChunk(line) {
    // SSE format: "event: type" or "data: json"
    if (line.startsWith('event: ')) {
      this.currentEventType = line.slice(7).trim();
      return null;
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      try {
        const parsed = JSON.parse(data);
        return { ...parsed, event: this.currentEventType };
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  extractTextFromDelta(data) {
    // Stream start
    if (data.type === 'message_start') {
      return {
        type: 'stream_start',
        messageId: data.message?.id,
        model: data.message?.model
      };
    }

    // Text chunks
    if (data.type === 'content_block_delta' &&
        data.delta?.type === 'text_delta') {
      return {
        type: 'text_chunk',
        text: data.delta.text
      };
    }

    return null;
  }

  extractCompletion(data) {
    if (data.type === 'message_stop') {
      return {
        type: 'stream_complete'
      };
    }
    return null;
  }

  extractMessageMarker(data) {
    if (data.type === 'content_block_start' ||
        data.type === 'content_block_stop') {
      return {
        type: 'marker',
        marker: data.type,
        index: data.index
      };
    }
    return null;
  }
}
```

## Qwen Provider

### Files
- **Provider**: [QwenProvider.js](../src/modules/providers/qwen/QwenProvider.js)
- **Parser**: [QwenStreamParser.js](../src/modules/providers/qwen/QwenStreamParser.js)
- **Matcher**: [QwenURLMatcher.js](../src/modules/providers/qwen/QwenURLMatcher.js)
- **Config**: [qwen.config.js](../src/modules/providers/qwen/qwen.config.js)

### Configuration

```javascript
export const QWEN_CONFIG = {
  name: 'Qwen',
  domain: 'chat.qwen.ai',
  projectId: '11',
  endpoints: {
    conversation: '/c/'
  },
  streamFormat: 'sse'
};
```

### URL Matching

```javascript
class QwenURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('chat.qwen.ai');
  }

  isConversationEndpoint(url) {
    // Matches: /api/v1/chat/conversation/{id}/message
    return url.includes('/api/v1/chat/conversation') &&
           url.includes('/message');
  }
}
```

### Stream Parsing

**Stream Format**: SSE with "data:" prefix and JSON

**Example Stream**:
```
data: {"event":"response.created","data":{"chat_id":"123","response_id":"456"}}

data: {"choices":[{"delta":{"content":"Hello","status":"typing"}}]}

data: {"choices":[{"delta":{"content":" world","status":"typing"}}]}

data: {"choices":[{"delta":{"status":"finished"}}],"usage":{"input_tokens":10,"output_tokens":5}}
```

**Parser Implementation**:
```javascript
class QwenStreamParser extends BaseStreamParser {
  parseChunk(line) {
    if (!line.startsWith('data: ')) return null;

    const data = line.slice(6).trim();
    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  extractTextFromDelta(data) {
    // Stream start
    if (data.event === 'response.created') {
      return {
        type: 'stream_start',
        conversationId: data.data?.chat_id,
        messageId: data.data?.response_id
      };
    }

    // Text chunks
    const delta = data.choices?.[0]?.delta;
    if (delta?.content && delta?.status === 'typing') {
      return {
        type: 'text_chunk',
        text: delta.content
      };
    }

    return null;
  }

  extractCompletion(data) {
    const delta = data.choices?.[0]?.delta;
    if (delta?.status === 'finished') {
      return {
        type: 'stream_complete'
      };
    }
    return null;
  }

  extractMetadata(data) {
    if (data.usage) {
      return {
        type: 'metadata',
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      };
    }
    return null;
  }
}
```

## Adding a New Provider

### Step 1: Create Provider Files

```
src/modules/providers/newprovider/
├── NewProvider.js
├── NewStreamParser.js
├── NewURLMatcher.js
└── newprovider.config.js
```

### Step 2: Implement Config

```javascript
// newprovider.config.js
export const NEWPROVIDER_CONFIG = {
  name: 'NewProvider',
  domain: 'newprovider.com',
  projectId: '11',
  endpoints: {
    conversation: '/api/chat'
  },
  streamFormat: 'sse'
};
```

### Step 3: Implement URLMatcher

```javascript
// NewURLMatcher.js
import { BaseURLMatcher } from '../base/BaseURLMatcher.js';

export class NewURLMatcher extends BaseURLMatcher {
  matchesDomain(url) {
    return url.includes('newprovider.com');
  }

  isConversationEndpoint(url) {
    return url.includes('/api/chat');
  }
}
```

### Step 4: Implement StreamParser

```javascript
// NewStreamParser.js
import { BaseStreamParser } from '../base/BaseStreamParser.js';

export class NewStreamParser extends BaseStreamParser {
  parseChunk(line) {
    // Parse provider-specific format
  }

  extractTextFromDelta(data) {
    // Extract stream_start and text_chunk
  }

  extractCompletion(data) {
    // Detect stream_complete
  }

  extractMetadata(data) {
    // Extract metadata
  }

  extractMessageMarker(data) {
    // Extract markers
  }

  extractInputMessage(data) {
    // Extract user input
  }
}
```

### Step 5: Implement Provider

```javascript
// NewProvider.js
import { BaseProvider } from '../base/BaseProvider.js';
import { NewStreamParser } from './NewStreamParser.js';
import { NewURLMatcher } from './NewURLMatcher.js';
import { NEWPROVIDER_CONFIG } from './newprovider.config.js';

export class NewProvider extends BaseProvider {
  constructor() {
    super();
    this.config = NEWPROVIDER_CONFIG;
    this.streamParser = new NewStreamParser();
    this.urlMatcher = new NewURLMatcher();
  }

  getName() {
    return this.config.name;
  }

  getStreamParser() {
    return this.streamParser;
  }

  getURLMatcher() {
    return this.urlMatcher;
  }

  // Optional: Modify requests
  async handleRequest(body) {
    return body;
  }
}
```

### Step 6: Register Provider

```javascript
// In Application.js initializeProviders()
import { NewProvider } from '../modules/providers/newprovider/NewProvider.js';

initializeProviders() {
  const registry = ProviderRegistry.getInstance();
  registry.register(new ChatGPTProvider());
  registry.register(new ClaudeProvider());
  registry.register(new QwenProvider());
  registry.register(new NewProvider());  // Add here

  registry.detectActiveProvider();
}
```

### Step 7: Update Manifest

```json
{
  "content_scripts": [{
    "matches": [
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://chat.qwen.ai/*",
      "https://newprovider.com/*"
    ],
    "js": ["src/content/loader.js"],
    "run_at": "document_start"
  }],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://chat.qwen.ai/*",
    "https://newprovider.com/*",
    "http://localhost:8000/*"
  ]
}
```

## Provider Detection Flow

```
Page loads on chatgpt.com
    ↓
Application.initializeProviders()
    ↓
ProviderRegistry.register(ChatGPTProvider)
ProviderRegistry.register(ClaudeProvider)
ProviderRegistry.register(QwenProvider)
    ↓
ProviderRegistry.detectActiveProvider()
    ↓
For each provider:
    provider.isActive()
        ↓
    provider.getURLMatcher().matchesDomain(window.location.href)
        ↓
    Returns true for ChatGPTProvider
    ↓
Sets activeProvider = ChatGPTProvider
    ↓
FetchHandler uses activeProvider for interception
```

## Related Documentation

- **Network Interception**: [08-network-interception.md](08-network-interception.md)
- **Memory Injection**: [11-memory-injection.md](11-memory-injection.md)
- **Data Flow**: [04-data-flow.md](04-data-flow.md)
