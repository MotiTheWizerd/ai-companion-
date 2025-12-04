/**
 * SemantixStorage Module
 * Unified storage system for all Semantix features
 * Uses postMessage bridge to communicate with loader.js for chrome.storage access
 */

export {
  SemantixStorage,
  getSemantixStorage,
  createSemantixStorage,
} from "./SemantixStorage.js";

export {
  FavoritesManager,
  getFavoritesManager,
  createFavoritesManager,
} from "./FavoritesManager.js";

export {
  STORAGE_KEYS,
  STORAGE_TYPE,
  STORAGE_SCHEMA,
  STORAGE_MESSAGE_TYPES,
  STORAGE_CONFIG,
} from "./constants.js";

// Default export is the singleton getter
export { getSemantixStorage as default } from "./SemantixStorage.js";
