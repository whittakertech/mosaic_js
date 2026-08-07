import type { MosaicOptions } from "./mosaic";
import type { TargetKind } from "./drag/resolver";

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

  /**
   * Optional structured diagnostic data describing the rejection (#22).
   *
   * @remarks
   * Not interpreted by MosaicJS internally — purely for external
   * observers (logs, analytics, debugging UIs). Built-in constraints
   * populate this with a shape keyed to their `reason`:
   * - `"invalid-target"`: `{ targetSelector: string, actualElement: HTMLElement }`
   * - `"group-boundary"`: `{ sourceGroupId: string | null, targetGroupId: string | null }`
   * - `"circular-nesting"`: `{ ancestorChain: HTMLElement[] }`
   * - `"nesting-depth-exceeded"`: `{ depth: number, maxNestingDepth: number }`
   *
   * User-defined constraints ({@link MosaicOptions.constraints}) may
   * populate this with any shape they choose — it's the same optional
   * field, with no special-casing between built-in and user-provided
   * results.
   */
  metadata?: Record<string, unknown>;
}

/**
 * The input to a drag-and-drop constraint evaluation.
 *
 * Passed as a single object so the constraint surface can grow across the v0.3
 * milestone (drop-target kind here in #11; ancestor chain and group options in
 * #12/#13) without churning call sites.
 */
export interface ConstraintInput {
  /** The element being dragged. */
  dragged: HTMLElement;

  /** The proposed drop target element. */
  target: HTMLElement;

  /**
   * The resolved kind of the drop target, when known.
   *
   * Supplied by the {@link resolveTarget} resolver. Omitted for self-drops and
   * for direct callers that have not resolved a kind; validity is then derived
   * from the selectors.
   */
  kind?: TargetKind;

  /** The active selector configuration. */
  selectors: MosaicOptions["selectors"];

  /**
   * The dragged node's group container at drag start, or `null`/`undefined`
   * when ungrouped. Populated via {@link resolveGroup} (#13).
   */
  sourceGroup?: HTMLElement | null;

  /**
   * The resolved drop target's group container, or `null`/`undefined` when
   * ungrouped. Populated via {@link resolveGroup} (#13).
   */
  targetGroup?: HTMLElement | null;

  /**
   * Whether cross-group drops are permitted for this drag (mirrors
   * {@link MosaicOptions.crossGroupDrag}). Defaults to `false` when omitted.
   */
  crossGroupDrag?: boolean;

  /**
   * The element the dragged node would be inserted into, mirroring
   * {@link ResolvedTarget.container} (#12). Used to detect circular nesting —
   * dropping a node into itself or one of its own descendants.
   */
  container?: HTMLElement;

  /**
   * Nesting depth of the resolved target, mirroring
   * {@link ResolvedTarget.depth} (#12). Compared against
   * {@link MosaicOptions.maxNestingDepth} when both are provided.
   */
  depth?: number;

  /**
   * Caps nesting depth for this drag (mirrors
   * {@link MosaicOptions.maxNestingDepth}). `undefined` means unlimited.
   */
  maxNestingDepth?: number;

  /**
   * The dragging (origin) Mosaic instance's `mosaicInstanceId` (#160/
   * RM-21.4). Only populated for a cross-container drop — a linked
   * peer's DOM, per {@link MosaicOptions.crossContainerConstraints} —
   * `undefined` for a same-instance drop.
   */
  sourceInstanceId?: string;

  /**
   * The receiving (target/peer) Mosaic instance's `mosaicInstanceId`
   * (#160/RM-21.4). Only populated for a cross-container drop;
   * `undefined` for a same-instance drop.
   */
  targetInstanceId?: string;
}

