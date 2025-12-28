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

/**
 * The complete set of valid state transitions for MosaicJS.
 *
 * This object defines the deterministic finite state machine
 * governing the drag lifecycle.
 *
 * @remarks
 * This map is intentionally static and non-extensible.
 * All state transitions must be explicit, observable, and testable.
 */
export const MOSAIC_TRANSITIONS = {
  [MosaicState.Idle]: [MosaicState.PointerDown, MosaicState.Destroyed],
  [MosaicState.PointerDown]: [MosaicState.Dragging, MosaicState.Idle],
  [MosaicState.Dragging]: [MosaicState.Dropping],
  [MosaicState.Dropping]: [MosaicState.Mutated, MosaicState.RollingBack],
  [MosaicState.Mutated]: [MosaicState.Idle, MosaicState.RollingBack],
  [MosaicState.RollingBack]: [MosaicState.Idle],
  [MosaicState.Destroyed]: [],
} as const satisfies Record<MosaicState, readonly MosaicState[]>;

/**
 * Determines whether a transition between two lifecycle states is valid.
 *
 * This function enforces MosaicJS’s deterministic state machine.
 *
 * @param from - The current lifecycle state
 * @param to - The proposed next lifecycle state
 *
 * @returns `true` if the transition is permitted, `false` otherwise
 *
 * @remarks
 * Invalid transitions are rejected by `Mosaic.setState` and emit
 * a `mosaic:error` event.
 */
export function canTransition(from: MosaicState, to: MosaicState): boolean {
  // TS cannot infer includes() on readonly tuple unions; safe cast
  return (MOSAIC_TRANSITIONS[from] as readonly MosaicState[]).includes(to);
}
