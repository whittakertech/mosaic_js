import { createSnapshot } from "../snapshot";
import { checkConstraints } from "../constraints";
import type { ConstraintInput, ConstraintResult } from "../constraints";
import { MosaicState } from "../state";
// #160/RM-21.4: value import (not type-only) — Mosaic.findInstanceContaining()
// is called from pointerUp. This is a circular import (mosaic.ts imports
// DragController from this module), but safe: the reference is only ever
// used inside a method body, invoked well after both modules have finished
// evaluating, never at module-top-level/class-field-initializer time.
import { Mosaic } from "../mosaic";
import { emit } from "../events";
import { Ghost } from "../ghost";
import { applyClasses, removeClasses } from "../css/apply";
import type { DragLifecycleHooks } from "./lifecycle";
import { DRAG_HOOK_STATES } from "./lifecycle";
import type { DragContext } from "./context";
import { buildDragContext } from "./context";
import type { ResolvedTarget } from "./resolver";
import { resolveTarget, resolveGroup } from "./resolver";
import { WorldObserver } from "../world-tolerance";

export class DragController {
  /** @internal */
  readonly mosaic: Mosaic;
  readonly hooks?: DragLifecycleHooks;
  private activeNode: HTMLElement | null = null;
  private ghost: Ghost;
  private hover: ResolvedTarget | null = null;

  /**
   * The Mosaic instance {@link DragController.hover} was resolved against
   * (#158/RM-21.2) — `this.mosaic` for an own-instance hover, or a linked
   * peer for a cross-peer one. Tracked alongside `hover` so leave-side
   * bookkeeping (event root, CSS class contract) always targets the
   * instance the *previous* hover actually belonged to, even after the
   * pointer has moved on to a different instance (or back to none).
   */
  private hoverMosaic: Mosaic | null = null;

  /** #13: the active node's own group container at drag start, or null. */
  private activeGroup: HTMLElement | null = null;

  /** #13: the group container currently under the pointer (cross-group mode). */
  private hoverGroup: HTMLElement | null = null;

  /** #15: opt-in external-mutation tolerance, connected only during an active drag. */
  private readonly worldObserver: WorldObserver | null;

  constructor(mosaic: Mosaic, hooks?: DragLifecycleHooks) {
    this.mosaic = mosaic;
    this.hooks = hooks;
    this.ghost = new Ghost();
    this.worldObserver = mosaic.worldTolerance
      ? new WorldObserver(mosaic)
      : null;

    this.pointerDown = this.pointerDown.bind(this);
    this.pointerMove = this.pointerMove.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
  }

  /**
   * Discards any mutation records queued by the world observer since its
   * last flush (#15). Called by MosaicJS immediately after any DOM write
   * it performs itself (live reorder, snapshot restore) so that write is
   * never misclassified as an external mutation. A no-op when
   * `worldTolerance` is disabled or no drag is active.
   */
  drainWorldMutations(): void {
    this.worldObserver?.drain();
  }

  pointerDown(e: PointerEvent) {
    const node = (e.target as HTMLElement)?.closest(this.mosaic.selectors.node);
    if (!(node instanceof HTMLElement)) return;

    const handle = this.mosaic.selectors.handle;
    if (handle) {
      // `node` was already resolved via `e.target.closest(...)` above without
      // throwing, so `e.target.closest` is known to be callable here too —
      // no need to re-guard it (an earlier version of this check did, but
      // that branch was dead code: unreachable given the resolution above).
      const handleMatch = (e.target as HTMLElement).closest(handle);

      // The matched handle must live inside this node — a handle selector
      // matching an ancestor or an unrelated element must not gate the node.
      if (
        !(handleMatch instanceof HTMLElement) ||
        !node.contains(handleMatch)
      ) {
        return;
      }
    }

    this.activeNode = node;
    this.activeGroup = resolveGroup(
      node,
      this.mosaic.root,
      this.mosaic.selectors.group
    );
    if (this.activeGroup) {
      applyClasses(this.activeGroup, this.mosaic.cssClasses.groupActive);
    }

    applyClasses(this.activeNode, this.mosaic.cssClasses.active);
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.setMosaicState(MosaicState.PointerDown);

    // #15: connect only for the duration of this drag; reset() tears it down.
    this.worldObserver?.connect();

    this.invokeHook("onDragStart", this.createContext(e));

    this.ghost.create(
      this.mosaic.cssClasses,
      this.activeNode,
      e.clientX,
      e.clientY
    );
  }