/**
 * Evaluates whether a drop operation is permitted.
 *
 * Applies MosaicJS’s built-in, deterministic constraints to a proposed
 * drag-and-drop interaction.
 *
 * A drop is permitted when the target is the dragged element itself (a no-op
 * self-drop), when it matches `selectors.node`, or — when configured — when it
 * matches `selectors.dropTarget`. A target matching neither is rejected with
 * reason `"invalid-target"`. When `selectors.group` is configured, a drop
 * whose target resolves to a different group than the dragged node's own is
 * rejected with reason `"group-boundary"` unless `crossGroupDrag` is set (#13).
 * When `container`/`depth` are supplied (#12), a drop that would nest the
 * dragged node inside itself or one of its own descendants is rejected with
 * reason `"circular-nesting"`, and a drop exceeding `maxNestingDepth` is
 * rejected with reason `"nesting-depth-exceeded"`.
 *
 * @param input - The {@link ConstraintInput} describing the proposed drop
 *
 * @returns A {@link ConstraintResult} indicating whether the drop is allowed
 *
 * @remarks
 * Constraint evaluation is synchronous and side-effect free. This function
 * covers MosaicJS's *built-in* constraints only. As of v0.4, custom
 * user-defined constraints are also supported — see
 * {@link MosaicOptions.constraints} — and are evaluated by
 * `DragController` after this function's built-in checks pass, using the
 * exact same {@link ConstraintInput} shape, so a user constraint has an
 * identical signature and calling convention to this one.
 */
export function checkConstraints(input: ConstraintInput): ConstraintResult {
  const {
    dragged,
    target,
    selectors,
    sourceGroup,
    targetGroup,
    crossGroupDrag,
    container,
    depth,
    maxNestingDepth,
  } = input;

  if (dragged === target) {
    return { allowed: true };
  }

  const matchesNode = target.matches(selectors.node);
  const matchesDropTarget = Boolean(
    selectors.dropTarget && target.matches(selectors.dropTarget)
  );

  if (!matchesNode && !matchesDropTarget) {
    return {
      allowed: false,
      reason: "invalid-target",
      metadata: {
        targetSelector: selectors.dropTarget
          ? `${selectors.node}, ${selectors.dropTarget}`
          : selectors.node,
        actualElement: target,
      },
    };
  }

  // #12: circular-nesting — a node can never be dropped into itself or one
  // of its own descendants. `contains()` covers both (it is reflexive).
  if (container && dragged.contains(container)) {
    return {
      allowed: false,
      reason: "circular-nesting",
      metadata: {
        // #22: the path from the proposed container up to the dragged
        // node itself — demonstrates concretely why the drop is circular.
        ancestorChain: buildAncestorChain(container, dragged),
      },
    };
  }

  // #12: nesting-depth-exceeded — bounds how deep explicit drop targets may
  // nest when MosaicOptions.maxNestingDepth is configured.
  if (typeof maxNestingDepth === "number" && (depth ?? 0) > maxNestingDepth) {
    return {
      allowed: false,
      reason: "nesting-depth-exceeded",
      metadata: {
        depth: depth ?? 0,
        maxNestingDepth,
      },
    };
  }

  // #13: group-boundary — a drop into a different group is rejected unless
  // cross-group dragging is explicitly enabled. Both groups null (ungrouped)
  // counts as a match, so ungrouped Mosaics are entirely unaffected.
  if ((sourceGroup ?? null) !== (targetGroup ?? null) && !crossGroupDrag) {
    return {
      allowed: false,
      reason: "group-boundary",
      metadata: {
        // #22: DOM-id-derived, matching the convention RM-16/RM-18
        // establish — serializable/loggable, not a live element reference.
        sourceGroupId: sourceGroup?.id ?? null,
        targetGroupId: targetGroup?.id ?? null,
      },
    };
  }

  return { allowed: true };
}

/**
 * Walks the ancestor chain from `from` up to (and including) `to`,
 * inclusive of both endpoints. Used to build `"circular-nesting"`
 * rejection metadata's `ancestorChain` (#22).
 *
 * @remarks
 * Assumes `to` is a real ancestor of `from` (guaranteed by the
 * `dragged.contains(container)` check at the call site) — if it isn't,
 * walks to the top of the DOM tree instead of infinite-looping.
 */
function buildAncestorChain(from: HTMLElement, to: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let node: HTMLElement | null = from;

  while (node) {
    chain.push(node);
    if (node === to) break;
    node = node.parentElement;
  }

  return chain;
}
