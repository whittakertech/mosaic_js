import type { MosaicState } from "./state";

export function createSnapshot(): MosaicState {
  return MosaicState.Idle;
}

export function restoreSnapshot(_snapshot: MosaicState): void {
  // placeholder
}
