import type { DragContext } from "./context";
import { MosaicState } from "../state";

export interface DragLifecycleHooks {
  onDragStart?: (ctx: DragContext) => void;
  onDragMove?: (ctx: DragContext) => void;

  onPreDrop?: (ctx: DragContext) => void;
  onDropConfirmed?: (ctx: DragContext) => void;
  onDropRejected?: (ctx: DragContext) => void;

  onDragEnd?: (ctx: DragContext) => void;
}

export const DRAG_HOOK_STATES = Object.freeze({
  onDragStart: MosaicState.PointerDown,
  onDragMove: MosaicState.Dragging,
  onPreDrop: MosaicState.Dropping,
  onDropConfirmed: MosaicState.Mutated,
  onDropRejected: MosaicState.RollingBack,
  onDragEnd: MosaicState.Idle,
} as const);
