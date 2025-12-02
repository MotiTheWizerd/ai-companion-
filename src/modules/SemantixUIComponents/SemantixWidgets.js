/**
 * Semantix Widgets Panel
 * Provides quick actions near the composer
 */
export const SemantixWidgets = () => {
  return `
    <div class="semantix-widgets" data-role="semantix-widgets">
      <div class="semantix-widgets__header">
        <span class="semantix-widgets__title">Semantix Widgets</span>
        <span class="semantix-widgets__badge">Beta</span>
      </div>
      <p class="semantix-widgets__description">
        Keep your memory context in sync with a single click.
      </p>
      <div class="semantix-widgets__actions">
        <button type="button" class="semantix-widget-btn ghost" data-widget-action="import">
          Import latest chat
        </button>
      </div>
    </div>
  `;
};

