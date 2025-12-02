/**
 * Semantix Widgets Panel
 * Provides quick actions near the composer
 */
export const SemantixWidgets = () => {
  return `
    <div class="semantix-widgets" data-role="semantix-widgets">
      <div class="semantix-widgets__row">
        <button type="button" class="semantix-widgets__emoji" data-widget-action="emoji" aria-label="Open emoji picker">
          🙂
        </button>
        <button type="button" class="semantix-widget-btn ghost" data-widget-action="import">
          Import chat
        </button>
      </div>
    </div>
  `;
};