  pointerMove(e: PointerEvent) {
    if (!this.activeNode) return;

    this.setMosaicState(MosaicState.Dragging);

    const elementUnderPointer = document.elementFromPoint(e.clientX, e.clientY);

    let next = resolveTarget(
      elementUnderPointer,
      this.activeNode,
      this.mosaic.root,
      this.mosaic.selectors,
      this.mosaic.mosaicInstanceId
    );
    let nextMosaic: Mosaic = this.mosaic;

    // #158/RM-21.2, AC1/AC4: own-root resolution takes priority; only when
    // it finds nothing at all do we probe linked peers, and only linked
    // peers — there is no "resolve first, check link status after" step,
    // so an unlinked instance's root never even sees this probe (its DOM
    // is never touched by another instance's drag).
    if (!next) {
      for (const peer of this.mosaic.getLinkedPeers()) {
        const peerResolved = resolveTarget(
          elementUnderPointer,
          this.activeNode,
          peer.root,
          peer.selectors,
          peer.mosaicInstanceId
        );
        if (peerResolved) {
          next = peerResolved;
          nextMosaic = peer;
          break;
        }
      }
    }

    if (next?.element !== this.hover?.element) {
      // `hoverMosaic` is always set in lockstep with `hover` (both are
      // set/cleared together, below and in reset()), so `hover` being
      // truthy here guarantees `hoverMosaic` is too — non-null assertion,
      // not a real fallback branch.
      if (this.hover) this.leaveHover(this.hover, this.hoverMosaic!);
      if (next) this.enterHover(next, nextMosaic);
      this.hover = next;
      this.hoverMosaic = next ? nextMosaic : null;
    }

    // #158: cross-peer hover — a target resolved against a linked peer's
    // root, rather than this instance's own root.
    const isPeerHover = next !== null && nextMosaic !== this.mosaic;

    // #13: cross-group mode only — track which group container is under the
    // pointer independently of the node/dropTarget hover pair above, since a
    // pointer can be over a different group without resolving to a new
    // element (e.g. moving within the same target across a group edge).
    //
    // #158: this is an own-instance-only concept — `this.activeGroup` is an
    // element in *this* instance's DOM, so it has no meaningful relationship
    // to a peer's own group elements (different DOM tree entirely, even for
    // a same-named group). A peer hover is therefore always treated as "no
    // own-instance group under the pointer" here, exactly as if the pointer
    // had left every own-instance group — cross-instance group-hover
    // tracking is out of scope for this ticket (not required by any AC).
    if (this.mosaic.crossGroupDrag && this.mosaic.selectors.group) {
      const nextGroup = isPeerHover ? null : (next?.group ?? null);
      if (nextGroup !== this.hoverGroup) {
        if (this.hoverGroup) this.leaveGroupHover(this.hoverGroup);
        if (nextGroup && nextGroup !== this.activeGroup) {
          this.enterGroupHover(nextGroup);
        }
        this.hoverGroup = nextGroup;
      }
    }

    if (!this.hover) return;

    this.ghost.move(e.clientX, e.clientY);
    this.invokeHook("onDragMove", this.createContext(e));

    const targetGroup = this.hover.group;

    // #13: a target in a different group than the active node is only a
    // live reorder anchor when cross-group dragging is enabled — otherwise
    // the group boundary blocks the reorder outright (the eventual drop is
    // still rejected by checkConstraints as a defensive backstop).
    //
    // #158/RM-21.2 design decision (flagged, not silently picked): this
    // check is skipped entirely for a cross-peer hover. It compares
    // `this.hover.group` (a peer-tree element for a peer hover) against
    // `this.activeGroup` (always an origin-tree element, or null) — these
    // can never be reference-equal across two different DOM trees, so
    // reusing this check verbatim would block every cross-peer preview
    // outright unless `crossGroupDrag` happened to be enabled on the
    // *origin* instance, which has no logical bearing on a cross-*instance*
    // move. The real gate for whether cross-instance preview is allowed at
    // all is the peer link itself (#157) — already enforced above, since
    // only linked peers are ever probed. Circular-nesting and
    // nesting-depth guards below remain fully peer-agnostic and unchanged
    // (per AC3/AC12), since they don't carry this same-tree assumption.
    if (
      !isPeerHover &&
      targetGroup !== this.activeGroup &&
      !this.mosaic.crossGroupDrag
    ) {
      return;
    }

    const container = this.hover.container;

    // #12: circular-nesting guard — never live-reparent/reorder a node into
    // itself or one of its own descendants. checkConstraints is still the
    // authoritative gate at drop; this just avoids a visibly broken
    // intermediate DOM state during the drag itself.
    if (container === this.activeNode || this.activeNode.contains(container)) {
      return;
    }

    // #12: max nesting depth guard — same live-preview rationale as above.
    //
    // #158/RM-21.2, AC12: evaluated against the RESOLVED instance's own
    // maxNestingDepth (the peer's, for a cross-peer hover) — each Mosaic
    // instance's nesting limit governs its own DOM subtree, not the
    // dragging instance's unrelated configuration.
    const effectiveMaxNestingDepth = nextMosaic.maxNestingDepth;
    if (
      typeof effectiveMaxNestingDepth === "number" &&
      this.hover.depth > effectiveMaxNestingDepth
    ) {
      return;
    }

    if (this.hover.kind === "dropTarget") {
      // #12: reparent into the explicit drop target itself — deferred by
      // #11's own PR to this ticket. Appended at the end of the target's
      // existing children; position-within-target ordering is a natural
      // follow-up, not required by this ticket's acceptance criteria.
      container.appendChild(this.activeNode);
      this.drainWorldMutations();
      return;
    }

    // kind === "node": reorder among container's children — root (#11
    // baseline), a group (#13), or a nested drop-target container (#12).
    const target = this.hover.element;

    // 🔒 Critical invariant: node reordering happens only among children of
    // the resolved container.
    if (target.parentElement !== container) return;

    const targetRect = target.getBoundingClientRect();
    const before = e.clientY < targetRect.top + targetRect.height / 2;

    const referenceNode = before ? target : target.nextSibling;
    container.insertBefore(this.activeNode, referenceNode);
    this.drainWorldMutations();
  }

