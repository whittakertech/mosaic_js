import type { DragContext } from "./context";

export interface DragLifecycleHooks {
  onDragStart?: (ctx: DragContext) => void;
  onDragMove?: (ctx: DragContext) => void;

  onPreDrop?: (ctx: DragContext) => void;
  onDropConfirmed?: (ctx: DragContext) => void;
  onDropRejected?: (ctx: DragContext) => void;

  onDragEnd?: (ctx: DragContext) => void;
}
