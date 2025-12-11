// import type { MosaicState } from "./state";

export interface MosaicSnapshot {
    dom: {
        parent: HTMLElement;
        order: number;
        id: string;
    }[];
}

// export function createSnapshot(): MosaicState {
//   return MosaicState.Idle;
// }

export function restoreSnapshot(_snapshot: MosaicSnapshot): void {
  // placeholder
}
