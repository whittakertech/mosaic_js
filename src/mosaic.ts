import { DragController } from "./drag/controller";
import { MosaicState, canTransition, MOSAIC_TRANSITIONS } from "./state";
import type { MosaicSnapshot } from "./snapshot";
import { restoreSnapshot } from "./snapshot";
import { emit } from "./events";
import type { CSSClassContract } from "./css";
import { DEFAULT_CSS_CLASS_CONTRACT } from "./css";
import type { DragLifecycleHooks } from "./drag";
import type { ConstraintInput, ConstraintResult } from "./constraints";

/**
 * Configuration options used to construct a Mosaic instance.
 *
 * MosaicOptions define the DOM scope, selector semantics, styling hooks,
 * and lifecycle observation points for a Mosaic drag session.
 *
 * @remarks
 * Options are read once at construction time.
 * Changing values after initialization has no effect.
 */
export interface MosaicOptions {
  /**
   * The root DOM element managed by MosaicJS.
   *
   * All draggable nodes must exist within this element.
   */
  root: HTMLElement;

  /**
   * Selector configuration used to identify draggable elements
   * and related structural roles.
   */
  selectors: {
    /**
     * Selector matching draggable nodes.
     *
     * This selector defines which elements participate in drag operations.
     */
    node: string;

    /**
     * Optional selector identifying explicit drop destinations.
     *
     * @remarks
     * When provided, elements matching this selector become valid drop targets
     * in addition to draggable nodes, and are distinguished from nodes via the
     * `targetType` field on hover events and the `dropTarget` CSS class.
     *
     * When omitted, v0.2 behavior is preserved — draggable nodes are the only
     * valid drop targets.
     */
    dropTarget?: string;

    /**
     * Optional selector identifying logical grouping elements.
     *
     * @remarks
     * When provided, group-container elements scope drag behavior: a node
     * dragged within its group reorders only among siblings in that group,
     * and drops outside the group are rejected (reason `"group-boundary"`)
     * unless {@link MosaicOptions.crossGroupDrag} is enabled.
     */
    group?: string;

    /**
     * Optional selector identifying child elements within a draggable node.
     *
     * @remarks
     * This selector is intended for structural clarity and future extensibility.
     * It is not required for basic drag-and-drop behavior.
     */
    children?: string;

    /**
     * Optional selector identifying a drag handle within a node.
     *
     * @remarks
     * When provided, `pointerdown` only initiates a drag when its target
     * matches (or is a descendant of) an element matching this selector
     * within the node — the handle may be nested at any depth. A
     * `pointerdown` elsewhere on the node is ignored.
     *
     * When omitted, the entire node remains draggable (v0.2 behavior).
     */
    handle?: string;
  };

  /**
   * Optional overrides for the default CSS class contract.
   *
   * Unspecified entries fall back to MosaicJS defaults.
   */
  cssClasses?: Partial<CSSClassContract>;

  /**
   * Enables cross-group dragging when `selectors.group` is configured.
   *
   * @remarks
   * Default `false`: dropping a node outside its originating group is
   * rejected with reason `"group-boundary"`. When `true`, nodes may move
   * between groups — the snapshot/rollback system restores original group
   * membership on a rejected drop like any other reparenting.
   *
   * Has no effect when `selectors.group` is not configured.
   */
  crossGroupDrag?: boolean;

  /**
   * Caps how deeply a node may be nested via explicit drop targets (#12).
   *
   * @remarks
   * Default `undefined` (unlimited). `depth` is the number of drop-target/node
   * ancestors above the resolved target — 0 is root-level. Drops exceeding
   * the limit are rejected with reason `"nesting-depth-exceeded"`.
   */
  maxNestingDepth?: number;

  /**
   * Enables bubble-up constraint evaluation (#12).
   *
   * @remarks
   * Default `false`: a rejected drop stays rejected. When `true`, a
   * rejection at the innermost resolved target is retried against each
   * ancestor in {@link ResolvedTarget.ancestors} (innermost-first) until one
   * is allowed, or the chain is exhausted — the drop then lands on that
   * ancestor rather than the original target.
   */
  bubbleConstraints?: boolean;

  /**
   * Optional lifecycle hooks for observing drag behavior.
   *
   * Hooks are invoked in strict alignment with the internal
   * deterministic state machine.
   */
  dragLifecycleHooks?: DragLifecycleHooks;

  /**
   * Enables development diagnostics for invalid state transitions (#19).
   *
   * @remarks
   * Default `false`. When `true`, an invalid transition additionally logs a
   * structured `console.warn` with the same information as the
   * `mosaic:error` event payload (`from`, `to`, `validTransitions`,
   * `timestamp`). No console output in the default/production mode.
   */
  debug?: boolean;

