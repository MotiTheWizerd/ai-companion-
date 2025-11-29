# Implementation Plan - Reliable ChatGPT Interception

The current interception mechanism fails for ChatGPT because the extension's module-based architecture loads asynchronously (`type="module"`), causing it to initialize **after** ChatGPT's application code has already saved a reference to `window.fetch` and initiated the conversation retrieval.

To solve this, we will implement an **Immediate Injection Strategy**.

## User Review Required
> [!IMPORTANT]
> This change involves injecting a script into the page context immediately at `document_start`. This is a standard pattern for extensions but requires careful handling to avoid breaking the host page.

## Proposed Changes

### 1. Create Immediate Interceptor Script
Create a new standalone script `src/content/injected/immediate-interceptor.js` that has **NO dependencies**.

**Responsibilities:**
- Wrap `window.fetch` immediately.
- Wrap `XMLHttpRequest` immediately.
- Detect ChatGPT conversation API calls (`/backend-api/conversation`).
- When a matching response is found:
    - Clone/Parse the response.
    - Dispatch a custom DOM event `semantix:chatgpt-response` with the data.
- Add a "catch-all" debug log to prove it's running first.

### 2. Update Loader Script
Modify `src/content/loader.js` to inject this new script **before** the main `content.js`.

- It must be injected as a standard script (not `type="module"`) to ensure earliest possible execution.
- It should be appended to `document.documentElement` (html tag) to run before `head` is fully parsed if possible.

### 3. Update Event Integration
Modify `src/modules/UniversalChatHistory/eventIntegration.js` (or a new handler) to listen for the `semantix:chatgpt-response` DOM event.

- Bridge this event to the internal `eventBus`.
- Trigger the existing `captureChatGPTConversationData` flow.

## Verification Plan

### Automated Tests
- None (requires browser environment).

### Manual Verification
1.  **Rebuild Extension**: `pnpm build`.
2.  **Reload Extension**: In `chrome://extensions`.
3.  **Refresh ChatGPT Page**: Open a conversation.
4.  **Check Console**:
    - Look for `[Semantix Immediate] Interceptor initialized`.
    - Look for `[Semantix Immediate] Fetch captured: ...`.
    - Look for `[Semantix Immediate] Dispatching event ...`.
    - Verify `ChatHistoryManager` captures the data.
