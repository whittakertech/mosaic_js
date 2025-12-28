import type { MosaicOptions } from "./mosaic";

/**
 * The result of evaluating a drag-and-drop constraint.
 *
 * A `ConstraintResult` represents a deterministic decision about whether
 * a proposed drop operation is allowed.
 *
 * @remarks
 * Constraint evaluation in MosaicJS is synchronous, pure, and side-effect free.
 * A rejected result will trigger rollback behavior if a snapshot is present.
 *
 * Consumers should treat `reason` as diagnostic metadata only.
 */
export interface ConstraintResult {
  /**
   * Whether the drop operation is permitted.
   */
  allowed: boolean;

  /**
   * Optional machine-readable reason for rejection.
   *
   * This value is not interpreted by MosaicJS internally, but may be
   * surfaced through events or logs for debugging purposes.
   */
  reason?: string;
}

/**
 * Evaluates whether a drop operation is permitted.
 *
 * This function applies MosaicJS’s built-in, deterministic constraints
 * to a proposed drag-and-drop interaction.
 *
 * @param dragged - The element being dragged
 * @param target - The proposed drop target
 * @param selectors - The active selector configuration
 *
 * @returns A {@link ConstraintResult} indicating whether the drop is allowed
 *
 * @remarks
 * Constraint evaluation is synchronous and side-effect free.
 * Custom or user-defined constraints are not supported in v0.2.
 */
export function checkConstraints(
  dragged: HTMLElement,
  target: HTMLElement,
  selectors: MosaicOptions["selectors"]
): ConstraintResult {
  if (dragged === target) {
    return { allowed: true };
  }

  if (!target.matches(selectors.node)) {
    return { allowed: false, reason: "invalid-target" };
  }

  return { allowed: true };
}