  /**
   * Enables tolerance for external DOM mutations during an active drag (#15).
   *
   * @remarks
   * Default `false` — zero `MutationObserver` overhead, identical to prior
   * behavior. When `true`, structural mutations to participating nodes
   * (additions, removals, or reordering matching `selectors.node`) that
   * occur *outside* MosaicJS's own drag handling — e.g. a framework
   * re-render, a websocket-driven list update — are detected during
   * `Dragging`. On detection, the DOM is re-snapshotted so rollback
   * restores to the last known-good state rather than the stale
   * drag-start state, and `mosaic:world:mutated` is emitted. Attribute
   * changes are always benign and ignored. Has no effect outside the
   * active drag lifecycle.
   */
  worldTolerance?: boolean;

  /**
   * User-defined drop constraints, evaluated in order after MosaicJS's own
   * built-in constraints (#20).
   *
   * @remarks
   * Default `[]` — no effect when omitted. Each function receives the
   * exact same {@link ConstraintInput} object the built-in
   * `checkConstraints()` call for that drop received (same object, same
   * fields — `dragged`, `target`, `kind`, `selectors`, `sourceGroup`,
   * `targetGroup`, `crossGroupDrag`, `container`, `depth`,
   * `maxNestingDepth`), so a user constraint has the identical signature
   * and calling convention as a built-in one and can be tested/composed
   * the same way.
   *
   * Evaluation order: built-in constraints (including a bubble-up retry
   * against ancestors, when {@link MosaicOptions.bubbleConstraints} is
   * enabled) run first — a built-in rejection short-circuits before any
   * user constraint runs at all. User constraints then run in array
   * order and stop at the first rejection; a later constraint never runs
   * once an earlier one (built-in or user) has rejected the drop.
   */
  constraints?: Array<(input: ConstraintInput) => ConstraintResult>;

  /**
   * User-defined cross-container constraints, evaluated last on a
   * cross-container drop (#160/RM-21.4) — after the *target* (peer)
   * instance's own built-in constraints and its own
   * {@link MosaicOptions.constraints} have already passed.
   *
   * @remarks
   * Default `[]` — no effect when omitted, and never evaluated at all
   * for a same-instance drop. Uses the exact same
   * `(input: ConstraintInput) => ConstraintResult` signature RM-20
   * already established for {@link MosaicOptions.constraints} — no new
   * calling convention. `input` carries `sourceInstanceId`/
   * `targetInstanceId` for a cross-container evaluation (omitted for a
   * same-instance one).
   *
   * Evaluated against the **target** (peer) instance's own array — the
   * instance whose DOM is receiving the drop is the one whose rules
   * govern whether it accepts the incoming node, mirroring how its own
   * built-in/user constraints are also evaluated using its own
   * `selectors`/`maxNestingDepth`/etc. rather than the dragging
   * instance's. The origin instance's own `crossContainerConstraints`
   * (if any) are not consulted for a drop it initiates — only for a
   * drop it *receives* from a peer.
   */
  crossContainerConstraints?: Array<
    (input: ConstraintInput) => ConstraintResult
  >;
}

/**
 * Mosaic is the public controller for an event-driven drag-and-drop system.
 *
 * It manages:
 * - Pointer lifecycle
 * - DOM snapshotting and rollback
 * - Deterministic state transitions
 * - Event emission for external observers
 *
 * Consumers should:
 * 1. Instantiate Mosaic with root element
 * 2. Call `initialize()`
 * 3. Listen for `mosaic:*` events
 *
 * Direct state manipulation is intentionally restricted.
 *
 * @example
 * ```ts
 * const mosaic = new Mosaic({
 *   root: document.querySelector("#list"),
 *   selectors: { node: ".item" }
 * });
 *
 * mosaic.initialize();
 *
 * window.addEventListener("mosaic:mutation:confirmed", () => {
 *   console.log("Order updated");
 * });
 * ```
 */
export class Mosaic {
  public root: HTMLElement;
  public selectors: MosaicOptions["selectors"];
  public cssClasses: CSSClassContract;
  public snapshot: MosaicSnapshot | null = null;
  public readonly crossGroupDrag: boolean;
  public readonly maxNestingDepth?: number;
  public readonly bubbleConstraints: boolean;
  public readonly worldTolerance: boolean;

