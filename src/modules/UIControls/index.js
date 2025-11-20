import { UserMessageController } from './UserMessageController.js';

/**
 * Main controller for UI-related functionality.
 * Orchestrates different UI sub-controllers.
 */
export class UIController {

    constructor() {
        this.userMessageController = new UserMessageController();
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) {
            console.log('[UIController] Already initialized');
            return;
        }

        console.log('[UIController] Initializing...');
        try {
            this.userMessageController.init();
            console.log('[UIController] UserMessageController initialized');
        } catch (e) {
            console.error('[UIController] Error initializing UserMessageController:', e);
        }

        this.isInitialized = true;
    }
}
