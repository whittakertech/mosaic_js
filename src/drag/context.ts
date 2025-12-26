import type { MosaicState } from "../state";

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
}

export function buildDragContext(params: {
  mosaicRootId: string;
  activeNodeId: string | null;
  dropTargetId: string | null;
  pointer: { x: number; y: number };
  state: MosaicState;
  hasSnapshot: boolean;
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
  });
}
