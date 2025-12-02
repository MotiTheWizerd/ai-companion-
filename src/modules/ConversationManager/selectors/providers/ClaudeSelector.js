/**
 * Claude-specific DOM selectors
 */
export class ClaudeSelector {
    constructor() {
        this.name = 'claude';
    }

    /**
     * Get the selector for the toolbar area
     * @returns {string} CSS selector
     */
    getToolbar() {
        // Use the body as the injection target
        return 'body';
    }

    /**
     * Get the insertion position relative to the toolbar selector
     * @returns {string} 'after', 'before', 'append', 'prepend'
     */
    getToolbarPosition() {
        // Append toolbar to body
        return 'append';
    }

    /**
     * Claude currently does not render Semantix widgets
     * @returns {null}
     */
    getWidgetContainer() {
        return null;
    }

    getWidgetPosition() {
        return 'append';
    }

    /**
     * Get the selector for the input area
     * @returns {string} CSS selector
     */
    getInput() {
        return 'div[contenteditable="true"]';
    }
}
