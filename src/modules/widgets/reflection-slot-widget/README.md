# ReflectionSlot Widget

A DOM observer widget that watches for new assistant message blocks in ChatGPT and injects a "reflection slot" container before each one. These slots serve as mounting points for reflection/analysis UI components.

## Overview

The ReflectionSlotWidget:
- Observes the DOM for elements with `data-message-author-role="assistant"`
- Injects a `<div class="reflection-slot">` **before** each assistant message
- Tracks slots by message ID to avoid duplicates
- Provides an API to manage slot content and states

## Structure

```
Assistant Message Block (GPT DOM):
┌─────────────────────────────────────────┐
│ <div class="reflection-slot">           │  ← Injected BEFORE
│   (your custom reflection UI here)      │
│ </div>                                  │
├─────────────────────────────────────────┤
│ <div data-message-author-role="assistant"│  ← Original GPT element
│      data-message-id="abc123">          │
│   <div class="z-0 flex min-h-[46px]...">│
│     (assistant response content)        │
│   </div>                                │
│ </div>                                  │
└─────────────────────────────────────────┘
```

## Usage

### Basic Setup

```javascript
import { ReflectionSlotWidget } from './ReflectionSlotWidget.js';

const widget = new ReflectionSlotWidget({
  document: document,
  debounceDelay: 100,
  onSlotCreated: ({ slotElement, messageElement, messageId }) => {
    console.log('New slot created for message:', messageId);
  },
  onSlotRemoved: ({ messageId }) => {
    console.log('Slot removed for message:', messageId);
  }
});

widget.attach();
```

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `document` | Document | `document` | Document reference for DOM operations |
| `debounceDelay` | number | `100` | Debounce delay (ms) for mutation observer |
| `onSlotCreated` | function | `null` | Callback when a new slot is created |
| `onSlotRemoved` | function | `null` | Callback when a slot is removed |

## API

### Core Methods

#### `attach()`
Initialize the widget and start observing for assistant messages.

```javascript
widget.attach();
```

#### `destroy()`
Clean up - stop observing, remove all slots, and reset state.

```javascript
widget.destroy();
```

#### `refresh()`
Rescan the DOM and inject slots for any missed messages.

```javascript
widget.refresh();
```

### Slot Management

#### `getSlot(messageId)`
Get a slot element by message ID.

```javascript
const slot = widget.getSlot('abc123');
```

#### `getAllSlots()`
Get an array of all slot elements.

```javascript
const slots = widget.getAllSlots();
```

#### `getSlotCount()`
Get the total number of tracked slots.

```javascript
const count = widget.getSlotCount();
```

### Content Management

#### `setSlotContent(messageId, content, state)`
Set the content of a slot. Content can be a string (HTML) or an HTMLElement.

```javascript
// With HTML string
widget.setSlotContent('abc123', '<p>Analysis complete!</p>', SLOT_STATES.READY);

// With element
const el = document.createElement('div');
el.textContent = 'Custom content';
widget.setSlotContent('abc123', el, SLOT_STATES.READY);
```

#### `setSlotLoading(messageId, text)`
Show a loading spinner with optional text.

```javascript
widget.setSlotLoading('abc123', 'Analyzing response...');
```

#### `clearSlot(messageId)`
Clear a slot's content and reset to empty state.

```javascript
widget.clearSlot('abc123');
```

### Visibility

#### `hideSlot(messageId)`
Hide a slot.

```javascript
widget.hideSlot('abc123');
```

#### `showSlot(messageId)`
Show a hidden slot.

```javascript
widget.showSlot('abc123');
```

#### `removeSlot(messageId)`
Completely remove a slot from the DOM and tracking.

```javascript
widget.removeSlot('abc123');
```

## Slot States

Import states for use with content management:

```javascript
import { SLOT_STATES, SLOT_CLASSES } from './ReflectionSlotWidget.js';

// Available states:
SLOT_STATES.EMPTY    // Collapsed, invisible
SLOT_STATES.LOADING  // Shows spinner
SLOT_STATES.READY    // Visible with content
SLOT_STATES.ERROR    // Error styling
```

## CSS Classes

The widget injects styles automatically. Available classes:

| Class | Description |
|-------|-------------|
| `.reflection-slot` | Base class |
| `.reflection-slot--empty` | Collapsed state |
| `.reflection-slot--loading` | Loading with spinner |
| `.reflection-slot--ready` | Visible with content |
| `.reflection-slot--error` | Error state styling |
| `.reflection-slot--hidden` | Force hidden |

## Integration Example

```javascript
// In WidgetController.js
initReflectionSlot() {
  if (this.reflectionSlotWidget) return;

  const isGPT = window.location.hostname.includes('chatgpt.com');
  if (!isGPT) return;

  this.reflectionSlotWidget = new ReflectionSlotWidget({
    document: document,
    onSlotCreated: ({ messageId, slotElement }) => {
      // You could populate slots here
      // e.g., fetch analysis data and display it
    }
  });

  this.reflectionSlotWidget.attach();
}
```

## Notes

- Slots are injected as **previous siblings** of assistant messages
- The widget uses a MutationObserver with debouncing for performance
- Messages are tracked by `data-message-id` attribute
- Already-processed messages are marked with `data-reflection-slot-injected`
