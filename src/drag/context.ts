import type { MosaicState } from "../state";

/**
 * Immutable context object describing the current drag operation.
 *
 * A `DragContext` provides a stable, serializable view of MosaicJS’s
 * internal drag state at a specific moment in time.
 *
 * It is passed to lifecycle hooks and emitted with relevant events
 * to allow external systems to observe drag behavior safely.
 *
 * @remarks
 * - A DragContext is **read-only** and **frozen** at creation time.
 * - It represents a snapshot of state, not a live reference.
 * - Consumers must not attempt to mutate or persist this object.
 *
 * The shape of DragContext is considered part of MosaicJS’s
 * stable public API.
 */
export interface DragContext {
  /** Root Mosaic instance identifier */
  readonly mosaicRootId: string;

  /** Currently dragged node ID, or null when idle */
  readonly activeNodeId: string | null;

  /** Resolved drop target node ID, or null when none */
  readonly dropTargetId: string | null;

  /** Pointer position at time of emission */
  readonly pointer: {
    readonly x: number;
    readonly y: number;
  };

  /** Current Mosaic drag lifecycle state */
  readonly state: MosaicState;

  /** Whether a drag snapshot currently exists */
  readonly hasSnapshot: boolean;

  /**
   * Uniquely identifies the originating {@link Mosaic} instance (#18).
   *
   * @remarks
   * Unlike {@link DragContext.mosaicRootId} — which is derived from the
   * root element's DOM `id` and is not guaranteed unique (multiple pages,
   * SPA route re-renders, or simple author oversight can collide) —
   * `mosaicInstanceId` is generated once at `Mosaic` construction time and
   * is guaranteed distinct across instances on the same page. Consumers
   * observing multiple Mosaic instances should filter by this field, not
   * `mosaicRootId`.
   */
  readonly mosaicInstanceId: string;

  /**
   * The active node's group container `id` (#13's convention), or `null`
   * when ungrouped or `selectors.group` isn't configured (#18).
   *
   * @remarks
   * Sourced from the same value {@link Mosaic.setState} already forwards
   * as its `groupId` argument — this field threads that same value into
   * the `DragContext` seen by lifecycle hooks, which previously had no
   * access to it.
   */
  readonly groupId: string | null;
}

/**
 * Constructs an immutable {@link DragContext} from internal drag state.
 *
 * This function is used by MosaicJS to create the context object
 * passed to lifecycle hooks and emitted with drag-related events.
 *
 * @param params - Internal drag state used to populate the context
 *
 * @returns A frozen {@link DragContext} representing the current drag state
 *
 * @remarks
 * - The returned object is frozen and must not be mutated.
 * - The context represents a snapshot in time, not a live reference.
 *
 * While exported as part of the public API, this function is primarily
 * intended for internal use and advanced tooling.
 */
export function buildDragContext(params: {
  mosaicRootId: string;
  activeNodeId: string | null;
  dropTargetId: string | null;
  pointer: { x: number; y: number };
  state: MosaicState;
  hasSnapshot: boolean;
  mosaicInstanceId: string;
  groupId: string | null;
}): DragContext {
  return Object.freeze({
    mosaicRootId: params.mosaicRootId,
    activeNodeId: params.activeNodeId,
    dropTargetId: params.dropTargetId,
    pointer: {
      x: params.pointer.x,
      y: params.pointer.y,
    },
    state: params.state,
    hasSnapshot: params.hasSnapshot,
    mosaicInstanceId: params.mosaicInstanceId,
    groupId: params.groupId,
  });
}
