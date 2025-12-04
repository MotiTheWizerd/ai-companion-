/**
 * SemantixStorage Module
 * Unified storage system for all Semantix features
 * Uses postMessage bridge to communicate with loader.js for chrome.storage access
 */

// Core storage
export {
  SemantixStorage,
  getSemantixStorage,
  createSemantixStorage,
} from "./SemantixStorage.js";

// Favorites manager
export {
  FavoritesManager,
  getFavoritesManager,
  createFavoritesManager,
} from "./FavoritesManager.js";

// Section folders manager (generic folder system)
export {
  SectionFoldersManager,
  getSectionFoldersManager,
  createSectionFoldersManager,
  getFavoritesFoldersManager,
  getMemoriesFoldersManager,
  getPromptsFoldersManager,
} from "./SectionFoldersManager.js";

// Constants
export {
  STORAGE_KEYS,
  STORAGE_TYPE,
  STORAGE_SCHEMA,
  STORAGE_MESSAGE_TYPES,
  STORAGE_CONFIG,
  FOLDER_CONFIG,
  FOLDER_COLORS,
  FOLDER_ICONS,
  FOLDER_SECTIONS,
} from "./constants.js";

// Default export is the singleton getter
export { getSemantixStorage as default } from "./SemantixStorage.js";
