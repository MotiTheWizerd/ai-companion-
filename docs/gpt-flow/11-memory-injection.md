# Memory Injection System

## Overview

The Memory Injection system is a ChatGPT-specific feature that retrieves relevant context from previous conversations and injects it into the current user message before sending to ChatGPT. This provides the AI with semantic memory of past interactions.

**Note**: Currently only implemented for ChatGPT. Claude and Qwen providers do not have memory injection.

## Architecture

```
User Types Message
    ↓
FetchHandler Intercepts Request
    ↓
ChatGPTProvider.handleRequest()
    ↓
Extract User Message
    ↓
Search Backend for Relevant Memories
    (via Background Bridge to bypass CSP)
    ↓
Receive Synthesized Memory
    ↓
Prepend Memory Block to User Message
    ↓
Send Modified Request to ChatGPT
    ↓
ChatGPT Processes with Memory Context
    ↓
UserMessageController Detects Memory Block in DOM
    ↓
Transform to Collapsible UI Element
```

## Implementation

### 1. Request Interception

**File**: [ChatGPTProvider.js](../src/modules/providers/chatgpt/ChatGPTProvider.js)

**Method**: `handleRequest(body)`

**Process**:
```javascript
async handleRequest(body) {
  try {
    // Step 1: Extract current user message
    const userText = body.messages?.[0]?.content?.parts?.[0];
    if (!userText) {
      return body;  // No message to process
    }

    // Step 2: Fetch relevant memories
    const memoryData = await this.fetchMemory({
      query: userText,
      user_id: USER_CONFIG.USER_ID,
      project_id: this.config.projectId,
      limit: 5,
      min_similarity: 0.5
    });

    // Step 3: Check if memories were found
    if (!memoryData?.success || !memoryData.data?.synthesized_memory) {
      return body;  // No memories, use original body
    }

    // Step 4: Prepend memory block
    const memoryBlock = `[semantix-memory-block]\n${memoryData.data.synthesized_memory}\n[semantix-end-memory-block]\n\n`;
    const modifiedText = memoryBlock + userText;

    // Step 5: Create modified body
    const modifiedBody = JSON.parse(JSON.stringify(body));
    modifiedBody.messages[0].content.parts[0] = modifiedText;

    console.log('[ChatGPT Provider] Memory injected successfully');
    return modifiedBody;

  } catch (error) {
    console.error('[ChatGPT Provider] Memory injection failed:', error);
    return body;  // Fallback to original on error
  }
}
```

### 2. Memory Fetch (CSP Bypass)

**Challenge**: Page context cannot make HTTP requests due to Content Security Policy.

**Solution**: Use the three-context bridge to execute fetch in background script.

**Implementation**:
```javascript
fetchMemory(data) {
  return new Promise((resolve, reject) => {
    const requestId = `memory_${Date.now()}_${Math.random()}`;

    // Listen for response from content script
    const messageHandler = (event) => {
      if (event.source !== window) return;
      if (event.data.source !== 'chatgpt-extension-response') return;
      if (event.data.requestId !== requestId) return;

      // Remove listener after receiving response
      window.removeEventListener('message', messageHandler);

      if (event.data.success) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error || 'Memory fetch failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Send request to content script
    window.postMessage({
      source: 'chatgpt-extension',
      type: 'FETCH_MEMORY',
      requestId: requestId,
      data: data
    }, '*');

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Memory fetch timeout'));
    }, 10000);
  });
}
```

### 3. Content Script Bridge

**File**: [loader.js](../src/content/loader.js)

**Bridge Logic**:
```javascript
window.addEventListener('message', async (event) => {
  // Validate message source
  if (event.source !== window) return;
  if (event.data.source !== 'chatgpt-extension') return;

  const { type, data, requestId } = event.data;

  if (type === 'FETCH_MEMORY') {
    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_MEMORY',
        data: data
      });

      // Send response back to page context
      window.postMessage({
        source: 'chatgpt-extension-response',
        requestId: requestId,
        success: response.success,
        data: response.data,
        error: response.error
      }, '*');

    } catch (error) {
      // Send error back to page context
      window.postMessage({
        source: 'chatgpt-extension-response',
        requestId: requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }
});
```

### 4. Background Script Handler

