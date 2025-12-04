/**
 * FolderTreeRenderer
 * Renders the folder hierarchy with items for the Semantix sidebar
 * Handles folder expand/collapse, context menus, inline rename, and item rendering
 * Supports selected folder state and drag & drop
 */

import {
  CLASSES,
  ICONS,
  FOLDER_ICON_MAP,
  FOLDER_UI_CONFIG,
  CONTEXT_MENU_ACTIONS,
} from "./constants.js";
import { FOLDER_COLORS } from "../../SemantixStorage/constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// FOLDER TREE RENDERER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class FolderTreeRenderer {
  /**
   * @param {Object} options
   * @param {Object} options.foldersManager - SectionFoldersManager instance
   * @param {Object} options.favoritesManager - FavoritesManager instance
   * @param {Document} options.document - Document reference
   * @param {Window} options.window - Window reference
   * @param {Function} options.onFavoriteClick - Callback when favorite is clicked
   * @param {Function} options.onFavoriteRemove - Callback when favorite is removed
   * @param {Function} options.getCurrentConversationId - Function to get current conversation ID
   * @param {Function} options.escapeHtml - Function to escape HTML
   */
  constructor(options = {}) {
    this.foldersManager = options.foldersManager;
    this.favoritesManager = options.favoritesManager;
    this.documentRef = options.document || document;
    this.windowRef = options.window || window;
    this.onFavoriteClick = options.onFavoriteClick;
    this.onFavoriteRemove = options.onFavoriteRemove;
    this.getCurrentConversationId = options.getCurrentConversationId;
    this.escapeHtml = options.escapeHtml || ((s) => s);

    // State
    this.container = null;
    this.contextMenu = null;
    this.colorPicker = null;
    this.iconPicker = null;
    this.activeRenameInput = null;
    this.structure = null;
    this.selectedFolderId = null;

    // Drag & drop state
    this.draggedItem = null;
    this.draggedItemType = null; // 'favorite' or 'folder'
    this.dropTarget = null;

    // Bind methods
    this.handleFolderClick = this.handleFolderClick.bind(this);
    this.handleFolderContextMenu = this.handleFolderContextMenu.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the renderer with a container element
   * @param {HTMLElement} container - Container element to render into
   */
  async init(container) {
    this.container = container;

    // Load selected folder state
    this.selectedFolderId = await this.favoritesManager.getSelectedFolderId();

    // Add document click listener for closing menus
    this.documentRef.addEventListener("click", this.handleDocumentClick);
    this.documentRef.addEventListener("contextmenu", this.handleDocumentClick);
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    this.documentRef.removeEventListener("click", this.handleDocumentClick);
    this.documentRef.removeEventListener(
      "contextmenu",
      this.handleDocumentClick,
    );
    this.closeAllMenus();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Render the complete folder tree with items
   * @param {Object} structure - Organized structure from FavoritesManager.getOrganizedStructure()
   */
  async render(structure) {
    if (!this.container) {
      console.error("[FolderTreeRenderer] No container set");
      return;
    }

    this.structure = structure;
    const { rootItems, folders, totalFolders } = structure;
    const currentConversationId = this.getCurrentConversationId
      ? this.getCurrentConversationId()
      : null;

    // Load selected folder state
    this.selectedFolderId = await this.favoritesManager.getSelectedFolderId();

    let html = "";

    // Root selector (click to deselect folder)
    html += this.renderRootSelector();

    // Render folder tree
    if (folders && folders.length > 0) {
      html += `<div class="${CLASSES.FOLDER_TREE}">`;
      for (const node of folders) {
        html += this.renderFolderNode(node, currentConversationId);
      }
      html += `</div>`;
    }

    // Render root items container (always rendered for drop target)
    html += `<div class="${CLASSES.ROOT_ITEMS}" data-droppable="true" data-folder-id="">`;
    if (rootItems && rootItems.length > 0) {
      for (const item of rootItems) {
        html += this.renderFavoriteItem(item, currentConversationId);
      }
    } else if (!folders || folders.length === 0) {
      // Show empty state only if no folders AND no root items
      html += this.renderEmptyState();
    }
    html += `</div>`;

    this.container.innerHTML = html;

    // Bind events
    this.bindEvents();
  }

  /**
   * Render root selector (for deselecting folder)
   * @returns {string} HTML string
   */
  renderRootSelector() {
    const isSelected = this.selectedFolderId === null;
    const selectedClass = isSelected ? "semantix-root-selector--selected" : "";

    return `
      <div class="semantix-root-selector ${selectedClass}"
           data-action="select-root"
           title="Click to add new favorites to root level">
        <span class="semantix-root-selector-icon">${ICONS.home}</span>
        <span class="semantix-root-selector-label">Root</span>
        ${isSelected ? `<span class="semantix-root-selector-badge">Selected</span>` : ""}
      </div>
    `;
  }

  /**
   * Render a folder node recursively
   * @param {Object} node - Folder tree node
   * @param {string} currentConversationId - Current active conversation ID
   * @returns {string} HTML string
   */
  renderFolderNode(node, currentConversationId) {
    const { folder, items, children, depth } = node;
    const hasChildren =
      (children && children.length > 0) || (items && items.length > 0);
    const isCollapsed = folder.collapsed;
    const isSelected = this.selectedFolderId === folder.id;
    const depthClass = `${CLASSES.FOLDER_DEPTH_0.replace("-0", `-${depth}`)}`;
    const stateClass = isCollapsed
      ? CLASSES.FOLDER_COLLAPSED
      : CLASSES.FOLDER_EXPANDED;
    const emptyClass = !hasChildren ? CLASSES.FOLDER_EMPTY : "";
    const selectedClass = isSelected ? "semantix-folder--selected" : "";
    const iconKey = FOLDER_ICON_MAP[folder.icon] || "folder";
    const folderIcon = ICONS[iconKey] || ICONS.folder;

    let html = `
      <div class="${CLASSES.FOLDER_NODE} ${depthClass} ${stateClass} ${emptyClass} ${selectedClass}"
           data-folder-id="${folder.id}"
           data-depth="${depth}"
           data-droppable="true">
        <div class="${CLASSES.FOLDER_HEADER}"
             data-folder-id="${folder.id}">
          <span class="${CLASSES.FOLDER_TOGGLE}">
            ${ICONS.chevronRightSmall}
          </span>
          <span class="${CLASSES.FOLDER_ICON}" style="color: ${folder.color}">
            ${folderIcon}
          </span>
          <span class="${CLASSES.FOLDER_NAME}">${this.escapeHtml(folder.name)}</span>
          ${isSelected ? `<span class="semantix-folder-selected-badge">✓</span>` : ""}
          <div class="${CLASSES.FOLDER_ACTIONS}">
            <button class="${CLASSES.FOLDER_ACTION_BTN}" data-action="select" data-folder-id="${folder.id}" title="Select folder for new favorites">
              ${ICONS.check}
            </button>
            <button class="${CLASSES.FOLDER_ACTION_BTN}" data-action="menu" data-folder-id="${folder.id}" title="More options">
              ${ICONS.moreHorizontal}
            </button>
          </div>
        </div>
        <div class="${CLASSES.FOLDER_CHILDREN}">
    `;

    // Render child folders
    if (children && children.length > 0) {
      for (const child of children) {
        html += this.renderFolderNode(child, currentConversationId);
      }
    }

    // Render items in this folder
    if (items && items.length > 0) {
      html += `<div class="${CLASSES.FOLDER_ITEMS}">`;
      for (const item of items) {
        html += this.renderFavoriteItem(item, currentConversationId);
      }
      html += `</div>`;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render a favorite item
   * @param {Object} item - Favorite item
   * @param {string} currentConversationId - Current active conversation ID
   * @returns {string} HTML string
   */
  renderFavoriteItem(item, currentConversationId) {
    const isActive = item.conversationId === currentConversationId;
    const activeClass = isActive ? "active" : "";

    return `
      <a href="${item.url || `/c/${item.conversationId}`}"
         class="semantix-favorite-item ${activeClass}"
         data-conversation-id="${item.conversationId}"
         data-folder-id="${item.folderId || ""}"
         title="${this.escapeHtml(item.title)}"
         draggable="true">
        <span class="semantix-favorite-star">${ICONS.starSmall}</span>
        <span class="semantix-favorite-title">${this.escapeHtml(item.title)}</span>
        <span class="semantix-favorite-remove" data-remove-id="${item.conversationId}" title="Remove from favorites">
          ${ICONS.x}
        </span>
      </a>
    `;
  }

  /**
   * Render empty state
   * @returns {string} HTML string
   */
  renderEmptyState() {
    return `
      <div class="semantix-folder-empty">
        <div class="semantix-folder-empty-icon">
          ${ICONS.folder}
        </div>
        <span>No favorites yet</span>
        <span style="font-size: 12px;">Click ⭐ on a chat to add it!</span>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT BINDING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Bind all event listeners
   */
  bindEvents() {
    if (!this.container) return;

    // Folder headers (click to expand/collapse)
    const folderHeaders = this.container.querySelectorAll(
      `.${CLASSES.FOLDER_HEADER}`,
    );
    folderHeaders.forEach((header) => {
      header.addEventListener("click", this.handleFolderClick);
      header.addEventListener("contextmenu", this.handleFolderContextMenu);
    });

    // Folder action buttons
    const actionBtns = this.container.querySelectorAll(
      `.${CLASSES.FOLDER_ACTION_BTN}`,
    );
    actionBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const folderId = btn.dataset.folderId;
        const action = btn.dataset.action;
        if (action === "menu") {
          this.showContextMenu(folderId, e);
        } else if (action === "select") {
          this.selectFolder(folderId);
        }
      });
    });

    // Root selector
    const rootSelector = this.container.querySelector(
      ".semantix-root-selector",
    );
    if (rootSelector) {
      rootSelector.addEventListener("click", () => this.selectFolder(null));
    }

    // Favorite items (click to navigate)
    const favoriteItems = this.container.querySelectorAll(
      ".semantix-favorite-item",
    );
    favoriteItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        if (this.onFavoriteClick) {
          this.onFavoriteClick(e);
        }
      });
    });

    // Favorite remove buttons
    const removeButtons = this.container.querySelectorAll(
      ".semantix-favorite-remove",
    );
    removeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onFavoriteRemove) {
          this.onFavoriteRemove(e);
        }
      });
    });

    // Drag & drop for favorite items
    const draggableItems = this.container.querySelectorAll(
      ".semantix-favorite-item[draggable='true']",
    );
    draggableItems.forEach((item) => {
      item.addEventListener("dragstart", this.handleDragStart);
      item.addEventListener("dragend", this.handleDragEnd);
    });

    // Drop targets (folders and root)
    const dropTargets = this.container.querySelectorAll(
      "[data-droppable='true']",
    );
    dropTargets.forEach((target) => {
      target.addEventListener("dragover", this.handleDragOver);
      target.addEventListener("dragleave", this.handleDragLeave);
      target.addEventListener("drop", this.handleDrop);
    });

    // Root items container as drop target (already has data attributes from render)
    const rootItemsContainer = this.container.querySelector(
      `.${CLASSES.ROOT_ITEMS}`,
    );
    if (rootItemsContainer) {
      rootItemsContainer.addEventListener("dragover", this.handleDragOver);
      rootItemsContainer.addEventListener("dragleave", this.handleDragLeave);
      rootItemsContainer.addEventListener("drop", this.handleDrop);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle folder header click (expand/collapse)
   * @param {Event} e
   */
  async handleFolderClick(e) {
    // Don't toggle if clicking on actions
    if (e.target.closest(`.${CLASSES.FOLDER_ACTIONS}`)) {
      return;
    }

    const header = e.currentTarget;
    const folderId = header.dataset.folderId;
    const folderNode = header.closest(`.${CLASSES.FOLDER_NODE}`);

    if (!folderId || !folderNode) return;

    // Toggle collapsed state
    const isCollapsed = folderNode.classList.contains(CLASSES.FOLDER_COLLAPSED);

    if (isCollapsed) {
      folderNode.classList.remove(CLASSES.FOLDER_COLLAPSED);
      folderNode.classList.add(CLASSES.FOLDER_EXPANDED);
    } else {
      folderNode.classList.remove(CLASSES.FOLDER_EXPANDED);
      folderNode.classList.add(CLASSES.FOLDER_COLLAPSED);
    }

    // Save state
    await this.foldersManager.setCollapsed(folderId, !isCollapsed);
  }

  /**
   * Handle folder right-click (context menu)
   * @param {Event} e
   */
  handleFolderContextMenu(e) {
    e.preventDefault();
    const header = e.currentTarget;
    const folderId = header.dataset.folderId;
    if (folderId) {
      this.showContextMenu(folderId, e);
    }
  }

  /**
   * Handle document click (close menus)
   * @param {Event} e
   */
  handleDocumentClick(e) {
    // Close context menu if clicking outside
    if (this.contextMenu && !this.contextMenu.contains(e.target)) {
      this.closeContextMenu();
    }

    // Close color picker if clicking outside
    if (this.colorPicker && !this.colorPicker.contains(e.target)) {
      this.closeColorPicker();
    }

    // Close icon picker if clicking outside
    if (this.iconPicker && !this.iconPicker.contains(e.target)) {
      this.closeIconPicker();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOLDER SELECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Select a folder for new favorites
   * @param {string|null} folderId - Folder ID or null for root
   */
  async selectFolder(folderId) {
    this.selectedFolderId = folderId;
    await this.favoritesManager.setSelectedFolder(folderId);

    // Update UI
    await this.refreshStructure();

    // Show toast
    if (folderId) {
      const folder = await this.foldersManager.get(folderId);
      this.showToast(
        `New favorites will be added to "${folder?.name || "folder"}"`,
        "success",
      );
    } else {
      this.showToast("New favorites will be added to root", "success");
    }
  }

  /**
   * Get the currently selected folder ID
   * @returns {string|null}
   */
  getSelectedFolderId() {
    return this.selectedFolderId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle drag start
   * @param {DragEvent} e
   */
  handleDragStart(e) {
    const target = e.currentTarget;
    const conversationId = target.dataset.conversationId;

    if (!conversationId) return;

    this.draggedItem = conversationId;
    this.draggedItemType = "favorite";

    // Set drag data
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", conversationId);

    // Add dragging class
    target.classList.add("dragging");

    console.log("[FolderTreeRenderer] Drag started:", conversationId);
  }

  /**
   * Handle drag over (for drop targets)
   * @param {DragEvent} e
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const target = e.currentTarget;

    // Add visual feedback
    if (!target.classList.contains("drag-over")) {
      // Remove from other targets first
      this.container.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
      target.classList.add("drag-over");
      this.dropTarget = target;
    }
  }

  /**
   * Handle drag leave
   * @param {DragEvent} e
   */
  handleDragLeave(e) {
    const target = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    // Only remove if actually leaving the target (not entering a child)
    if (!target.contains(relatedTarget)) {
      target.classList.remove("drag-over");
      if (this.dropTarget === target) {
        this.dropTarget = null;
      }
    }
  }

  /**
   * Handle drop
   * @param {DragEvent} e
   */
  async handleDrop(e) {
    e.preventDefault();

    const target = e.currentTarget;
    target.classList.remove("drag-over");

    if (!this.draggedItem || this.draggedItemType !== "favorite") {
      return;
    }

    // Get target folder ID
    let targetFolderId = null;

    if (target.classList.contains(CLASSES.FOLDER_NODE)) {
      targetFolderId = target.dataset.folderId;
    } else if (target.classList.contains(CLASSES.ROOT_ITEMS)) {
      targetFolderId = null; // Root level
    } else if (target.dataset.folderId !== undefined) {
      targetFolderId = target.dataset.folderId || null;
    }

    console.log(
      "[FolderTreeRenderer] Drop:",
      this.draggedItem,
      "->",
      targetFolderId,
    );

    // Move the favorite to the target folder
    try {
      await this.favoritesManager.moveToFolder(
        this.draggedItem,
        targetFolderId,
      );
      await this.refreshStructure();

      const folder = targetFolderId
        ? await this.foldersManager.get(targetFolderId)
        : null;
      const folderName = folder ? folder.name : "root";
      this.showToast(`Moved to ${folderName}`, "success");
    } catch (error) {
      console.error("[FolderTreeRenderer] Failed to move item:", error);
      this.showToast("Failed to move item", "error");
    }

    this.draggedItem = null;
    this.draggedItemType = null;
    this.dropTarget = null;
  }

  /**
   * Handle drag end (cleanup)
   * @param {DragEvent} e
   */
  handleDragEnd(e) {
    const target = e.currentTarget;
    target.classList.remove("dragging");

    // Clean up all drag-over states
    this.container.querySelectorAll(".drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });

    this.draggedItem = null;
    this.draggedItemType = null;
    this.dropTarget = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT MENU
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show context menu for a folder
   * @param {string} folderId
   * @param {Event} e
   */
  async showContextMenu(folderId, e) {
    this.closeAllMenus();

    const folder = await this.foldersManager.get(folderId);
    if (!folder) return;

    const canCreateSubfolder =
      await this.foldersManager.canCreateSubfolder(folderId);

    const menuItems = [
      { action: CONTEXT_MENU_ACTIONS.RENAME, icon: "edit", label: "Rename" },
      {
        action: CONTEXT_MENU_ACTIONS.CHANGE_COLOR,
        icon: "palette",
        label: "Change Color",
      },
      {
        action: CONTEXT_MENU_ACTIONS.CHANGE_ICON,
        icon: "folder",
        label: "Change Icon",
      },
    ];

    if (canCreateSubfolder) {
      menuItems.push({
        action: CONTEXT_MENU_ACTIONS.CREATE_SUBFOLDER,
        icon: "folderPlus",
        label: "Add Subfolder",
      });
    }

    menuItems.push({ separator: true });
    menuItems.push({
      action: CONTEXT_MENU_ACTIONS.DELETE,
      icon: "trash",
      label: "Delete",
      danger: true,
    });

    // Create menu HTML
    let menuHtml = `<div class="${CLASSES.CONTEXT_MENU}" data-folder-id="${folderId}">`;

    for (const item of menuItems) {
      if (item.separator) {
        menuHtml += `<div class="${CLASSES.CONTEXT_MENU_SEPARATOR}"></div>`;
      } else {
        const dangerClass = item.danger ? CLASSES.CONTEXT_MENU_DANGER : "";
        menuHtml += `
          <div class="${CLASSES.CONTEXT_MENU_ITEM} ${dangerClass}" data-action="${item.action}">
            <span class="${CLASSES.CONTEXT_MENU_ICON}">${ICONS[item.icon] || ""}</span>
            <span class="${CLASSES.CONTEXT_MENU_LABEL}">${item.label}</span>
          </div>
        `;
      }
    }

    menuHtml += `</div>`;

    // Create element and position
    const menu = this.documentRef.createElement("div");
    menu.innerHTML = menuHtml;
    this.contextMenu = menu.firstElementChild;

    this.documentRef.body.appendChild(this.contextMenu);

    // Position menu
    const rect = this.contextMenu.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;

    // Keep within viewport
    if (x + rect.width > this.windowRef.innerWidth) {
      x = this.windowRef.innerWidth - rect.width - 10;
    }
    if (y + rect.height > this.windowRef.innerHeight) {
      y = this.windowRef.innerHeight - rect.height - 10;
    }

    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;

    // Bind menu item clicks
    const menuItemElements = this.contextMenu.querySelectorAll(
      `.${CLASSES.CONTEXT_MENU_ITEM}`,
    );
    menuItemElements.forEach((item) => {
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.handleContextMenuAction(folderId, item.dataset.action);
      });
    });
  }

  /**
   * Close context menu
   */
  closeContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  /**
   * Handle context menu action
   * @param {string} folderId
   * @param {string} action
   */
  async handleContextMenuAction(folderId, action) {
    this.closeContextMenu();

    switch (action) {
      case CONTEXT_MENU_ACTIONS.RENAME:
        this.startRename(folderId);
        break;

      case CONTEXT_MENU_ACTIONS.CHANGE_COLOR:
        this.showColorPicker(folderId);
        break;

      case CONTEXT_MENU_ACTIONS.CHANGE_ICON:
        this.showIconPicker(folderId);
        break;

      case CONTEXT_MENU_ACTIONS.CREATE_SUBFOLDER:
        await this.createSubfolder(folderId);
        break;

      case CONTEXT_MENU_ACTIONS.DELETE:
        await this.confirmDelete(folderId);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INLINE RENAME
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start inline rename for a folder
   * @param {string} folderId
   */
  async startRename(folderId) {
    const folder = await this.foldersManager.get(folderId);
    if (!folder) return;

    const folderNode = this.container.querySelector(
      `[data-folder-id="${folderId}"].${CLASSES.FOLDER_NODE}`,
    );
    if (!folderNode) return;

    const nameElement = folderNode.querySelector(`.${CLASSES.FOLDER_NAME}`);
    if (!nameElement) return;

    // Create input
    const input = this.documentRef.createElement("input");
    input.type = "text";
    input.className = CLASSES.FOLDER_INPUT;
    input.value = folder.name;
    input.style.cssText = "flex: 1; margin: -4px 0;";

    // Replace name with input
    const originalContent = nameElement.innerHTML;
    nameElement.innerHTML = "";
    nameElement.appendChild(input);

    this.activeRenameInput = input;

    // Focus and select
    input.focus();
    input.select();

    // Handle save
    const saveRename = async () => {
      const newName = input.value.trim();
      if (newName && newName !== folder.name) {
        await this.foldersManager.rename(folderId, newName);
        await this.refreshStructure();
      } else {
        nameElement.innerHTML = originalContent;
      }
      this.activeRenameInput = null;
    };

    // Handle cancel
    const cancelRename = () => {
      nameElement.innerHTML = originalContent;
      this.activeRenameInput = null;
    };

    // Events
    input.addEventListener("blur", saveRename);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        input.removeEventListener("blur", saveRename);
        cancelRename();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLOR PICKER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show color picker for a folder
   * @param {string} folderId
   */
  async showColorPicker(folderId) {
    this.closeAllMenus();

    const folder = await this.foldersManager.get(folderId);
    if (!folder) return;

    const folderNode = this.container.querySelector(
      `[data-folder-id="${folderId}"].${CLASSES.FOLDER_NODE}`,
    );
    if (!folderNode) return;

    // Create color picker HTML
    let html = `<div class="${CLASSES.COLOR_PICKER}" data-folder-id="${folderId}">`;

    for (const color of FOLDER_COLORS) {
      const selectedClass =
        folder.color === color.value ? CLASSES.COLOR_OPTION_SELECTED : "";
      html += `
        <div class="${CLASSES.COLOR_OPTION} ${selectedClass}"
             data-color="${color.value}"
             style="background-color: ${color.value}"
             title="${color.name}">
        </div>
      `;
    }

    html += `</div>`;

    // Create element
    const picker = this.documentRef.createElement("div");
    picker.innerHTML = html;
    this.colorPicker = picker.firstElementChild;

    this.documentRef.body.appendChild(this.colorPicker);

    // Position near folder
    const rect = folderNode.getBoundingClientRect();
    this.colorPicker.style.position = "fixed";
    this.colorPicker.style.left = `${rect.right + 10}px`;
    this.colorPicker.style.top = `${rect.top}px`;

    // Keep in viewport
    const pickerRect = this.colorPicker.getBoundingClientRect();
    if (pickerRect.right > this.windowRef.innerWidth) {
      this.colorPicker.style.left = `${rect.left - pickerRect.width - 10}px`;
    }

    // Bind color clicks
    const colorOptions = this.colorPicker.querySelectorAll(
      `.${CLASSES.COLOR_OPTION}`,
    );
    colorOptions.forEach((option) => {
      option.addEventListener("click", async (e) => {
        e.stopPropagation();
        const color = option.dataset.color;
        await this.foldersManager.update(folderId, { color });
        this.closeColorPicker();
        await this.refreshStructure();
      });
    });
  }

  /**
   * Close color picker
   */
  closeColorPicker() {
    if (this.colorPicker) {
      this.colorPicker.remove();
      this.colorPicker = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ICON PICKER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show icon picker for a folder
   * @param {string} folderId
   */
  async showIconPicker(folderId) {
    this.closeAllMenus();

    const folder = await this.foldersManager.get(folderId);
    if (!folder) return;

    const folderNode = this.container.querySelector(
      `[data-folder-id="${folderId}"].${CLASSES.FOLDER_NODE}`,
    );
    if (!folderNode) return;

    // Create icon picker HTML
    let html = `<div class="semantix-icon-picker" data-folder-id="${folderId}">`;

    for (const [iconId, iconKey] of Object.entries(FOLDER_ICON_MAP)) {
      const icon = ICONS[iconKey];
      if (!icon) continue;
      const selectedClass = folder.icon === iconId ? "selected" : "";
      html += `
        <div class="semantix-icon-option ${selectedClass}"
             data-icon="${iconId}"
             title="${iconId}">
          ${icon}
        </div>
      `;
    }

    html += `</div>`;

    // Create element
    const picker = this.documentRef.createElement("div");
    picker.innerHTML = html;
    this.iconPicker = picker.firstElementChild;

    this.documentRef.body.appendChild(this.iconPicker);

    // Position near folder
    const rect = folderNode.getBoundingClientRect();
    this.iconPicker.style.position = "fixed";
    this.iconPicker.style.left = `${rect.right + 10}px`;
    this.iconPicker.style.top = `${rect.top}px`;

    // Keep in viewport
    const pickerRect = this.iconPicker.getBoundingClientRect();
    if (pickerRect.right > this.windowRef.innerWidth) {
      this.iconPicker.style.left = `${rect.left - pickerRect.width - 10}px`;
    }

    // Bind icon clicks
    const iconOptions = this.iconPicker.querySelectorAll(
      ".semantix-icon-option",
    );
    iconOptions.forEach((option) => {
      option.addEventListener("click", async (e) => {
        e.stopPropagation();
        const icon = option.dataset.icon;
        await this.foldersManager.update(folderId, { icon });
        this.closeIconPicker();
        await this.refreshStructure();
      });
    });
  }

  /**
   * Close icon picker
   */
  closeIconPicker() {
    if (this.iconPicker) {
      this.iconPicker.remove();
      this.iconPicker = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBFOLDER CREATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a subfolder
   * @param {string} parentId
   */
  async createSubfolder(parentId) {
    const folder = await this.foldersManager.create({
      name: FOLDER_UI_CONFIG.DEFAULT_FOLDER_NAME,
      parentId,
    });

    if (folder) {
      // Make sure parent is expanded
      await this.foldersManager.setCollapsed(parentId, false);
      await this.refreshStructure();
      this.startRename(folder.id);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE CONFIRMATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show delete confirmation dialog
   * @param {string} folderId
   */
  async confirmDelete(folderId) {
    const folder = await this.foldersManager.get(folderId);
    if (!folder) return;

    // Count items that will be deleted
    const itemCount =
      await this.favoritesManager.countInFolderRecursive(folderId);
    const childFolders = await this.foldersManager.getChildren(folderId);

    let message = `Are you sure you want to delete "${folder.name}"?`;
    if (itemCount > 0 || childFolders.length > 0) {
      message += `\n\nThis will also delete:`;
      if (childFolders.length > 0) {
        message += `\n• ${childFolders.length} subfolder(s)`;
      }
      if (itemCount > 0) {
        message += `\n• ${itemCount} favorite(s)`;
      }
    }

    // Create dialog
    const dialog = this.documentRef.createElement("div");
    dialog.className = "semantix-confirm-dialog";
    dialog.innerHTML = `
      <div class="semantix-confirm-dialog-content">
        <div class="semantix-confirm-dialog-title">Delete Folder</div>
        <div class="semantix-confirm-dialog-message">${message.replace(/\n/g, "<br>")}</div>
        <div class="semantix-confirm-dialog-actions">
          <button class="semantix-confirm-dialog-btn cancel">Cancel</button>
          <button class="semantix-confirm-dialog-btn confirm">Delete</button>
        </div>
      </div>
    `;

    this.documentRef.body.appendChild(dialog);

    // Handle actions
    const cancelBtn = dialog.querySelector(".cancel");
    const confirmBtn = dialog.querySelector(".confirm");

    const closeDialog = () => {
      dialog.remove();
    };

    cancelBtn.addEventListener("click", closeDialog);

    confirmBtn.addEventListener("click", async () => {
      closeDialog();
      // Delete folder with items callback
      await this.foldersManager.delete(folderId, async (fid) => {
        await this.favoritesManager.deleteInFolder(fid);
      });
      await this.refreshStructure();
      this.showToast(`Folder "${folder.name}" deleted`, "success");
    });

    // Close on backdrop click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Close all open menus
   */
  closeAllMenus() {
    this.closeContextMenu();
    this.closeColorPicker();
    this.closeIconPicker();
  }

  /**
   * Refresh the structure and re-render
   */
  async refreshStructure() {
    if (!this.favoritesManager) return;

    const structure = await this.favoritesManager.getOrganizedStructure();
    await this.render(structure);
  }

  /**
   * Show a toast notification
   * @param {string} message
   * @param {string} type - 'success' | 'error'
   */
  showToast(message, type = "success") {
    const toast = this.documentRef.createElement("div");
    toast.className = `semantix-toast ${type}`;
    toast.textContent = message;

    this.documentRef.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.add("fadeOut");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Update active state for items (when navigation changes)
   * @param {string} conversationId - Current conversation ID
   */
  updateActiveState(conversationId) {
    if (!this.container) return;

    // Remove all active states
    const activeItems = this.container.querySelectorAll(
      ".semantix-favorite-item.active",
    );
    activeItems.forEach((item) => item.classList.remove("active"));

    // Add active state to current
    if (conversationId) {
      const currentItem = this.container.querySelector(
        `.semantix-favorite-item[data-conversation-id="${conversationId}"]`,
      );
      if (currentItem) {
        currentItem.classList.add("active");
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new FolderTreeRenderer instance
 * @param {Object} options
 * @returns {FolderTreeRenderer}
 */
export function createFolderTreeRenderer(options = {}) {
  return new FolderTreeRenderer(options);
}

export default FolderTreeRenderer;
