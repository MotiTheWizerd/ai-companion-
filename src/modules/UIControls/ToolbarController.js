import { HeaderToolbar } from '../SemantixUIComponents/index.js';

/**
 * Controls the injection and management of the toolbar.
 * The toolbar is injected into the <body> element and positioned fixed at the top center.
 */
export class ToolbarController {
    constructor(conversationManager) {
        this.conversationManager = conversationManager;
        this.observer = null;
        this.isInitialized = false;
        this.retryCount = 0;
    }

    init() {
        if (this.isInitialized) return;
        console.log('[ToolbarController] Initialized');
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
        const toolbarHtml = HeaderToolbar();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toolbarHtml;
        const toolbarElement = tempDiv.firstElementChild;

        // Add click event to settings icon
        const settingsIcon = toolbarElement.querySelector('.semantix-settings-icon');
        if (settingsIcon) {
            settingsIcon.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                console.log('[ToolbarController] Settings icon clicked');

                // Create a simple settings popup or trigger settings functionality
                this.openSettings();
            });
        }

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

        console.log('[ToolbarController] Toolbar injected');
    }

    openSettings() {
        // Create a simple settings modal or trigger settings functionality
        console.log('[ToolbarController] Opening settings');

        // For now, we'll just show an alert - in the future this could open a more complex UI
        alert('Semantix Bridge Settings\n\nStatus: Active\nFeatures: Memory Injection, Conversation Sync');
    }
}
