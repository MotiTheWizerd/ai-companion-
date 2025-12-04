/**
 * Folder Styles for Semantix Sidebar Widget
 * Comprehensive CSS for folder tree, context menu, color picker, folder UI,
 * selected folder state, and drag & drop
 */

import { CLASSES, FOLDER_UI_CONFIG } from "./constants.js";

export const FOLDER_STYLES = `
/* ═══════════════════════════════════════════════════════════════════════════
   FOLDER TREE CONTAINER
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.FOLDER_TREE} {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOLDER NODE
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.FOLDER_NODE} {
  display: flex;
  flex-direction: column;
}

.${CLASSES.FOLDER_HEADER} {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  user-select: none;
  min-height: 32px;
}

.${CLASSES.FOLDER_HEADER}:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
}

/* Depth-based indentation */
.${CLASSES.FOLDER_DEPTH_0} > .${CLASSES.FOLDER_HEADER} {
  padding-left: 8px;
}

.${CLASSES.FOLDER_DEPTH_1} > .${CLASSES.FOLDER_HEADER} {
  padding-left: ${8 + FOLDER_UI_CONFIG.INDENT_PER_LEVEL}px;
}

.${CLASSES.FOLDER_DEPTH_2} > .${CLASSES.FOLDER_HEADER} {
  padding-left: ${8 + FOLDER_UI_CONFIG.INDENT_PER_LEVEL * 2}px;
}

/* Folder toggle chevron */
.${CLASSES.FOLDER_TOGGLE} {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #8e8e8e);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.${CLASSES.FOLDER_NODE}.${CLASSES.FOLDER_EXPANDED} > .${CLASSES.FOLDER_HEADER} > .${CLASSES.FOLDER_TOGGLE} {
  transform: rotate(90deg);
}

.${CLASSES.FOLDER_NODE}.${CLASSES.FOLDER_EMPTY} > .${CLASSES.FOLDER_HEADER} > .${CLASSES.FOLDER_TOGGLE} {
  opacity: 0;
  pointer-events: none;
}

/* Folder icon */
.${CLASSES.FOLDER_ICON} {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.${CLASSES.FOLDER_ICON} svg {
  width: 16px;
  height: 16px;
}

/* Folder name */
.${CLASSES.FOLDER_NAME} {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #ececec);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

/* Folder actions (show on hover) */
.${CLASSES.FOLDER_ACTIONS} {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.${CLASSES.FOLDER_HEADER}:hover .${CLASSES.FOLDER_ACTIONS} {
  opacity: 1;
}

.${CLASSES.FOLDER_ACTION_BTN} {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--text-secondary, #8e8e8e);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  padding: 0;
}

.${CLASSES.FOLDER_ACTION_BTN}:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #ececec);
}

.${CLASSES.FOLDER_ACTION_BTN} svg {
  width: 14px;
  height: 14px;
}

/* Folder children container */
.${CLASSES.FOLDER_CHILDREN} {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  transition: max-height 0.2s ease, opacity 0.2s ease;
}

.${CLASSES.FOLDER_NODE}.${CLASSES.FOLDER_COLLAPSED} > .${CLASSES.FOLDER_CHILDREN} {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

.${CLASSES.FOLDER_NODE}.${CLASSES.FOLDER_EXPANDED} > .${CLASSES.FOLDER_CHILDREN} {
  max-height: 2000px;
  opacity: 1;
}

/* Folder items (favorites inside folder) */
.${CLASSES.FOLDER_ITEMS} {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Indent items inside folders */
.${CLASSES.FOLDER_DEPTH_0} > .${CLASSES.FOLDER_CHILDREN} > .${CLASSES.FOLDER_ITEMS} .semantix-favorite-item {
  padding-left: ${12 + FOLDER_UI_CONFIG.INDENT_PER_LEVEL}px;
}

.${CLASSES.FOLDER_DEPTH_1} > .${CLASSES.FOLDER_CHILDREN} > .${CLASSES.FOLDER_ITEMS} .semantix-favorite-item {
  padding-left: ${12 + FOLDER_UI_CONFIG.INDENT_PER_LEVEL * 2}px;
}

.${CLASSES.FOLDER_DEPTH_2} > .${CLASSES.FOLDER_CHILDREN} > .${CLASSES.FOLDER_ITEMS} .semantix-favorite-item {
  padding-left: ${12 + FOLDER_UI_CONFIG.INDENT_PER_LEVEL * 3}px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT ITEMS (items not in any folder)
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.ROOT_ITEMS} {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
  min-height: 20px;
  border-radius: 6px;
  transition: background-color 0.15s ease, outline 0.15s ease;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT SELECTOR (for selecting root as target)
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-root-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary, #8e8e8e);
  font-size: 12px;
  transition: background-color 0.15s ease, color 0.15s ease;
  border: 1px solid transparent;
}

.semantix-root-selector:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
  color: var(--text-primary, #ececec);
}

.semantix-root-selector--selected {
  background-color: rgba(16, 163, 127, 0.1);
  border-color: rgba(16, 163, 127, 0.3);
  color: #10a37f;
}

.semantix-root-selector-icon {
  display: flex;
  align-items: center;
  opacity: 0.7;
}

.semantix-root-selector-icon svg {
  width: 14px;
  height: 14px;
}

.semantix-root-selector--selected .semantix-root-selector-icon {
  opacity: 1;
}

.semantix-root-selector-label {
  flex: 1;
}

.semantix-root-selector-badge {
  font-size: 10px;
  background: #10a37f;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SELECTED FOLDER STATE
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-folder--selected > .${CLASSES.FOLDER_HEADER} {
  background-color: rgba(16, 163, 127, 0.1);
  border: 1px solid rgba(16, 163, 127, 0.3);
  border-radius: 6px;
}

.semantix-folder--selected > .${CLASSES.FOLDER_HEADER} .${CLASSES.FOLDER_NAME} {
  color: #10a37f;
  font-weight: 500;
}

.semantix-folder-selected-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #10a37f;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  flex-shrink: 0;
}

/* Select button visibility */
.${CLASSES.FOLDER_ACTION_BTN}[data-action="select"] {
  opacity: 0;
}

.${CLASSES.FOLDER_HEADER}:hover .${CLASSES.FOLDER_ACTION_BTN}[data-action="select"] {
  opacity: 1;
}

.semantix-folder--selected .${CLASSES.FOLDER_ACTION_BTN}[data-action="select"] {
  opacity: 1;
  color: #10a37f;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOLDER FORM (inline rename/create)
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.FOLDER_FORM} {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
}

.${CLASSES.FOLDER_INPUT} {
  flex: 1;
  background: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-medium, rgba(255, 255, 255, 0.2));
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--text-primary, #ececec);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.${CLASSES.FOLDER_INPUT}:focus {
  border-color: #10a37f;
  box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2);
}

.${CLASSES.FOLDER_INPUT}::placeholder {
  color: var(--text-secondary, #8e8e8e);
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT MENU
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.CONTEXT_MENU} {
  position: fixed;
  z-index: ${FOLDER_UI_CONFIG.CONTEXT_MENU_Z_INDEX};
  min-width: 180px;
  max-width: 250px;
  background: var(--surface-primary, #2f2f2f);
  border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  animation: contextMenuFadeIn ${FOLDER_UI_CONFIG.CONTEXT_MENU_FADE_DURATION}ms ease;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.${CLASSES.CONTEXT_MENU_ITEM} {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  color: var(--text-primary, #ececec);
  font-size: 13px;
  transition: background-color 0.1s ease;
  white-space: nowrap;
}

.${CLASSES.CONTEXT_MENU_ITEM}:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.08));
}

.${CLASSES.CONTEXT_MENU_ICON} {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--text-secondary, #8e8e8e);
  flex-shrink: 0;
}

.${CLASSES.CONTEXT_MENU_ITEM}:hover .${CLASSES.CONTEXT_MENU_ICON} {
  color: var(--text-primary, #ececec);
}

.${CLASSES.CONTEXT_MENU_LABEL} {
  flex: 1;
}

.${CLASSES.CONTEXT_MENU_SEPARATOR} {
  height: 1px;
  background: var(--border-light, rgba(255, 255, 255, 0.1));
  margin: 4px 8px;
}

/* Danger item (delete) */
.${CLASSES.CONTEXT_MENU_DANGER} {
  color: #ef4444;
}

.${CLASSES.CONTEXT_MENU_DANGER}:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.${CLASSES.CONTEXT_MENU_DANGER} .${CLASSES.CONTEXT_MENU_ICON} {
  color: #ef4444;
}

/* Submenu indicator */
.${CLASSES.CONTEXT_MENU_ITEM}[data-has-submenu="true"]::after {
  content: '';
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 4px solid var(--text-secondary, #8e8e8e);
  margin-left: auto;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLOR PICKER
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.COLOR_PICKER} {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  padding: 8px;
  background: var(--surface-primary, #2f2f2f);
  border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.${CLASSES.COLOR_OPTION} {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s ease, border-color 0.1s ease;
  position: relative;
}

.${CLASSES.COLOR_OPTION}:hover {
  transform: scale(1.15);
}

.${CLASSES.COLOR_OPTION}.${CLASSES.COLOR_OPTION_SELECTED} {
  border-color: white;
}

.${CLASSES.COLOR_OPTION}.${CLASSES.COLOR_OPTION_SELECTED}::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICON PICKER
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-icon-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 8px;
  background: var(--surface-primary, #2f2f2f);
  border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  max-height: 200px;
  overflow-y: auto;
}

.semantix-icon-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary, #8e8e8e);
  transition: background-color 0.1s ease, color 0.1s ease;
  border: 2px solid transparent;
}

.semantix-icon-option:hover {
  background-color: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #ececec);
}

.semantix-icon-option.selected {
  border-color: #10a37f;
  color: #10a37f;
}

.semantix-icon-option svg {
  width: 18px;
  height: 18px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAG AND DROP
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-drop-indicator {
  height: 2px;
  background: #10a37f;
  border-radius: 1px;
  margin: 2px 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.semantix-drop-indicator.active {
  opacity: 1;
}

/* Dragging state for items */
.semantix-favorite-item.dragging {
  opacity: 0.4;
  background-color: rgba(16, 163, 127, 0.1);
}

.semantix-favorite-item[draggable="true"] {
  cursor: grab;
}

.semantix-favorite-item[draggable="true"]:active {
  cursor: grabbing;
}

/* Drag over state for folders */
.${CLASSES.FOLDER_NODE}.drag-over > .${CLASSES.FOLDER_HEADER} {
  background-color: rgba(16, 163, 127, 0.2);
  outline: 2px dashed #10a37f;
  outline-offset: -2px;
}

/* Drag over state for root items container */
.${CLASSES.ROOT_ITEMS}.drag-over {
  background-color: rgba(16, 163, 127, 0.1);
  outline: 2px dashed #10a37f;
  outline-offset: -2px;
}

/* Expanded folder when dragging over (visual hint) */
.${CLASSES.FOLDER_NODE}.drag-over.${CLASSES.FOLDER_COLLAPSED} > .${CLASSES.FOLDER_HEADER} > .${CLASSES.FOLDER_TOGGLE} {
  color: #10a37f;
}

/* Drag ghost styling (browser default enhancement) */
.semantix-favorite-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* Drag handle indicator on hover */
.semantix-favorite-item:hover .semantix-favorite-star {
  cursor: grab;
}

/* Drop zone highlight for empty folders */
.${CLASSES.FOLDER_NODE}.${CLASSES.FOLDER_EMPTY}.drag-over > .${CLASSES.FOLDER_CHILDREN} {
  min-height: 30px;
  background-color: rgba(16, 163, 127, 0.05);
  border-radius: 4px;
  margin: 4px 8px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIRMATION DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${FOLDER_UI_CONFIG.CONTEXT_MENU_Z_INDEX + 1};
  animation: dialogFadeIn 0.15s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.semantix-confirm-dialog-content {
  background: var(--surface-primary, #2f2f2f);
  border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  padding: 20px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  animation: dialogSlideIn 0.2s ease;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.semantix-confirm-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #ececec);
  margin-bottom: 8px;
}

.semantix-confirm-dialog-message {
  font-size: 14px;
  color: var(--text-secondary, #8e8e8e);
  margin-bottom: 20px;
  line-height: 1.5;
}

.semantix-confirm-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.semantix-confirm-dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  border: none;
}

.semantix-confirm-dialog-btn.cancel {
  background: var(--sidebar-surface-secondary, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #ececec);
}

.semantix-confirm-dialog-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.semantix-confirm-dialog-btn.confirm {
  background: #ef4444;
  color: white;
}

.semantix-confirm-dialog-btn.confirm:hover {
  background: #dc2626;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING & EMPTY STATES
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-folder-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 13px;
}

.semantix-folder-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  color: var(--text-secondary, #8e8e8e);
  font-size: 13px;
  text-align: center;
  gap: 8px;
}

.semantix-folder-empty-icon {
  opacity: 0.5;
}

.semantix-folder-empty-icon svg {
  width: 32px;
  height: 32px;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

.semantix-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-primary, #2f2f2f);
  border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-primary, #ececec);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: ${FOLDER_UI_CONFIG.CONTEXT_MENU_Z_INDEX + 2};
  animation: toastSlideIn 0.3s ease;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.semantix-toast.success {
  border-left: 3px solid #10a37f;
}

.semantix-toast.error {
  border-left: 3px solid #ef4444;
}

.semantix-toast.fadeOut {
  animation: toastFadeOut 0.3s ease forwards;
}

@keyframes toastFadeOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLLBAR STYLING
   ═══════════════════════════════════════════════════════════════════════════ */

.${CLASSES.FOLDER_TREE}::-webkit-scrollbar,
.semantix-icon-picker::-webkit-scrollbar {
  width: 6px;
}

.${CLASSES.FOLDER_TREE}::-webkit-scrollbar-track,
.semantix-icon-picker::-webkit-scrollbar-track {
  background: transparent;
}

.${CLASSES.FOLDER_TREE}::-webkit-scrollbar-thumb,
.semantix-icon-picker::-webkit-scrollbar-thumb {
  background: var(--border-light, rgba(255, 255, 255, 0.1));
  border-radius: 3px;
}

.${CLASSES.FOLDER_TREE}::-webkit-scrollbar-thumb:hover,
.semantix-icon-picker::-webkit-scrollbar-thumb:hover {
  background: var(--border-medium, rgba(255, 255, 255, 0.2));
}
`;

export default FOLDER_STYLES;
