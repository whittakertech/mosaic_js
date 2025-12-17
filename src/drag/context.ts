import type { MosaicState } from "../state";

export interface DragContext {
  readonly mosaicRootId: string;
  readonly activeNodeId: string | null;
  readonly pointer: { x: number; y: number };
  readonly state: MosaicState;
}
