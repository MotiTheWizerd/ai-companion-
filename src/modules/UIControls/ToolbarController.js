import { HeaderToolbar } from '../SemantixUIComponents/index.js';
import { eventBus } from '../../content/core/eventBus.js';

/**
 * Controls the injection and management of the toolbar.
 * The toolbar is injected into the <body> element and positioned fixed at the top center.
 */
export class ToolbarController {
    constructor(conversationManager, chatHistoryManager) {
        this.conversationManager = conversationManager;
        this.chatHistoryManager = chatHistoryManager;
        this.observer = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.toolbarElement = null; // Store reference to toolbar element
    }

    init() {
        if (this.isInitialized) return;
        console.log('[ToolbarController] Initialized');

        // Register callback early to catch conversations detected after init
        if (this.chatHistoryManager) {
            this.chatHistoryManager.onConversationCaptured((claudeData) => {
                console.log('[ToolbarController] onConversationCaptured callback triggered with data');
                this.showSettingsIcon();
                // Automatic import removed as per user request.
                // Import is now triggered only via settings icon click.
            });
        }

        this.startObserver();
        this.isInitialized = true;
    }

    startObserver() {
        if (!document.body) {
            console.log('[ToolbarController] document.body not ready, waiting...');
            window.addEventListener('DOMContentLoaded', () => this.startObserver());
            return;
        }

        console.log('[ToolbarController] Starting MutationObserver...');
        this.observer = new MutationObserver((mutations) => {
            console.log('[ToolbarController] MutationObserver triggered, mutations count:', mutations.length);
            this.attemptInjection();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });

        // Initial injection attempt
        this.attemptInjection();
    }

    attemptInjection() {
        console.log('[ToolbarController] attemptInjection called');
        const selectors = this.conversationManager.getSelectors();
        const toolbarSelector = selectors.getToolbar(); // should be 'body'
        const position = selectors.getToolbarPosition(); // should be 'append'
        console.log('[ToolbarController] Using selector:', toolbarSelector, 'position:', position);

        const targetElement = document.querySelector(toolbarSelector);
        const existingToolbar = document.querySelector('.semantix-header-toolbar');

        if (!targetElement) {
            if (this.retryCount < 10) {
                this.retryCount++;
                console.warn('[ToolbarController] Target not found, retry attempt', this.retryCount);
                setTimeout(() => this.attemptInjection(), 500);
            } else {
                console.error('[ToolbarController] Max retry attempts reached, giving up.');
            }
            return;
        }

        if (existingToolbar) {
            console.log('[ToolbarController] Toolbar already exists, skipping injection');
            return;
        }

        console.log('[ToolbarController] Found target element, injecting toolbar');
        this.injectToolbar(targetElement, position);
    }

    injectToolbar(targetElement, position) {
        // Create toolbar without settings icon initially
        const toolbarHtml = this.getHeaderToolbarHTML(false); // Don't show settings icon initially
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toolbarHtml;
        const toolbarElement = tempDiv.firstElementChild;
        this.toolbarElement = toolbarElement;

        // Store reference to status text element to update it later
        this.statusTextElement = toolbarElement.querySelector('.semantix-status-text');

        // Add click event to settings icon (will be added later when needed)
        // Styles are now handled by CSS class .semantix-header-toolbar

        // Insert according to requested position (append works for body)
        if (position === 'after') {
            targetElement.parentNode.insertBefore(toolbarElement, targetElement.nextSibling);
        } else if (position === 'before') {
            targetElement.parentNode.insertBefore(toolbarElement, targetElement);
        } else if (position === 'append' || position === 'prepend') {
            targetElement.appendChild(toolbarElement);
        } else {
            targetElement.appendChild(toolbarElement);
        }

        console.log('[ToolbarController] Toolbar injected (without settings icon initially)');

        // Note: callback for showing settings icon is now registered in init()
        // to ensure it catches conversations detected early
    }

    /**
     * Get HTML for the header toolbar
     * @param {boolean} showSettingsIcon - Whether to include the settings icon
     * @returns {string} HTML string for the toolbar
     */
    getHeaderToolbarHTML(showSettingsIcon) {
        if (showSettingsIcon) {
            return `
                <div class='semantix-header-toolbar'>
                    <span class="semantix-status-dot"></span>
                    <span class="semantix-status-text">Active</span>
                    <span class="semantix-settings-icon">⚙️</span>
                </div>
            `;
        } else {
            return `
                <div class='semantix-header-toolbar'>
                    <span class="semantix-status-dot"></span>
                    <span class="semantix-status-text">Monitoring</span>
                </div>
            `;
        }
    }

    /**
     * Show the settings icon in the toolbar after conversation is captured
     */
    showSettingsIcon() {
        console.log('[ToolbarController] Showing settings icon after conversation capture');

        if (this.toolbarElement) {
            // Update the status text
            if (this.statusTextElement) {
                this.statusTextElement.textContent = 'Active';
                this.statusTextElement.className = 'semantix-status-text active';
            }

            // Check if settings icon already exists
            const existingIcon = this.toolbarElement.querySelector('.semantix-settings-icon');
            if (existingIcon) {
                console.log('[ToolbarController] Settings icon already exists, skipping');
                return;
            }

            // Add the settings icon to the existing toolbar
            const settingsIcon = document.createElement('span');
            settingsIcon.className = 'semantix-settings-icon';
            settingsIcon.textContent = '⚙️';

            // Add click event to settings icon
            settingsIcon.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                console.log('[ToolbarController] Settings icon clicked');

                // Create a simple settings popup or trigger settings functionality
                this.openSettings();
            });

            // Add the settings icon to the toolbar
            this.toolbarElement.appendChild(settingsIcon);
            console.log('[ToolbarController] Settings icon added to toolbar');
        }
    }

    openSettings() {
        // Create a simple settings modal or trigger settings functionality
        console.log('[ToolbarController] Opening settings');

        // Emit event to trigger chat import flow after settings opened
        try {
            eventBus.emit('import:chat', { source: 'toolbar-settings' });
            console.log('[ToolbarController] Emitted event "import:chat"');
        } catch (err) {
            console.error('[ToolbarController] Failed to emit import:chat event', err);
        }
    }
}
