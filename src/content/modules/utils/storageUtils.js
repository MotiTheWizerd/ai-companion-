/**
 * Storage utility functions
 */

/**
 * Get project ID from chrome.storage.local
 * @returns {Promise<string|null>} Project ID or null if not available
 */
export async function getProjectIdFromStorage() {
  try {
    const result = await chrome.storage.local.get(['selectedProjectId']);
    return result.selectedProjectId || null;
  } catch (error) {
    console.warn('[StorageUtils] Failed to get project ID from storage:', error);
    return null;
  }
}

/**
 * Get project ID synchronously using a callback approach
 * Since chrome.storage is async, this returns null if not immediately available
 * @returns {Promise<string|null>} Project ID or null if not available
 */
export async function getProjectIdSync() {
  return getProjectIdFromStorage();
}

/**
 * Get user ID from chrome.storage.local
 * @returns {Promise<string|null>} User ID or null if not available
 */
export async function getUserIdFromStorage() {
  try {
    const result = await chrome.storage.local.get(['userId']);
    return result.userId || null;
  } catch (error) {
    console.warn('[StorageUtils] Failed to get user ID from storage:', error);
    return null;
  }
}