  pointerUp(e: PointerEvent) {
    /* v8 ignore next -- @preserve | defensive guard: pointerUp should never fire without an active drag */
    if (!this.activeNode) return;

    const from = e.target instanceof HTMLElement ? e.target : this.activeNode;

    // #160/RM-21.4: own-root resolution still takes priority, unchanged.
    let resolved = resolveTarget(
      from,
      this.activeNode,
      this.mosaic.root,
      this.mosaic.selectors,
      this.mosaic.mosaicInstanceId
    );
    let targetMosaic: Mosaic = this.mosaic;
    let crossContainer = false;

    // #160 AC1/AC3: only when own-root resolution finds nothing do we
    // probe linked peers — mirrors #158's pointerMove fallback exactly,
    // including "only linked peers, no exceptions".
    if (!resolved) {
      for (const peer of this.mosaic.getLinkedPeers()) {
        const peerResolved = resolveTarget(
          from,
          this.activeNode,
          peer.root,
          peer.selectors,
          peer.mosaicInstanceId
        );
        if (peerResolved) {
          resolved = peerResolved;
          targetMosaic = peer;
          crossContainer = true;
          break;
        }
      }
    }

    // #160 AC2: a drop resolved onto an UNLINKED instance's DOM is
    // rejected outright, before any constraint function runs — the
    // registry check is the first gate, not a constraint among others.
    // Detected by checking whether `from` lives inside some *other* live
    // Mosaic instance's root at all (linked or not); own-root and
    // linked-peer resolution already failed by this point, so finding a
    // foreign, unlinked owner here is unambiguous.
    let unlinkedInstanceRejection: Mosaic | null = null;
    if (!resolved) {
      const foreignOwner = Mosaic.findInstanceContaining(from);
      if (
        foreignOwner &&
        foreignOwner !== this.mosaic &&
        !this.mosaic.isLinkedTo(foreignOwner)
      ) {
        unlinkedInstanceRejection = foreignOwner;
      }
    }

    const dropTarget = resolved?.element ?? this.activeNode;

    const enteredDropping = this.setMosaicState(MosaicState.Dropping);
    /* v8 ignore next 4 -- @preserve | defensive guard: Dropping is guaranteed from Dragging by the state machine.
       This branch exists to protect against external misuse or future transition changes. */
    if (!enteredDropping) {
      this.reset(e);
      return;
    }
    this.invokeHook("onPreDrop", this.createContext(e));

    const crossIds = crossContainer
      ? {
          sourceInstanceId: this.mosaic.mosaicInstanceId,
          targetInstanceId: targetMosaic.mosaicInstanceId,
        }
      : {};

    // #160/RM-21.4 design decision (flagged, not silently picked — AC1
    // itself left "instead of or in addition to" the existing
    // same-instance checkConstraints() call explicitly open): for a
    // cross-container drop, built-in/user-constraint evaluation runs
    // entirely against the TARGET (peer) instance's own configuration
    // (selectors, maxNestingDepth, bubbleConstraints, constraints,
    // crossContainerConstraints) — never the origin's. Reusing the
    // origin's own checkConstraints() call with the origin's selectors
    // would be actively wrong: the peer's resolved target was matched
    // against the PEER's own selectors (possibly a completely different
    // class-name scheme), so re-validating it against the origin's
    // selectors could spuriously reject (or wrongly accept) a drop based
    // on selector strings that have no bearing on the peer's DOM at all.
    // This directly extends #158's own precedent — "each Mosaic
    // instance's nesting limit governs its own subtree" — to the full
    // constraint pipeline, not just the live-preview nesting-depth guard.
    // For a same-instance drop, `targetMosaic === this.mosaic`, so every
    // field below is identical to the pre-#160 behavior — no change.
    let input: ConstraintInput = {
      dragged: this.activeNode,
      target: dropTarget,
      kind: resolved?.kind,
      selectors: targetMosaic.selectors,
      sourceGroup: this.activeGroup,
      targetGroup: resolved?.group ?? null,
      crossGroupDrag: targetMosaic.crossGroupDrag,
      container: resolved?.container,
      depth: resolved?.depth,
      maxNestingDepth: targetMosaic.maxNestingDepth,
      ...crossIds,
    };

    let constraintsEvaluated = 0;
    let allowed: boolean;
    let result: ConstraintResult;

    if (unlinkedInstanceRejection) {
      allowed = false;
      result = {
        allowed: false,
        reason: "unlinked-instance",
        metadata: {
          targetInstanceId: unlinkedInstanceRejection.mosaicInstanceId,
        },
      };
    } else {
      constraintsEvaluated = 1;
      result = checkConstraints(input);
      allowed = result.allowed;

      // #12: bubble-up — a rejection at the innermost resolved target is
      // retried against each ancestor (innermost-first) until one is
      // allowed. #160: uses the TARGET instance's own bubbleConstraints
      // setting and tree, same "peer's own rules" principle as above.
      //
      // #22: the innermost rejection's own `result` (reason/metadata) is
      // deliberately preserved as the reported one if bubbling never
      // succeeds — a failed ancestor attempt does not overwrite it, since
      // the innermost target is what the user actually tried to drop on.
      if (!allowed && targetMosaic.bubbleConstraints && resolved) {
        for (const ancestor of resolved.ancestors) {
          const ancestorResolved = resolveTarget(
            ancestor,
            this.activeNode,
            targetMosaic.root,
            targetMosaic.selectors,
            targetMosaic.mosaicInstanceId
          );
          if (!ancestorResolved) continue;

          const ancestorInput: ConstraintInput = {
            dragged: this.activeNode,
            target: ancestorResolved.element,
            kind: ancestorResolved.kind,
            selectors: targetMosaic.selectors,
            sourceGroup: this.activeGroup,
            targetGroup: ancestorResolved.group,
            crossGroupDrag: targetMosaic.crossGroupDrag,
            container: ancestorResolved.container,
            depth: ancestorResolved.depth,
            maxNestingDepth: targetMosaic.maxNestingDepth,
            ...crossIds,
          };

          constraintsEvaluated++;
          const ancestorResult = checkConstraints(ancestorInput);

          if (ancestorResult.allowed) {
            allowed = true;
            input = ancestorInput;
            result = ancestorResult;
            break;
          }
        }
      }

      // #20: user-defined constraints run only once every built-in check
      // has passed (including a successful bubble-up rescue) — a built-in
      // rejection short-circuits before any user constraint ever runs.
      // #160: evaluated against the TARGET instance's own `constraints`
      // array. Each user constraint receives the exact ConstraintInput
      // object that passed the built-in gate (reference-identical, not a
      // rebuilt copy), in registration order, stopping at the first
      // rejection.
      //
      // #22: a rejecting user constraint's own result (reason/metadata,
      // whatever shape it chose to return) becomes the reported one.
      if (allowed) {
        for (const constraint of targetMosaic.constraints) {
          constraintsEvaluated++;
          const userResult = constraint(input);
          if (!userResult.allowed) {
            allowed = false;
            result = userResult;
            break;
          }
        }
      }

      // #160 AC5/AC6: cross-container constraints run LAST — only for an
      // actual cross-container drop, only once the target instance's own
      // built-in and user constraints have already passed, evaluated
      // against the TARGET's own crossContainerConstraints array (the
      // instance receiving the drop is the one whose rules govern
      // whether it accepts an incoming node from elsewhere).
      if (allowed && crossContainer) {
        for (const constraint of targetMosaic.crossContainerConstraints) {
          constraintsEvaluated++;
          const crossResult = constraint(input);
          if (!crossResult.allowed) {
            allowed = false;
            result = crossResult;
            break;
          }
        }
      }
    }

    this.processResult(allowed, e, result, constraintsEvaluated);

    // #160 AC7: fires only on a CONFIRMED cross-container drop — after
    // processResult() has already called this.mosaic.confirm(), which is
    // sufficient on its own per #159's finding (the target/peer instance
    // never captures a snapshot from a cross-peer hover in the first
    // place, so there's nothing on its side to separately confirm/clear).
    if (allowed && crossContainer) {
      emit("mosaic:container:transfer", {
        sourceInstanceId: this.mosaic.mosaicInstanceId,
        targetInstanceId: targetMosaic.mosaicInstanceId,
        nodeId: this.activeNode.id,
      });
    }

    this.reset(e);
  }