  /**
   * Uniquely identifies this Mosaic instance across the page (#18).
   *
   * @remarks
   * Generated once at construction via `crypto.randomUUID()` — distinct
   * from {@link Mosaic.root}'s DOM `id` (`mosaicRootId` in
   * {@link DragContext}), which is not guaranteed unique. Consumers
   * observing multiple Mosaic instances on the same page should filter
   * hook/event payloads by this field.
   */
  public readonly mosaicInstanceId: string;

  /**
   * User-defined drop constraints, evaluated after built-in constraints
   * (#20). See {@link MosaicOptions.constraints}.
   */
  public readonly constraints: ReadonlyArray<
    (input: ConstraintInput) => ConstraintResult
  >;

  /**
   * User-defined cross-container constraints (#160/RM-21.4). See
   * {@link MosaicOptions.crossContainerConstraints}.
   */
  public readonly crossContainerConstraints: ReadonlyArray<
    (input: ConstraintInput) => ConstraintResult
  >;

  private state: MosaicState = MosaicState.Idle;
  private controller: DragController | null = null;
  private readonly dragLifecycleHooks?: DragLifecycleHooks;
  private readonly debug: boolean;

  /**
   * Registry of peer links, keyed by {@link Mosaic.mosaicInstanceId} —
   * `instanceId -> Set<peerInstanceId>` (#157/RM-21.1).
   *
   * @remarks
   * Keyed by instance id, not object reference, so two `Mosaic` instances
   * constructed against the same DOM `root` (e.g. after a framework
   * re-render) never collide or share links (AC4/AC13).
   *
   * Linking is deliberately non-transitive: this Map only ever holds
   * *directly* linked pairs — linking A↔B and B↔C never populates an
   * A↔C entry (AC5). Transitive linking was considered and rejected: it
   * would make `unlink()` ambiguous (does unlinking B↔C also sever the
   * implied A↔C? there's no principled answer), so peer relationships
   * are explicit, pairwise, and symmetric only.
   */
  private static readonly peerLinks = new Map<string, Set<string>>();

  /**
   * Registry of live instances, keyed by {@link Mosaic.mosaicInstanceId}
   * (#157/RM-21.1) — lets later cross-container work (RM-21.2/21.3/21.4)
   * resolve a peer's actual `Mosaic` object from an id.
   *
   * @remarks
   * Pruned on {@link Mosaic.destroy}, per AC7 — this registry does not
   * hold destroyed instances, so it cannot itself prevent them from being
   * garbage collected once the consumer drops its own reference.
   */
  private static readonly instancesById = new Map<string, Mosaic>();

  constructor(options: MosaicOptions) {
    this.root = options.root;
    this.selectors = options.selectors;
    this.cssClasses = Object.freeze({
      ...DEFAULT_CSS_CLASS_CONTRACT,
      ...options.cssClasses,
    });
    this.crossGroupDrag = Boolean(options.crossGroupDrag);
    this.maxNestingDepth = options.maxNestingDepth;
    this.bubbleConstraints = Boolean(options.bubbleConstraints);
    this.dragLifecycleHooks = options.dragLifecycleHooks;
    this.debug = Boolean(options.debug);
    this.worldTolerance = Boolean(options.worldTolerance);
    this.mosaicInstanceId = crypto.randomUUID();
    this.constraints = options.constraints ?? [];
    this.crossContainerConstraints = options.crossContainerConstraints ?? [];

    Mosaic.instancesById.set(this.mosaicInstanceId, this);
  }

  /**
   * Registers `a` and `b` as peer Mosaic instances (#157/RM-21.1).
   *
   * @remarks
   * Symmetric — linking A→B also links B→A; there is no directional link
   * concept. Idempotent — linking an already-linked pair is a no-op.
   * Linking an instance to itself is a no-op (a self-peer relationship is
   * meaningless and would only complicate {@link Mosaic.unlink}/
   * {@link Mosaic.destroy} bookkeeping for no benefit).
   */
  static link(a: Mosaic, b: Mosaic): void {
    if (a === b) return;

    Mosaic.peersOf(a.mosaicInstanceId).add(b.mosaicInstanceId);
    Mosaic.peersOf(b.mosaicInstanceId).add(a.mosaicInstanceId);
  }

  /**
   * Removes the peer relationship between `a` and `b` (#157/RM-21.1).
   *
   * @remarks
   * Symmetric — removes both directions. A no-op if the pair was never
   * linked.
   */
  static unlink(a: Mosaic, b: Mosaic): void {
    Mosaic.peerLinks.get(a.mosaicInstanceId)?.delete(b.mosaicInstanceId);
    Mosaic.peerLinks.get(b.mosaicInstanceId)?.delete(a.mosaicInstanceId);
  }

