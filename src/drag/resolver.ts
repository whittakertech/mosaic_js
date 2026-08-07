import type { MosaicOptions } from "../mosaic";

/**
 * Whether a resolved target is a draggable node acting as a drop target,
 * or an element declared explicitly as a drop destination.
 */
export type TargetKind = "node" | "dropTarget";

/**
 * The outcome of resolving a drop destination at a point in the DOM.
 *
 * A `ResolvedTarget` unifies the destination concerns introduced across the
 * v0.3 "Spatial Intelligence" milestone: explicit drop targets (#11), nesting
 * depth (#12), and group scoping (#13). In v0.2-equivalent flat layouts the
 * forward-looking fields collapse to their trivial values — `container` is the
 * root, `depth` is `0`, `group` is `null`, and `ancestors` is empty.
 *
 * @remarks
 * Resolution is pure and side-effect free. The returned object describes where
 * a drop *would* land; it does not mutate the DOM.
 */
export interface ResolvedTarget {
  /** The matched element — a draggable node or an explicit drop target. */
  element: HTMLElement;

  /** Whether the match is a draggable node or an explicit drop target. */
  kind: TargetKind;

  /**
   * The element the active node would be inserted into.
   *
   * In v0.2/#11 this is always the Mosaic root; nested targets (#12) and
   * groups (#13) populate it with the resolved container.
   */
  container: HTMLElement;

  /** Nesting depth of the target (0 = root-level). Populated by #12. */
  depth: number;

  /** Nearest group ancestor of the target, or null. Populated by #13. */
  group: HTMLElement | null;

  /**
   * Ancestor chain from (but excluding) the target up to the root.
   *
   * Constraint rules use this to evaluate nesting/parent context. Populated
   * by #12/#13; empty for flat resolution.
   */
  ancestors: HTMLElement[];

  /**
   * The `mosaicInstanceId` of the Mosaic instance whose `root`/`selectors`
   * this target was resolved against (#158/RM-21.2).
   *
   * @remarks
   * Always set — including for an own-instance resolution, which carries
   * the resolving instance's own id rather than being left `undefined` —
   * so downstream code never has to special-case "undefined means self".
   * A cross-peer resolution (a linked peer's root/selectors, probed as a
   * fallback when the dragging instance's own resolution returns `null`)
   * carries that peer's id instead.
   */
  instanceId: string;
}

/**
 * Builds the combined selector used to locate a drop destination.
 *
 * When `selectors.dropTarget` is configured, both draggable nodes and explicit
 * drop targets are candidates; otherwise only nodes are.
 */
function targetSelector(selectors: MosaicOptions["selectors"]): string {
  return selectors.dropTarget
    ? `${selectors.node}, ${selectors.dropTarget}`
    : selectors.node;
}

/**
 * Resolves the nearest group-container ancestor of an element, bounded by
 * the Mosaic root.
 *
 * Populates {@link ResolvedTarget.group} (#13). Returns `null` when
 * `selectors.group` is not configured, or when no ancestor matches it before
 * reaching `root`.
 *
 * @param el - The element to resolve a group for
 * @param root - The Mosaic root bounding the search
 * @param groupSelector - The active `selectors.group` value, if any
 */
export function resolveGroup(
  el: HTMLElement,
  root: HTMLElement,
  groupSelector: string | undefined
): HTMLElement | null {
  if (!groupSelector) return null;

  let node: HTMLElement | null = el;
  while (node && node !== root) {
    if (node.matches(groupSelector)) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Walks the ancestor chain of `el` (exclusive), bounded by `root`, collecting
 * every element that is itself a valid drop destination — a match for
 * `selectors.dropTarget` or `selectors.node` (#12).
 *
 * The returned array is ordered innermost-first (immediate parent first),
 * matching {@link ResolvedTarget.ancestors}'s documented contract. `depth` is
 * simply this array's length.
 */
function resolveAncestors(
  el: HTMLElement,
  root: HTMLElement,
  selectors: MosaicOptions["selectors"]
): HTMLElement[] {
  const selector = targetSelector(selectors);
  const ancestors: HTMLElement[] = [];

  let node = el.parentElement;
  while (node && node !== root) {
    if (node.matches(selector)) ancestors.push(node);
    node = node.parentElement;
  }
  return ancestors;
}

/**
 * Resolves the innermost valid drop destination at a position in the DOM.
 *
 * Walks upward from `from` to the nearest element matching the node — or, when
 * configured, drop-target — selector, scoped to `root`. Returns `null` when no
 * valid destination exists, or when the only match is the active node itself
 * (a node is never a drop destination for its own drag).
 *
 * @param from - The element under the pointer (e.g. from `elementFromPoint`)
 * @param activeNode - The node currently being dragged
 * @param root - The Mosaic root bounding valid destinations
 * @param selectors - The active selector configuration
 * @param instanceId - The `mosaicInstanceId` of the Mosaic instance whose
 *   `root`/`selectors` are being probed (#158/RM-21.2) — stamped onto the
 *   returned {@link ResolvedTarget} verbatim. Callers resolving against
 *   their own instance pass their own id; callers probing a linked peer
 *   as a cross-instance fallback pass the peer's id.
 *
 * @returns A {@link ResolvedTarget}, or `null` when nothing valid is under the pointer
 */
export function resolveTarget(
  from: Element | null,
  activeNode: HTMLElement,
  root: HTMLElement,
  selectors: MosaicOptions["selectors"],
  instanceId: string
): ResolvedTarget | null {
  if (!(from instanceof HTMLElement)) return null;
  if (typeof from.closest !== "function") return null;

  const match = from.closest(targetSelector(selectors));
  if (!(match instanceof HTMLElement)) return null;
  if (!root.contains(match)) return null;
  if (match === activeNode) return null;

  const kind: TargetKind =
    selectors.dropTarget && match.matches(selectors.dropTarget)
      ? "dropTarget"
      : "node";

  const group = resolveGroup(match, root, selectors.group);

  // #12: nesting is opt-in via selectors.dropTarget, mirroring #13's own
  // opt-in-via-selectors.group pattern. An explicit dropTarget is itself the
  // container nodes get inserted into (reparenting into it — the behavior
  // #11's PR explicitly deferred here). A node target's container becomes
  // wherever it actually lives right now (which may itself be nested inside
  // a dropTarget) — but only once dropTarget is configured at all; without
  // it, container stays the #13 baseline (group ?? root), preserving the
  // v0.2/#11 "reordering happens only among root/group children" invariant
  // for Mosaics that haven't opted into nested drop targets.
  const container: HTMLElement = selectors.dropTarget
    ? kind === "dropTarget"
      ? match
      : /* v8 ignore next -- @preserve | defensive guard: match is guaranteed
           root or a proper descendant by the root.contains() check above, so
           parentElement is only null in the (untestable in jsdom) edge case
           of `root` itself matching selectors.node. */
        (match.parentElement ?? root)
    : (group ?? root);

  const ancestors = resolveAncestors(match, root, selectors);

  return {
    element: match,
    kind,
    container,
    depth: ancestors.length,
    group,
    ancestors,
    instanceId,
  };
}
