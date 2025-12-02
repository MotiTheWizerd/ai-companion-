# Semantix Emoji Widget

Isolated, plug-and-play emoji picker component used by the widget toolbar. Nothing is bundled automatically—import it when you need the popup.

## Structure
- `constants.js` – curated emoji sets and storage key.
- `EmojiWidget.js` – class that renders the popup, handles selection, recents persistence.
- `styles.css` – standalone styles (scope via `.semantix-emoji-*`).

## Usage
```
import { EmojiWidget } from '../../modules/widgets/emoji-widget/EmojiWidget.js';

const emojiWidget = new EmojiWidget({
  onSelect: (emoji) => console.log('Selected', emoji),
});
emojiWidget.attach();

button.addEventListener('click', () => emojiWidget.toggle(button));
```
Include `styles.css` wherever you mount the widget.
