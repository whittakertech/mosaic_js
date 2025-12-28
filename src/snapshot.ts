/**
 * A structural snapshot of the DOM captured at drag start.
 *
 * Snapshots allow MosaicJS to restore the DOM to a known-good state
 * when a drop operation is rejected.
 *
 * @remarks
 * Snapshots capture node identity, parent relationships, and ordering.
 * They do not clone DOM nodes or capture visual state.
 */
export interface MosaicSnapshot {
  /** Serialized DOM position data for tracked nodes. */
  dom: {
    /** The node's unique Mosaic identifier. */
    id: string;

    /** The node's original parent element. */
    parent: HTMLElement;

    /** The node's original index within its parent. */
    order: number;
  }[];
}

/**
 * Captures a structural snapshot of the current DOM state.
 *
 * The snapshot is used to guarantee rollback safety if a drop
 * operation is rejected.
 *
 * @param root - The root element whose children will be tracked
 *
 * @returns A {@link MosaicSnapshot} representing DOM structure
 *
 * @remarks
 * Snapshots are captured automatically by MosaicJS at drag start.
 * Manual usage is intended for advanced or diagnostic scenarios.
 */
export function createSnapshot(root: HTMLElement): MosaicSnapshot {
  const nodes = Array.from(root.querySelectorAll("[data-mosaic-id]"));

  return {
    dom: nodes.map((el) => ({
      id: el.getAttribute("data-mosaic-id")!,
      parent: el.parentElement!,
      order: Array.from(el.parentElement!.children).indexOf(el),
    })),
  };
}

/**
 * Restores the DOM to a previously captured snapshot state.
 *
 * This function reorders existing DOM nodes to match the snapshot.
 *
 * @param snapshot - A snapshot previously returned by {@link createSnapshot}
 *
 * @remarks
 * If the snapshot is invalid or incomplete, restoration is a no-op.
 * This function does not recreate or remove DOM nodes.
 */
export function restoreSnapshot(snapshot: MosaicSnapshot | null | undefined) {
  if (!snapshot || !Array.isArray(snapshot.dom)) return;

  for (const { id, parent, order } of snapshot.dom) {
    const el = document.querySelector(`[data-mosaic-id="${id}"]`);
    if (!el) continue;

    const ref = parent.children[order] || null;
    parent.insertBefore(el, ref);
  }
}
