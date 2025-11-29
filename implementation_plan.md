# Implementation Plan - Chat Timeline Feature

## Goal
Create a "Timeline" sidebar on the right side of the chat interface that displays dots for every user message. Clicking a dot should scroll the chat view to the corresponding message.

## User Review Required
> [!IMPORTANT]
> **Selector Verification**: The implementation relies on CSS selectors to find user messages in the DOM. I am using a best-guess selector for Claude (`.font-user-message`). This may need adjustment if it doesn't match the current Claude DOM structure.

## Proposed Changes

### Module: Timeline
Create a new module to handle the timeline UI and logic.

#### [NEW] [TimelineController.js](file:///c:/project/semantix-bridge/gpt-extenstion/src/modules/Timeline/TimelineController.js)
- **Responsibility**: 
    - Inject the timeline sidebar into the DOM.
    - Subscribe to `ChatHistoryManager` updates.
    - Render dots for user messages.
    - Handle click events to scroll to messages.
- **Key Methods**:
    - `init()`: Setup and injection.
    - `render(conversation)`: Update UI based on history.
    - `scrollToMessage(index)`: Find DOM element and scroll.

#### [NEW] [index.js](file:///c:/project/semantix-bridge/gpt-extenstion/src/modules/Timeline/index.js)
- Export `TimelineController`.

#### [NEW] [styles.css](file:///c:/project/semantix-bridge/gpt-extenstion/src/modules/Timeline/styles.css)
- Styles for the fixed right sidebar, dots, and hover effects.
- **Design**:
    - Fixed position right (e.g., `right: 20px`, `top: 50%`).
    - Vertical flex container.
    - Dots: small circles, distinct color for user messages.
    - Tooltip on hover (optional, maybe showing snippet).

### Module: ConversationManager
Update selectors to support finding messages.

#### [MODIFY] [ClaudeSelector.js](file:///c:/project/semantix-bridge/gpt-extenstion/src/modules/ConversationManager/selectors/providers/ClaudeSelector.js)
- Add `getUserMessage()` method returning the CSS selector for user message containers.
- **Proposed Selector**: `.font-user-message` (to be verified).

#### [MODIFY] [UniversalSelector.js](file:///c:/project/semantix-bridge/gpt-extenstion/src/modules/ConversationManager/selectors/UniversalSelector.js)
- Expose `getUserMessage()` method.

### Core: Application
Wire up the new module.

#### [MODIFY] [Application.js](file:///c:/project/semantix-bridge/gpt-extenstion/src/content/core/Application.js)
- Import `TimelineController`.
- Initialize `TimelineController` with `conversationManager` and `chatHistoryManager`.
- Call `timelineController.init()`.

## Verification Plan

### Automated Tests
- None (UI feature).

### Manual Verification
1.  **Injection**: Verify the timeline sidebar appears on the right side of the screen when a chat is loaded.
2.  **Rendering**: Verify dots appear corresponding to the number of user messages in the history.
3.  **Navigation**: Click a dot and verify the page scrolls to the correct user message.
4.  **Updates**: Send a new message and verify a new dot appears.
