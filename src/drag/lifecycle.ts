import type { DragContext } from "./context";
import { MosaicState } from "../state";

/**
 * Lifecycle hooks for observing MosaicJS drag behavior.
 *
 * Each hook is invoked at a specific point in the drag lifecycle
 * and receives an immutable drag context.
 *
 * @remarks
 * Hooks are invoked in strict alignment with the internal
 * deterministic state machine.
 *
 * Invoking a hook in an unexpected state will throw an error.
 */
export interface DragLifecycleHooks {
  onDragStart?: (ctx: DragContext) => void;
  onDragMove?: (ctx: DragContext) => void;

  onPreDrop?: (ctx: DragContext) => void;
  onDropConfirmed?: (ctx: DragContext) => void;
  onDropRejected?: (ctx: DragContext) => void;

  onDragEnd?: (ctx: DragContext) => void;
}

/**
 * Mapping of drag lifecycle hooks to their required Mosaic state.
 *
 * This object defines the invariant relationship between each
 * lifecycle hook and the internal drag state in which it may fire.
 *
 * @remarks
 * This mapping is used to validate hook invocation at runtime.
 * If a hook is invoked while the Mosaic instance is in an unexpected
 * state, an error will be thrown.
 *
 * This object is intentionally static and non-extensible.
 */
export const DRAG_HOOK_STATES = Object.freeze({
  onDragStart: MosaicState.PointerDown,
  onDragMove: MosaicState.Dragging,
  onPreDrop: MosaicState.Dropping,
  onDropConfirmed: MosaicState.Mutated,
  onDropRejected: MosaicState.RollingBack,
  onDragEnd: MosaicState.Idle,
} as const);
