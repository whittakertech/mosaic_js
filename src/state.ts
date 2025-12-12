/**
 * Represents the current interaction lifecycle state of a MosaicJS instance.
 * States are mutually exclusive and transition deterministically.
 */
export enum MosaicState {
  /** No active interaction */
  Idle = "idle",

  /** Pointer is down but no drag threshold has been exceeded */
  PointerDown = "pointerdown",

  /** Active drag operation in progress */
  Dragging = "dragging",

  /** Pointer released; evaluating constraints */
  Dropping = "dropping",

  /** A mutation has been applied and is awaiting confirmation */
  Mutated = "mutated",

  /** Restoring the previous state after a rejected mutation */
  RollingBack = "rollback",

  /** Instance has been destroyed and will not process further events */
  Destroyed = "destroyed",
}

export const MOSAIC_TRANSITIONS = {
  [MosaicState.Idle]: [MosaicState.PointerDown, MosaicState.Destroyed],
  [MosaicState.PointerDown]: [MosaicState.Dragging, MosaicState.Idle],
  [MosaicState.Dragging]: [MosaicState.Dropping],
  [MosaicState.Dropping]: [MosaicState.Mutated, MosaicState.RollingBack],
  [MosaicState.Mutated]: [MosaicState.Idle, MosaicState.RollingBack],
  [MosaicState.RollingBack]: [MosaicState.Idle],
  [MosaicState.Destroyed]: [],
} as const satisfies Record<MosaicState, readonly MosaicState[]>;

export function canTransition(from: MosaicState, to: MosaicState): boolean {
  return MOSAIC_TRANSITIONS[from].includes(to);
}
