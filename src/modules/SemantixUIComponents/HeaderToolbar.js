/**
 * Header Toolbar Component
 * @returns {string} HTML string for the header toolbar
 */
export const HeaderToolbar = () => {
    return `
        <div class='semantix-header-toolbar'>
            <span class="semantix-status-dot"></span>
            <span class="semantix-status-text">Active</span>
            <span class="semantix-settings-icon">⚙️</span>
        </div>
    `;
};