  processResult(
    allowed: boolean,
    e: PointerEvent,
    result: ConstraintResult,
    constraintsEvaluated: number
  ): void {
    const resultMap = allowed ? RESULT_MAP.allowed : RESULT_MAP.rejected;

    this.setMosaicState(resultMap.state);
    this.invokeHook(resultMap.hook, this.createContext(e));

    if (allowed) {
      this.mosaic.confirm(constraintsEvaluated);
    } else {
      this.mosaic.reject(result);
    }
  }

  reset(e?: PointerEvent) {
    // #15: disconnect before any other teardown — reset() is the sole
    // teardown point for both the natural end-of-drag path and destroy().
    this.worldObserver?.disconnect();

    this.ghost.remove();
    if (this.activeNode) {
      removeClasses(this.activeNode, this.mosaic.cssClasses.active);
    }
    if (this.hover) {
      // Same invariant as pointerMove's leaveHover call above.
      this.leaveHoverClasses(this.hover, this.hoverMosaic!);
    }
    if (this.activeGroup) {
      removeClasses(this.activeGroup, this.mosaic.cssClasses.groupActive);
    }
    if (this.hoverGroup) {
      removeClasses(this.hoverGroup, this.mosaic.cssClasses.groupHover);
    }
    this.activeNode = null;
    this.hover = null;
    this.hoverMosaic = null;
    this.activeGroup = null;
    this.hoverGroup = null;

    this.setMosaicState(MosaicState.Idle);

    if (e) this.invokeHook("onDragEnd", this.createContext(e));
  }

