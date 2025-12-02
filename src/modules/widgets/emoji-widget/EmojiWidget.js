import { EMOJI_CATEGORIES, EMOJI_STORAGE_KEY } from './constants.js';

const PANEL_STYLES = `
.semantix-emoji-panel {
  position: absolute;
  min-width: 260px;
  max-width: 320px;
  padding: 10px 12px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 12, 12, 0.97);
  color: #f5f5f5;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-6px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 99999;
  font-family: "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji", system-ui, sans-serif;
}

.semantix-emoji-panel--visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.semantix-emoji-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.semantix-emoji-panel__header button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 999px;
  color: inherit;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.semantix-emoji-panel__content {
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.semantix-emoji-section {
  margin-bottom: 10px;
}

.semantix-emoji-section__title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.semantix-emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 6px;
}

.semantix-emoji-btn {
  border: none;
  border-radius: 8px;
  font-size: 22px;
  padding: 6px 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.15s ease, transform 0.15s ease;
}

.semantix-emoji-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}
`;

export class EmojiWidget {
  constructor(options = {}) {
    this.documentRef = options.document || document;
    this.onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};
    this.recentLimit = options.recentLimit || 12;
    this.storage = options.storage || this.documentRef.defaultView?.localStorage;
    this.anchorElement = null;
    this.panelElement = null;
    this.isOpen = false;
    this.recentEmojis = this.loadRecentEmojis();
    this.stylesInjected = false;
  }

  attach() {
    if (!this.panelElement) {
      this.injectStyles();
      this.panelElement = this.createPanel();
      this.documentRef.body.appendChild(this.panelElement);
    }
    return this.panelElement;
  }

  open(anchorElement) {
    this.anchorElement = anchorElement || this.anchorElement;
    if (!this.panelElement) {
      this.attach();
    }
    this.renderContent();
    this.positionPanel();
    this.panelElement.classList.add('semantix-emoji-panel--visible');
    this.isOpen = true;
  }

  close() {
    if (!this.panelElement) return;
    this.panelElement.classList.remove('semantix-emoji-panel--visible');
    this.isOpen = false;
  }

  toggle(anchorElement) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(anchorElement);
    }
  }

  createPanel() {
    const panel = this.documentRef.createElement('div');
    panel.className = 'semantix-emoji-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Semantix emoji picker');

    const header = this.documentRef.createElement('div');
    header.className = 'semantix-emoji-panel__header';
    header.innerHTML = '<span>Pick emoji</span><button type="button" aria-label="Close">×</button>';
    header.querySelector('button').addEventListener('click', () => this.close());

    const content = this.documentRef.createElement('div');
    content.className = 'semantix-emoji-panel__content';

    panel.appendChild(header);
    panel.appendChild(content);

    this.documentRef.addEventListener('click', (event) => {
      if (!this.isOpen) return;
      if (panel.contains(event.target) || event.target === this.anchorElement) {
        return;
      }
      this.close();
    });

    return panel;
  }

  renderContent() {
    if (!this.panelElement) return;
    const content = this.panelElement.querySelector('.semantix-emoji-panel__content');
    content.innerHTML = '';

    const categories = this.getCategoriesWithRecents();

    categories.forEach((category) => {
      if (!category.emojis.length) return;
      const section = this.documentRef.createElement('section');
      section.className = 'semantix-emoji-section';

      const heading = this.documentRef.createElement('div');
      heading.className = 'semantix-emoji-section__title';
      heading.textContent = category.label;

      const grid = this.documentRef.createElement('div');
      grid.className = 'semantix-emoji-grid';

      category.emojis.forEach((emoji) => {
        const btn = this.documentRef.createElement('button');
        btn.type = 'button';
        btn.className = 'semantix-emoji-btn';
        btn.textContent = emoji;
        btn.addEventListener('click', () => this.handleEmojiSelect(emoji));
        grid.appendChild(btn);
      });

      section.appendChild(heading);
      section.appendChild(grid);
      content.appendChild(section);
    });
  }

  getCategoriesWithRecents() {
    const recents = this.recentEmojis.filter(Boolean);
    const categories = [...EMOJI_CATEGORIES];

    if (recents.length) {
      categories[0] = {
        id: 'recent',
        label: 'Recently Used',
        emojis: recents,
      };
    }

    return categories;
  }

  handleEmojiSelect(emoji) {
    this.addToRecents(emoji);
    this.onSelect(emoji);
  }

  addToRecents(emoji) {
    this.recentEmojis = [emoji, ...this.recentEmojis.filter((item) => item !== emoji)];
    this.recentEmojis = this.recentEmojis.slice(0, this.recentLimit);
    try {
      this.storage?.setItem?.(EMOJI_STORAGE_KEY, JSON.stringify(this.recentEmojis));
    } catch (error) {
      console.warn('[EmojiWidget] Failed to persist recents', error);
    }
  }

  loadRecentEmojis() {
    try {
      const raw = this.storage?.getItem?.(EMOJI_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  positionPanel() {
    if (!this.panelElement || !this.anchorElement) return;
    const anchorRect = this.anchorElement.getBoundingClientRect();
    const panelRect = this.panelElement.getBoundingClientRect();

    let top = window.scrollY + anchorRect.top - panelRect.height - 8;
    const viewportTop = window.scrollY + 12;
    if (top < viewportTop) {
      top = window.scrollY + anchorRect.bottom + 8;
    }
    let left = window.scrollX + anchorRect.left + anchorRect.width / 2 - panelRect.width / 2;

    const maxLeft = window.scrollX + window.innerWidth - panelRect.width - 12;
    const minLeft = window.scrollX + 12;
    left = Math.min(Math.max(left, minLeft), maxLeft);

    this.panelElement.style.top = `${top}px`;
    this.panelElement.style.left = `${left}px`;
  }

  injectStyles() {
    if (this.stylesInjected) return;
    const styleId = 'semantix-emoji-widget-styles';
    if (this.documentRef.getElementById(styleId)) {
      this.stylesInjected = true;
      return;
    }
    const styleEl = this.documentRef.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = PANEL_STYLES;
    this.documentRef.head.appendChild(styleEl);
    this.stylesInjected = true;
  }
}
