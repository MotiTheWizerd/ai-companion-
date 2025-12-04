/**
 * Semantix Sidebar Widget Module
 * Exports all components for the sidebar widget
 */

// Main widget
export {
  SemantixSidebarWidget,
  createSemantixSidebarWidget,
} from "./SemantixSidebarWidget.js";

// Folder tree renderer
export {
  FolderTreeRenderer,
  createFolderTreeRenderer,
} from "./FolderTreeRenderer.js";

// Favorite button
export { FavoriteButton, createFavoriteButton } from "./FavoriteButton.js";

// Styles
export { FOLDER_STYLES } from "./folderStyles.js";

// Constants
export {
  GPT_SELECTORS,
  CONFIG,
  MENU_ITEMS,
  ICONS,
  CLASSES,
  FOLDER_UI_CONFIG,
  CONTEXT_MENU_ACTIONS,
  FOLDER_ICON_MAP,
} from "./constants.js";

// Default export
export { SemantixSidebarWidget as default } from "./SemantixSidebarWidget.js";
