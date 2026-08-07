import { createSnapshot } from "./snapshot";
import { emit } from "./events";
import type { Mosaic } from "./mosaic";

/**
 * Debounce window (ms) for coalescing rapid sequential structural
 * mutations into a single re-snapshot + `mosaic:world:mutated` emission.
 *
 * @remarks
 * Chosen to comfortably exceed a single animation frame (~16ms) so bursts
 * of mutations from a single external operation (e.g. a framework
 * re-render touching several nodes) collapse into one response.
 */
const DEBOUNCE_MS = 50;

/** Payload for the `mosaic:world:mutated` event (#15). */
export interface WorldMutatedPayload {
  /**
   * Whether the debounced batch contained only additions, only removals,
   * or both.
   */
  mutationType: "added" | "removed" | "mixed";

  /** Count of distinct participating elements added and/or removed. */
  affectedNodeCount: number;
}

/**
 * Observes external DOM mutations to Mosaic-participating nodes during an
 * active drag, re-snapshotting the DOM so rollback targets the last
 * known-good state rather than the stale drag-start state (#15).
 *
 * @remarks
 * MosaicJS's own internal DOM manipulation (live reorder during
 * `pointerMove`, `restoreSnapshot` during rollback) is structurally
 * indistinguishable from an external mutation to a `MutationObserver` —
 * both are childList changes to participating nodes. `WorldObserver` is
 * therefore only ever fed mutation records that survive an explicit
 * {@link WorldObserver.drain} call: every internal DOM write in
 * `DragController`/`Mosaic` synchronously drains the observer's pending
 * queue via `MutationObserver.takeRecords()` immediately after mutating,
 * so those records never reach the async callback. Only mutations that
 * happen *between* drains — i.e. genuinely external ones — are ever
 * classified and responded to.
 */
export class WorldObserver {
  private observer: MutationObserver | null = null;
  private readonly pendingAdded = new Set<Element>();
  private readonly pendingRemoved = new Set<Element>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly mosaic: Mosaic) {}

  /** Whether the observer is currently attached. */
  get isConnected(): boolean {
    return this.observer !== null;
  }

  /**
   * Attaches the `MutationObserver` to the Mosaic root. Idempotent — a
   * second call while already connected is a no-op.
   */
  connect(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((records) => {
      this.handleMutations(records);
    });

    this.observer.observe(this.mosaic.root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  /**
   * Detaches the observer, cancels any pending debounce, and discards
   * unflushed mutation state. Idempotent.
   */
  disconnect(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.observer?.disconnect();
    this.observer = null;
    this.pendingAdded.clear();
    this.pendingRemoved.clear();
  }

  /**
   * Synchronously discards any mutation records queued by the observer.
   *
   * @remarks
   * Must be called immediately after MosaicJS performs its own DOM write
   * (live reorder, snapshot restore) so that self-caused mutations never
   * reach {@link WorldObserver.handleMutations}. A no-op when
   * disconnected.
   */
  drain(): void {
    this.observer?.takeRecords();
  }

  private handleMutations(records: MutationRecord[]): void {
    const nodeSelector = this.mosaic.selectors.node;
    let structural = false;

    for (const record of records) {
      // Benign: attribute changes never trigger a response, regardless of
      // whether the target participates in drag (#15 AC 2).
      if (record.type === "attributes") continue;

      for (const node of Array.from(record.addedNodes)) {
        const matches = matchingElements(node, nodeSelector);
        if (matches.length === 0) continue;
        structural = true;
        for (const el of matches) this.pendingAdded.add(el);
      }

      for (const node of Array.from(record.removedNodes)) {
        const matches = matchingElements(node, nodeSelector);
        if (matches.length === 0) continue;
        structural = true;
        for (const el of matches) this.pendingRemoved.add(el);
      }
    }

    if (!structural) return;

    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private flush(): void {
    this.debounceTimer = null;

    const addedCount = this.pendingAdded.size;
    const removedCount = this.pendingRemoved.size;
    this.pendingAdded.clear();
    this.pendingRemoved.clear();

    /* v8 ignore next -- @preserve | defensive guard: flush is only ever scheduled from handleMutations after confirming `structural`, so counts are never both zero. */
    if (addedCount === 0 && removedCount === 0) return;

    this.mosaic.snapshot = createSnapshot(this.mosaic.root);

    const mutationType: WorldMutatedPayload["mutationType"] =
      addedCount > 0 && removedCount > 0
        ? "mixed"
        : addedCount > 0
          ? "added"
          : "removed";

    emit("mosaic:world:mutated", {
      mutationType,
      affectedNodeCount: addedCount + removedCount,
    } satisfies WorldMutatedPayload);
  }
}

function matchingElements(node: Node, selector: string): Element[] {
  if (!(node instanceof Element)) return [];

  const results: Element[] = [];
  if (node.matches(selector)) results.push(node);
  results.push(...Array.from(node.querySelectorAll(selector)));
  return results;
}