  /**
   * Forwards a state transition to the Mosaic instance, attaching the
   * active group's identifier (#13) when groups are configured, and the
   * currently-hovered/resolved target's identifier (#16) — both `null`
   * when not applicable, so ungrouped/no-hover payloads are unaffected.
   */
  private setMosaicState(next: MosaicState): boolean {
    const dropTargetId = this.hover?.element.id ?? null;

    if (!this.mosaic.selectors.group) {
      return this.mosaic.setState(next, undefined, null, dropTargetId);
    }
    return this.mosaic.setState(
      next,
      undefined,
      this.activeGroup?.id ?? null,
      dropTargetId
    );
  }

  private invokeHook<K extends keyof DragLifecycleHooks>(
    hook: K,
    ctx: DragContext
  ): void {
    const expected = DRAG_HOOK_STATES[hook];

    if (expected && ctx.state !== expected) {
      throw new Error(
        `Hook ${hook} invoked in ${ctx.state}, expected ${expected}.`
      );
    }

    this.hooks?.[hook]?.(ctx);
  }

  private createContext(e: PointerEvent): DragContext {
    return buildDragContext({
      mosaicRootId: this.mosaic.root.id,
      activeNodeId: this.activeNode?.id ?? null,
      dropTargetId: this.hover?.element.id ?? null,
      pointer: {
        x: e.clientX,
        y: e.clientY,
      },
      state: this.mosaic.getState(),
      hasSnapshot: Boolean(this.mosaic.snapshot),
      mosaicInstanceId: this.mosaic.mosaicInstanceId,
      // #18: same value setMosaicState() already forwards as its groupId
      // argument — threaded here so hooks/DragContext see it too.
      groupId: this.activeGroup?.id ?? null,
    });
  }