  /**
   * Whether `a` and `b` are currently linked peers (#157/RM-21.1).
   *
   * @remarks
   * Returns `false` for any pair that was never linked, or that has
   * since been unlinked/torn down — this is the default-reject baseline
   * RM-21.4's "unlinked instances reject cross-instance drops by
   * default" behavior checks against.
   */
  static arePeers(a: Mosaic, b: Mosaic): boolean {
    return (
      Mosaic.peerLinks.get(a.mosaicInstanceId)?.has(b.mosaicInstanceId) ?? false
    );
  }

  /**
   * Instance-method convenience wrapper for {@link Mosaic.arePeers}
   * (#157/RM-21.1) — lets cross-container code ask `mosaic.isLinkedTo(other)`
   * without reaching into static registry state directly.
   */
  isLinkedTo(other: Mosaic): boolean {
    return Mosaic.arePeers(this, other);
  }

  /**
   * Returns the live `Mosaic` instances currently linked as peers to this
   * one (#158/RM-21.2), resolved from {@link Mosaic.instancesById}.
   *
   * @remarks
   * Consumed by `DragController.pointerMove`'s cross-peer resolution
   * fallback (#158) — probing every linked peer's `root`/`selectors` when
   * this instance's own resolution finds nothing under the pointer.
   * Order is insertion order of `Mosaic.link()` calls, not otherwise
   * meaningful.
   */
  getLinkedPeers(): Mosaic[] {
    const peerIds = Mosaic.peerLinks.get(this.mosaicInstanceId);
    if (!peerIds) return [];

    const peers: Mosaic[] = [];
    for (const id of peerIds) {
      const peer = Mosaic.instancesById.get(id);
      /* v8 ignore next -- @preserve | defensive guard: a peer id in this instance's own link set is only ever removed in lockstep with instancesById on destroy() (see destroy()'s cleanup), so a miss here should be structurally unreachable. */
      if (peer) peers.push(peer);
    }
    return peers;
  }

  /**
   * Finds the live `Mosaic` instance whose `root` contains `element`, if
   * any (#160/RM-21.4).
   *
   * @remarks
   * Iterates every live instance (via {@link Mosaic.instancesById}), not
   * just this instance's own linked peers — used specifically to detect
   * a drop resolved onto some *other*, unrelated (and possibly unlinked)
   * instance's DOM, which by definition isn't in any instance's own peer
   * set and so `getLinkedPeers()` alone can never find it. Distinguishes
   * "the pointer released over another Mosaic instance's territory
   * entirely" from "the pointer released over ordinary page chrome
   * unrelated to any Mosaic instance."
   */
  static findInstanceContaining(element: Element): Mosaic | undefined {
    for (const instance of Mosaic.instancesById.values()) {
      if (instance.root.contains(element)) return instance;
    }
    return undefined;
  }

  private static peersOf(instanceId: string): Set<string> {
    let peers = Mosaic.peerLinks.get(instanceId);
    if (!peers) {
      peers = new Set();
      Mosaic.peerLinks.set(instanceId, peers);
    }
    return peers;
  }

  /**
   * Initializes the Mosaic instance.
   *
   * This attaches all required pointer event listeners and enables
   * drag-and-drop behavior on the root element.
   *
   * Must be called exactly once before user interaction.
   * Emits the `mosaic:init` event.
   */
  initialize() {
    this.controller = new DragController(this, this.dragLifecycleHooks);

    this.root.addEventListener("pointerdown", this.controller.pointerDown);
    window.addEventListener("pointermove", this.controller.pointerMove);
    window.addEventListener("pointerup", this.controller.pointerUp);

    emit("mosaic:init");
  }

  /**
   * Confirms the current mutation.
   *
   * This clears the active snapshot and finalizes the drag operation.
   * Called automatically after constraints allow a drop.
   *
   * @param constraintsEvaluated - Count of constraint evaluations (built-in
   *   + bubble-up retries + user constraints) performed to reach this
   *   confirmation (#22). Forwarded by {@link DragController}; callers
   *   outside the drag lifecycle may omit it.
   *
   * Emits `mosaic:mutation:confirmed`. When `constraintsEvaluated` is
   * provided, the payload is `{ constraintsEvaluated }`; when omitted,
   * the event carries no payload at all (preserves the exact pre-#22
   * emission for direct/manual `confirm()` calls).
   */
  confirm(constraintsEvaluated?: number) {
    this.snapshot = null;

    if (constraintsEvaluated === undefined) {
      emit("mosaic:mutation:confirmed");
    } else {
      emit("mosaic:mutation:confirmed", { constraintsEvaluated });
    }
  }

