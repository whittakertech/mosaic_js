/**
 * Emits a MosaicJS lifecycle event.
 *
 * Events are dispatched on the global `window` object and are intended
 * for observation by external systems.
 *
 * @param name - The event name
 * @param detail - Optional event payload
 *
 * @remarks
 * Event emission is synchronous.
 * MosaicJS does not catch or suppress listener errors.
 */
export function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