  /**
   * @param targetMosaic - The instance {@link resolved} belongs to
   *   (#158/RM-21.2) — `this.mosaic` for an own-instance hover, a linked
   *   peer for a cross-peer one. Governs which instance's `cssClasses`
   *   contract applies to the hovered element (its own DOM/stylesheet
   *   contract, not the dragging instance's) and which root the hover
   *   event dispatches on.
   */
  private enterHover(resolved: ResolvedTarget, targetMosaic: Mosaic) {
    if (resolved.kind === "dropTarget") {
      applyClasses(resolved.element, targetMosaic.cssClasses.dropTarget);
    }
    this.emitHoverEvent("mosaic:hover:enter", resolved, targetMosaic);
  }

  private leaveHover(resolved: ResolvedTarget, targetMosaic: Mosaic) {
    this.leaveHoverClasses(resolved, targetMosaic);
    this.emitHoverEvent("mosaic:hover:leave", resolved, targetMosaic);
  }

  private leaveHoverClasses(resolved: ResolvedTarget, targetMosaic: Mosaic) {
    if (resolved.kind === "dropTarget") {
      removeClasses(resolved.element, targetMosaic.cssClasses.dropTarget);
    }
  }

  /**
   * #158/RM-21.2, AC5/AC6: dispatches on `targetMosaic.root` — the actual
   * root under the pointer, i.e. the peer's root for a cross-peer hover,
   * not the dragging instance's own root — since that's the DOM subtree
   * that instance's own listeners are attached to. Payload gains
   * `sourceInstanceId` (always the dragging instance) and
   * `targetInstanceId` (`resolved.instanceId`, per AC2 always set) so a
   * listener on either instance can tell a same-instance hover from a
   * cross-peer one.
   *
   * Design note: this branch's payload predates RM-16 (#8, a separate,
   * independently-stacked PR chain not in this branch's lineage), so it
   * does not include RM-16's `groupId` field. `sourceInstanceId`/
   * `targetInstanceId` are additive and orthogonal to `groupId` — whichever
   * of RM-16 or this stack merges to `epic/Spacial-Intelligence` first,
   * the other's rebase picks up both fields with no conflict.
   */
  private emitHoverEvent(
    type: "mosaic:hover:enter" | "mosaic:hover:leave",
    resolved: ResolvedTarget,
    targetMosaic: Mosaic
  ) {
    targetMosaic.root.dispatchEvent(
      new CustomEvent(type, {
        detail: {
          targetId: resolved.element.id,
          targetType: resolved.kind,
          depth: resolved.depth,
          sourceInstanceId: this.mosaic.mosaicInstanceId,
          targetInstanceId: resolved.instanceId,
          // #16: same `resolved.group?.id ?? null` convention used
          // everywhere else (mosaic:group:enter/leave, mosaic:state).
          groupId: resolved.group?.id ?? null,
        },
      })
    );
  }

  /** #13: cross-group mode only — a dragged node crosses into another group. */
  private enterGroupHover(group: HTMLElement) {
    applyClasses(group, this.mosaic.cssClasses.groupHover);
    this.emitGroupEvent("mosaic:group:enter", group);
  }

  /** #13: cross-group mode only — a dragged node exits a non-origin group. */
  private leaveGroupHover(group: HTMLElement) {
    removeClasses(group, this.mosaic.cssClasses.groupHover);
    this.emitGroupEvent("mosaic:group:leave", group);
  }

  private emitGroupEvent(
    type: "mosaic:group:enter" | "mosaic:group:leave",
    group: HTMLElement
  ) {
    this.mosaic.root.dispatchEvent(
      new CustomEvent(type, {
        detail: { groupId: group.id },
      })
    );
  }
}

const RESULT_MAP = {
  allowed: {
    state: MosaicState.Mutated,
    hook: "onDropConfirmed",
  },
  rejected: {
    state: MosaicState.RollingBack,
    hook: "onDropRejected",
  },
} as const;