  /**
   * Rejects the current mutation and restores the previous DOM state.
   *
   * If no snapshot exists, this method is a no-op.
   *
   * @param result - The {@link ConstraintResult} that caused the
   *   rejection (#22) — the built-in or user constraint's own result,
   *   `reason` and `metadata` included. Forwarded by
   *   {@link DragController}; callers outside the drag lifecycle may
   *   omit it.
   *
   * Emits `mosaic:mutation:rejected` and `mosaic:rollback`. When `result`
   * is provided, `mosaic:mutation:rejected`'s payload is the full
   * `ConstraintResult` object; when omitted, the event carries no payload
   * at all (preserves the exact pre-#22 emission for direct/manual
   * `reject()` calls).
   */
  reject(result?: ConstraintResult) {
    if (!this.snapshot) return;

    restoreSnapshot(this.snapshot);
    // #15: restoreSnapshot is MosaicJS's own DOM write — drain it from the
    // world observer so it's never misclassified as an external mutation.
    this.controller?.drainWorldMutations();

    if (result === undefined) {
      emit("mosaic:mutation:rejected");
    } else {
      emit("mosaic:mutation:rejected", result);
    }
    emit("mosaic:rollback");

    this.snapshot = null;
  }

  /**
   * Tears down the Mosaic instance and removes all event listeners.
   *
   * After calling destroy(), the instance is inert and should be discarded.
   * Emits `mosaic:destroy`.
   *
   * @remarks
   * Also unlinks this instance from every peer it was linked to and
   * removes it from the instance registry (#157/RM-21.1, AC6/AC7) — no
   * dangling registry entries survive teardown, and the registry itself
   * does not hold a reference to a destroyed instance.
   */
  destroy() {
    if (this.controller) {
      this.root.removeEventListener("pointerdown", this.controller.pointerDown);
      window.removeEventListener("pointermove", this.controller.pointerMove);
      window.removeEventListener("pointerup", this.controller.pointerUp);
      this.controller.reset();
      this.controller = null;
    }

    const peers = Mosaic.peerLinks.get(this.mosaicInstanceId);
    if (peers) {
      for (const peerId of peers) {
        Mosaic.peerLinks.get(peerId)?.delete(this.mosaicInstanceId);
      }
      Mosaic.peerLinks.delete(this.mosaicInstanceId);
    }
    Mosaic.instancesById.delete(this.mosaicInstanceId);

    emit("mosaic:destroy");
  }

  public getState(): MosaicState {
    return this.state;
  }

  /**
   * Attempts to transition the Mosaic instance to a new lifecycle state.
   *
   * State transitions are validated against the internal deterministic
   * state machine. Invalid transitions are rejected.
   *
   * @param next - The target state
   * @param meta - Optional metadata forwarded with the state event
   * @param groupId - Identifier of the active group (#13), or `null` when
   *   ungrouped. Forwarded by {@link DragController} at each transition;
   *   callers outside the drag lifecycle may omit it.
   * @param dropTargetId - Identifier of the currently-hovered/resolved
   *   target (#16), or `null` when none. Forwarded by
   *   {@link DragController} at each transition, mirroring
   *   {@link DragContext.dropTargetId}'s naming; callers outside the drag
   *   lifecycle may omit it.
   *
   * @returns `true` if the transition was applied, `false` otherwise
   *
   * Emits:
   * - `mosaic:state` on success
   * - `mosaic:error` on invalid transition — payload includes `from`, `to`,
   *   `validTransitions` (the states actually reachable from `from`, per
   *   {@link MOSAIC_TRANSITIONS}), and `timestamp` (#19). When
   *   {@link MosaicOptions.debug} is enabled, the same information is also
   *   logged via `console.warn`.
   */
  public setState(
    next: MosaicState,
    meta?: unknown,
    groupId: string | null = null,
    dropTargetId: string | null = null
  ): boolean {
    const prev = this.state;

    if (prev === next) return false;

    if (!canTransition(prev, next)) {
      const validTransitions = MOSAIC_TRANSITIONS[prev];
      const timestamp = Date.now();

      emit("mosaic:error", {
        type: "invalid-transition",
        from: prev,
        to: next,
        validTransitions,
        timestamp,
      });

      if (this.debug) {
        console.warn("[MosaicJS] invalid state transition", {
          from: prev,
          to: next,
          validTransitions,
          timestamp,
        });
      }

      return false;
    }

    this.state = next;

    emit("mosaic:state", {
      from: prev,
      to: next,
      meta,
      groupId,
      dropTargetId,
    });

    return true;
  }
}
