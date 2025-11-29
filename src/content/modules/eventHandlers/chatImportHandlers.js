/**
 * Chat Import Event Handlers
 * Handles import:chat events and related operations
 */

import { Logger } from '../../modules/utils/logger.js';

/**
 * Handle import chat event triggered by toolbar settings
 * @param {Object} data - Event payload { source: string, ... }
 * @param {Object} managers - Managers object with chatImportManager
 */
export function handleImportChat(data, managers) {
    try {
        console.log('[handleImportChat] Event received from:', data?.source || 'unknown');
        Logger.event(`[handleImportChat] import:chat event triggered from ${data?.source || 'unknown'}`);
        
        if (managers?.chatImportManager) {
            managers.chatImportManager.handleImportEvent(data);
        } else {
            Logger.extension('[handleImportChat] chatImportManager not available');
        }
    } catch (error) {
        console.error('[handleImportChat] Error:', error);
    }
}