**File**: [background.js](../src/background/background.js)

**Message Handler**:
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_MEMORY') {
    handleFetchMemory(message.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({
        success: false,
        error: error.message
      }));
    return true;  // Keep message channel open for async response
  }
});
```

**Fetch Memory Handler**:
```javascript
async function handleFetchMemory(data) {
  try {
    console.log('[Background] Fetching memory for query:', data.query);

    // Enqueue request to API client
    const requestId = apiClient.enqueueRequest({
      method: 'POST',
      endpoint: '/conversations/fetch-memory',
      data: {
        query: data.query,
        user_id: data.user_id,
        project_id: data.project_id,
        limit: data.limit || 5,
        min_similarity: data.min_similarity || 0.5
      }
    });

    // Wait for request completion
    const result = await waitForRequestCompletion(requestId);

    console.log('[Background] Memory fetched successfully');

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('[Background] Memory fetch failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 5. Backend API Request

**Endpoint**: `POST /conversations/fetch-memory`

**Request Body**:
```javascript
{
  query: "What is machine learning?",
  user_id: "84e17260-ff03-409b-bf30-0b5ba52a2ab4",
  project_id: "11",
  limit: 5,
  min_similarity: 0.5
}
```

**Response**:
```javascript
{
  synthesized_memory: "Based on your previous conversations:\n\n- You asked about neural networks last week\n- We discussed supervised learning algorithms\n- You were interested in deep learning applications",
  results: [
    {
      conversation_id: "conv_123",
      similarity: 0.85,
      text: "Neural networks are..."
    },
    {
      conversation_id: "conv_456",
      similarity: 0.72,
      text: "Supervised learning involves..."
    }
  ]
}
```

## Message Transformation

### Original User Message
```
What is machine learning?
```

### Request Body Before Injection
```javascript
{
  messages: [
    {
      content: {
        parts: [
          "What is machine learning?"
        ]
      }
    }
  ]
}
```

### Request Body After Injection
```javascript
{
  messages: [
    {
      content: {
        parts: [
          "[semantix-memory-block]\nBased on your previous conversations:\n\n- You asked about neural networks last week\n- We discussed supervised learning algorithms\n- You were interested in deep learning applications\n[semantix-end-memory-block]\n\nWhat is machine learning?"
        ]
      }
    }
  ]
}
```

### What ChatGPT Sees
```
[semantix-memory-block]
Based on your previous conversations:

- You asked about neural networks last week
- We discussed supervised learning algorithms
- You were interested in deep learning applications
[semantix-end-memory-block]

What is machine learning?
```

## UI Transformation

After the message is sent and appears in the DOM, the UserMessageController detects the memory block and transforms it into a collapsible UI element.

**File**: [UserMessageController.js](../src/modules/UIControls/UserMessageController.js)

### Detection Process

**MutationObserver**:
```javascript
init() {
  this.observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        mutation.addedNodes.forEach((node) => {
          this.scanForMemoryBlocks(node);
        });
      }
    });
  });

  this.observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
```

**Memory Block Detection**:
```javascript
scanForMemoryBlocks(node) {
  // Use TreeWalker to find text nodes
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    if (textNode.textContent.includes('[semantix-memory-block]')) {
      this.processMemoryBlock(textNode.parentElement);
    }
  }
}
```

### Transformation Process

**Input** (raw text in DOM):
```
[semantix-memory-block]
Based on your previous conversations:

- You asked about neural networks
- We discussed supervised learning
[semantix-end-memory-block]

What is machine learning?
```

**Output** (transformed HTML):
```html
<div class="semantix-memory-container collapsed">
  <div class="semantix-memory-header" onclick="toggleMemoryBlock()">
    💭 Memory Context
    <span class="semantix-memory-toggle-icon">▼</span>
  </div>
  <div class="semantix-memory-content">
    Based on your previous conversations:

    - You asked about neural networks
    - We discussed supervised learning
  </div>
</div>
<div>What is machine learning?</div>
```

**Implementation**:
```javascript
processMemoryBlock(element) {
  const text = element.textContent;

  // Extract memory content
  const startMarker = '[semantix-memory-block]';
  const endMarker = '[semantix-end-memory-block]';

  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) return;

  // Extract parts
  const memoryContent = text.substring(
    startIndex + startMarker.length,
    endIndex
  ).trim();

  const remainingText = text.substring(endIndex + endMarker.length).trim();

  // Create container
  const container = document.createElement('div');
  container.className = 'semantix-memory-container collapsed';
  container.setAttribute('data-processed', 'true');

  // Create header
  const header = document.createElement('div');
  header.className = 'semantix-memory-header';
  header.innerHTML = `
    💭 Memory Context
    <span class="semantix-memory-toggle-icon">▼</span>
  `;
  header.onclick = () => this.toggleMemoryBlock(container);

  // Create content
  const content = document.createElement('div');
  content.className = 'semantix-memory-content';
  content.textContent = memoryContent;

  // Assemble
  container.appendChild(header);
  container.appendChild(content);

  // Replace original element
  const wrapper = document.createElement('div');
  wrapper.appendChild(container);

  if (remainingText) {
    const textNode = document.createElement('div');
    textNode.textContent = remainingText;
    wrapper.appendChild(textNode);
  }

  element.replaceWith(wrapper);
}
```

**Toggle Functionality**:
```javascript
toggleMemoryBlock(container) {
  const isCollapsed = container.classList.contains('collapsed');
  const icon = container.querySelector('.semantix-memory-toggle-icon');

  if (isCollapsed) {
    container.classList.remove('collapsed');
    icon.textContent = '▲';
  } else {
    container.classList.add('collapsed');
    icon.textContent = '▼';
  }
}
```

### Styling

**File**: [styles.css](../src/modules/UIControls/styles.css)

```css
.semantix-memory-container {
  background: #f0f4f8;
  border: 1px solid #d1d9e0;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.semantix-memory-header {
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  background: #e8eef3;
}

.semantix-memory-header:hover {
  background: #dce4eb;
}

.semantix-memory-toggle-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.semantix-memory-content {
  padding: 12px;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
  max-height: 500px;
  overflow-y: auto;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.semantix-memory-container.collapsed .semantix-memory-content {
  max-height: 0;
  padding: 0 12px;
  overflow: hidden;
}
```

## Complete Flow Diagram

```
1. User Types "What is ML?" in ChatGPT
    ↓
2. ChatGPT Frontend: fetch('/backend-api/conversation', {...})
    ↓
3. FetchHandler Intercepts
    ↓
4. Extract: userText = "What is ML?"
    ↓
5. Page Context: window.postMessage({
     type: 'FETCH_MEMORY',
     data: { query: "What is ML?", user_id, project_id }
   })
    ↓
6. Content Script: chrome.runtime.sendMessage({...})
    ↓
7. Background Script: apiClient.enqueueRequest({
     endpoint: '/conversations/fetch-memory',
     data: {...}
   })
    ↓
8. HTTP POST to localhost:8000/conversations/fetch-memory
    ↓
9. Backend Searches Vector DB
    ↓
10. Backend Returns: { synthesized_memory: "You discussed..." }
    ↓
11. Background → Content → Page (response flows back)
    ↓
12. Prepend Memory Block:
    "[semantix-memory-block]\nYou discussed...\n[semantix-end-memory-block]\n\nWhat is ML?"
    ↓
13. Send Modified Request to ChatGPT
    ↓
14. ChatGPT Processes with Context
    ↓
15. Response Appears in DOM
    ↓
16. MutationObserver Detects Memory Block
    ↓
17. Transform to Collapsible UI
    ↓
18. User Sees: [💭 Memory Context ▼] What is ML?
```

## Configuration

**Memory Search Parameters** (in [ChatGPTProvider.js](../src/modules/providers/chatgpt/ChatGPTProvider.js)):

```javascript
{
  limit: 5,              // Max number of memories to retrieve
  min_similarity: 0.5    // Minimum similarity score (0.0 to 1.0)
}
```

**Project ID** (in [chatgpt.config.js](../src/modules/providers/chatgpt/chatgpt.config.js)):

```javascript
{
  projectId: '11'  // Backend project ID for ChatGPT conversations
}
```

**User ID** (in [userSettings.json](../src/configuration/userSettings.json)):

```javascript
{
  userId: '84e17260-ff03-409b-bf30-0b5ba52a2ab4'
}
```

## Error Handling

### 1. Memory Fetch Failure

```javascript
try {
  const memoryData = await this.fetchMemory({...});
} catch (error) {
  console.error('[ChatGPT Provider] Memory fetch failed:', error);
  return body;  // Continue with original message
}
```

**Result**: User message sent without memory context, conversation continues normally.

### 2. Timeout

```javascript
setTimeout(() => {
  window.removeEventListener('message', messageHandler);
  reject(new Error('Memory fetch timeout'));
}, 10000);
```

**Result**: After 10 seconds, fallback to original message.

### 3. Backend API Error

```javascript
if (!memoryData?.success || !memoryData.data?.synthesized_memory) {
  return body;  // No memories found or API error
}
```

**Result**: Continue without memory injection.

### 4. Invalid Response Format

```javascript
try {
  const memoryBlock = `[semantix-memory-block]\n${memoryData.data.synthesized_memory}\n[semantix-end-memory-block]\n\n`;
} catch (error) {
  console.error('[ChatGPT Provider] Invalid memory format:', error);
  return body;
}
```

**Result**: Original message sent.

## Performance Considerations

### 1. Async/Await for Memory Fetch

- Request modification is async (waits for memory fetch)
- ChatGPT request is delayed by ~200-500ms
- User sees normal "sending" UI during this time

### 2. Timeout Protection

- 10-second timeout prevents indefinite hanging
- Fast-fail on network errors

### 3. Caching Opportunity

**Potential Enhancement**:
```javascript
// Cache recent memory searches
const memoryCache = new Map();

async handleRequest(body) {
  const cacheKey = userText.substring(0, 100);

  if (memoryCache.has(cacheKey)) {
    return useCachedMemory(cacheKey);
  }

  const memoryData = await this.fetchMemory({...});
  memoryCache.set(cacheKey, memoryData);

  // ...
}
```

### 4. UI Transformation Performance

- MutationObserver only processes new nodes
- TreeWalker efficiently finds text nodes
- Already-processed blocks marked with `data-processed` attribute

## Debugging

### Enable Memory Injection Logs

```javascript
// In ChatGPTProvider.js, add verbose logging:
console.log('[Memory] User message:', userText);
console.log('[Memory] Search params:', { query, user_id, project_id });
console.log('[Memory] Retrieved memories:', memoryData);
console.log('[Memory] Modified message:', modifiedText);
```

### Inspect Modified Request

**In Browser DevTools Console**:
```javascript
// Intercept before sending
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
  if (url.includes('/conversation')) {
    console.log('Request body:', JSON.parse(options.body));
  }
  return originalFetch.apply(this, arguments);
}
```

### View Memory Block in DOM

**Inspect Element**: Look for elements with class `semantix-memory-container`

### Monitor Bridge Messages

```javascript
// In loader.js
window.addEventListener('message', (event) => {
  if (event.data.source?.includes('chatgpt-extension')) {
    console.log('[Bridge Message]', event.data);
  }
});
```

## Extending Memory Injection

### Add to Claude Provider

1. Implement `handleRequest()` in ClaudeProvider
2. Extract user prompt from Claude's request format
3. Use same `fetchMemory()` pattern
4. Inject into Claude's request body format
5. Test with Claude's API structure

### Add to Qwen Provider

1. Implement `handleRequest()` in QwenProvider
2. Extract prompt from Qwen's request format
3. Fetch and inject memories
4. Handle Qwen-specific message structure

### Custom Memory Formatting

```javascript
async handleRequest(body) {
  const memoryData = await this.fetchMemory({...});

  // Custom format
  const memoryBlock = `
    📚 Context from your previous conversations:
    ${memoryData.data.synthesized_memory}
    ---
    Current question: ${userText}
  `;

  // Inject with custom format
  modifiedBody.messages[0].content.parts[0] = memoryBlock;
  return modifiedBody;
}
```

## Related Documentation

- **Provider System**: [03-provider-system.md](03-provider-system.md)
- **Extension Contexts**: [02-extension-contexts.md](02-extension-contexts.md)
- **UI Controls**: [09-ui-controls.md](09-ui-controls.md)
- **Data Flow**: [04-data-flow.md](04-data-flow.md)
