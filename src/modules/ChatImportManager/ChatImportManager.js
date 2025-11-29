/**
 * ChatImportManager
 * Handles chat import operations and data transformation from various AI providers
 */
import { USER_CONFIG } from '../../configuration/index.js';
import { eventBus } from '../../content/core/eventBus.js';
import { EVENTS } from '../../content/core/constants.js';
import { ENDPOINTS } from '../APIClient/endpoints/EndpointRegistry.js';

export class ChatImportManager {
    constructor(options = {}) {
        this.options = options;
        this.managers = options.managers || {};
    }

    /**
     * Handle import:chat event
     * @param {Object} data - Event payload { source: string, claudeData: Object }
     */
    handleImportEvent(data) {
        console.log('[ChatImportManager] Received import:chat event', data);

        // Get the ChatHistoryManager from managers
        const chatHistoryManager = this.managers?.chatHistoryManager;

        if (!chatHistoryManager) {
            console.error('[ChatImportManager] ChatHistoryManager not available');
            return;
        }

        // Get all entries from ChatHistoryManager
        const allEntries = chatHistoryManager.getAllEntries();
        console.log(`[ChatImportManager] Found ${allEntries.length} conversation(s) in history`);

        if (allEntries.length === 0) {
            console.warn('[ChatImportManager] No conversations captured yet');
            return;
        }

        // Get the most recent entry (last one in the array)
        const latestEntry = allEntries[allEntries.length - 1];
        console.log('[ChatImportManager] Latest conversation entry:', latestEntry);

        // Transform to backend API format
        if (latestEntry.conversation_messages && latestEntry.conversation_messages.length > 0) {
            const apiPayload = this.transformToBackendFormat(latestEntry);
            console.log('\n========== BACKEND API PAYLOAD ==========');
            console.log(JSON.stringify(apiPayload, null, 2));
            console.log('========== END OF PAYLOAD ==========\n');

            // Emit API request to send data to backend
            console.log('[ChatImportManager] Sending data to /conversations/raw...');
            eventBus.emit(EVENTS.API_REQUEST, {
                endpoint: ENDPOINTS.CONVERSATIONS.RAW_IMPORT.path,
                method: ENDPOINTS.CONVERSATIONS.RAW_IMPORT.method,
                data: apiPayload
            });

        } else {
            console.warn('[ChatImportManager] No messages found in the latest conversation');
        }
    }

    /**
     * Transform conversation entry to backend API format
     * Matches the create_conversation signature
     * @param {Object} entry - Chat history entry with raw_data.chat_messages
     * @returns {Object} Transformed data matching backend create_conversation signature
     */
    transformToBackendFormat(entry) {
        // chat_messages are already in the correct format: {role, text, message_id}
        return {
            user_id: entry.user_id,
            project_id: entry.project_id,
            model: entry.model || 'claude',
            conversation_id: entry.session_id,
            conversation_messages: entry.conversation_messages || [],
            session_id: entry.session_id
        };
    }

    /**
     * Import chat from clipboard
     * @returns {Promise<void>}
     */
    async importFromClipboard() {
        console.log('[ChatImportManager] importFromClipboard not yet implemented');
        // TODO: implement
    }

    /**
     * Import chat from file
     * @param {File} file - File object
     * @returns {Promise<void>}
     */
    async importFromFile(file) {
        console.log('[ChatImportManager] importFromFile not yet implemented');
        // TODO: implement
    }
}

export default ChatImportManager;
