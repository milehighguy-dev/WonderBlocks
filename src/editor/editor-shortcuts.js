// Native dialogs make the scene inert, but keyboard events still reach window
// listeners. Leave these events to the dialog and its normal browser actions.
export const sceneShortcutBlocked=(event={})=>!!event.defaultPrevented||!!globalThis.document?.querySelector?.('dialog[open]')?.open;
