// src/snapshot.ts
function createSnapshot(root) {
  const nodes = Array.from(root.querySelectorAll("[data-mosaic-id]"));
  return {
    dom: nodes.map((el) => ({
      id: el.getAttribute("data-mosaic-id"),
      parent: el.parentElement,
      order: Array.from(el.parentElement.children).indexOf(el)
    }))
  };
}
function restoreSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.dom)) return;
  for (const { id, parent, order } of snapshot.dom) {
    const el = document.querySelector(`[data-mosaic-id="${id}"]`);
    if (!el) continue;
    const ref = parent.children[order] || null;
    parent.insertBefore(el, ref);
  }
}

// src/constraints.ts
function checkConstraints(dragged, target, selectors) {
  if (dragged === target) {
    return { allowed: true };
  }
  if (!target.matches(selectors.node)) {
    return { allowed: false, reason: "invalid-target" };
  }
  return { allowed: true };
}

// src/state.ts
var MosaicState = /* @__PURE__ */ ((MosaicState2) => {
  MosaicState2["Idle"] = "idle";
  MosaicState2["PointerDown"] = "pointerdown";
  MosaicState2["Dragging"] = "dragging";
  MosaicState2["Dropping"] = "dropping";
  MosaicState2["Mutated"] = "mutated";
  MosaicState2["RollingBack"] = "rollback";
  MosaicState2["Destroyed"] = "destroyed";
  return MosaicState2;
})(MosaicState || {});
var MOSAIC_TRANSITIONS = {
  ["idle" /* Idle */]: ["pointerdown" /* PointerDown */, "destroyed" /* Destroyed */],
  ["pointerdown" /* PointerDown */]: ["dragging" /* Dragging */, "idle" /* Idle */],
  ["dragging" /* Dragging */]: ["dropping" /* Dropping */],
  ["dropping" /* Dropping */]: ["mutated" /* Mutated */, "rollback" /* RollingBack */],
  ["mutated" /* Mutated */]: ["idle" /* Idle */, "rollback" /* RollingBack */],
  ["rollback" /* RollingBack */]: ["idle" /* Idle */],
  ["destroyed" /* Destroyed */]: []
};
function canTransition(from, to) {
  return MOSAIC_TRANSITIONS[from].includes(to);
}

// src/css/apply.ts
function applyClasses(el, classes) {
  if (!classes) return;
  el.classList.add(...classes.split(/\s+/).filter(Boolean));
}
function removeClasses(el, classes) {
  if (!classes) return;
  el.classList.remove(...classes.split(/\s+/).filter(Boolean));
}

// src/ghost.ts
var Ghost = class {
  constructor() {
    this.ghost = null;
    this.offsetX = 0;
    this.offsetY = 0;
    /** RAF handle so we can cancel pending frames */
    this.frame = null;
    /** continuous RAF loop state */
    this.running = false;
    this.latestX = 0;
    this.latestY = 0;
  }
  create(css, node, x, y) {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError(
        "Ghost.create expected HTMLElement; received " + typeof node
      );
    }
    this.remove();
    const rect = node.getBoundingClientRect();
    this.offsetX = x - rect.left;
    this.offsetY = y - rect.top;
    const clone = node.cloneNode(true);
    applyClasses(clone, css.ghost);
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.margin = "0";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "9999";
    clone.style.boxSizing = "border-box";
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    document.body.appendChild(clone);
    this.ghost = clone;
    this.move(x, y);
  }
  move(x, y) {
    if (!this.ghost) return;
    this.latestX = x;
    this.latestY = y;
    const tx = `${x - this.offsetX}px`;
    const ty = `${y - this.offsetY}px`;
    this.ghost.style.transform = `translate3d(${tx}, ${ty}, 0)`;
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.ghost) {
        this.running = false;
        return;
      }
      const tx2 = `${this.latestX - this.offsetX}px`;
      const ty2 = `${this.latestY - this.offsetY}px`;
      this.ghost.style.transform = `translate3d(${tx2}, ${ty2}, 0)`;
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }
  remove() {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.running = false;
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }
  }
};

// src/drag/lifecycle.ts
var DRAG_HOOK_STATES = Object.freeze({
  onDragStart: "pointerdown" /* PointerDown */,
  onDragMove: "dragging" /* Dragging */,
  onPreDrop: "dropping" /* Dropping */,
  onDropConfirmed: "mutated" /* Mutated */,
  onDropRejected: "rollback" /* RollingBack */,
  onDragEnd: "idle" /* Idle */
});

// src/drag/context.ts
function buildDragContext(params) {
  return Object.freeze({
    mosaicRootId: params.mosaicRootId,
    activeNodeId: params.activeNodeId,
    dropTargetId: params.dropTargetId,
    pointer: {
      x: params.pointer.x,
      y: params.pointer.y
    },
    state: params.state,
    hasSnapshot: params.hasSnapshot
  });
}

// src/drag/controller.ts
var DragController = class {
  constructor(mosaic, hooks) {
    this.activeNode = null;
    this.hoverTarget = null;
    this.mosaic = mosaic;
    this.hooks = hooks;
    this.ghost = new Ghost();
    this.pointerDown = this.pointerDown.bind(this);
    this.pointerMove = this.pointerMove.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
  }
  pointerDown(e) {
    const node = e.target?.closest(this.mosaic.selectors.node);
    if (!(node instanceof HTMLElement)) return;
    this.activeNode = node;
    applyClasses(this.activeNode, this.mosaic.cssClasses.active);
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.mosaic.setState("pointerdown" /* PointerDown */);
    this.invokeHook("onDragStart", this.createContext(e));
    this.ghost.create(
      this.mosaic.cssClasses,
      this.activeNode,
      e.clientX,
      e.clientY
    );
  }
  pointerMove(e) {
    if (!this.activeNode) return;
    this.mosaic.setState("dragging" /* Dragging */);
    const nextHover = this.resolveHoverTarget(e);
    if (nextHover !== this.hoverTarget) {
      if (this.hoverTarget)
        this.emitHoverEvent("mosaic:hover:leave", this.hoverTarget);
      if (nextHover) this.emitHoverEvent("mosaic:hover:enter", nextHover);
      this.hoverTarget = nextHover;
    }
    if (!this.hoverTarget) return;
    const { root } = this.mosaic;
    if (this.hoverTarget.parentElement !== root) return;
    const targetRect = this.hoverTarget.getBoundingClientRect();
    const before = e.clientY < targetRect.top + targetRect.height / 2;
    this.ghost.move(e.clientX, e.clientY);
    this.invokeHook("onDragMove", this.createContext(e));
    const referenceNode = before ? this.hoverTarget : this.hoverTarget.nextSibling;
    root.insertBefore(this.activeNode, referenceNode);
  }
  pointerUp(e) {
    if (!this.activeNode) return;
    let t = e.target;
    if (!(t instanceof HTMLElement)) {
      t = this.activeNode;
    }
    let dropTarget = this.activeNode;
    if (t instanceof HTMLElement && typeof t.closest === "function") {
      dropTarget = t.closest(this.mosaic.selectors.node) ?? this.activeNode;
    }
    const enteredDropping = this.mosaic.setState("dropping" /* Dropping */);
    if (!enteredDropping) {
      this.reset(e);
      return;
    }
    this.invokeHook("onPreDrop", this.createContext(e));
    const result = checkConstraints(
      this.activeNode,
      dropTarget,
      this.mosaic.selectors
    );
    this.processResult(result.allowed, e);
    this.reset(e);
  }
  processResult(allowed, e) {
    const result = allowed ? RESULT_MAP.allowed : RESULT_MAP.rejected;
    this.mosaic.setState(result.state);
    this.invokeHook(result.hook, this.createContext(e));
    this.mosaic[result.action]();
  }
  reset(e) {
    this.ghost.remove();
    if (this.activeNode) {
      removeClasses(this.activeNode, this.mosaic.cssClasses.active);
    }
    this.activeNode = null;
    this.hoverTarget = null;
    this.mosaic.setState("idle" /* Idle */);
    if (e) this.invokeHook("onDragEnd", this.createContext(e));
  }
  invokeHook(hook, ctx) {
    const expected = DRAG_HOOK_STATES[hook];
    if (expected && ctx.state !== expected) {
      throw new Error(
        `Hook ${hook} invoked in ${ctx.state}, expected ${expected}.`
      );
    }
    this.hooks?.[hook]?.(ctx);
  }
  createContext(e) {
    return buildDragContext({
      mosaicRootId: this.mosaic.root.id,
      activeNodeId: this.activeNode?.id ?? null,
      dropTargetId: this.hoverTarget?.id ?? null,
      pointer: {
        x: e.clientX,
        y: e.clientY
      },
      state: this.mosaic.getState(),
      hasSnapshot: Boolean(this.mosaic.snapshot)
    });
  }
  resolveHoverTarget(e) {
    if (!this.activeNode) return null;
    if (this.mosaic.getState() !== "dragging" /* Dragging */) return null;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!(el instanceof HTMLElement)) return null;
    const target = el.closest(this.mosaic.selectors.node);
    if (!(target instanceof HTMLElement)) return null;
    if (target === this.activeNode) return null;
    return target;
  }
  emitHoverEvent(type, target) {
    this.mosaic.root.dispatchEvent(
      new CustomEvent(type, {
        detail: {
          /* v8 ignore next -- @preserve | target guaranteed non-null by caller */
          targetId: target?.id ?? null
        }
      })
    );
  }
};
var RESULT_MAP = {
  allowed: {
    state: "mutated" /* Mutated */,
    hook: "onDropConfirmed",
    action: "confirm"
  },
  rejected: {
    state: "rollback" /* RollingBack */,
    hook: "onDropRejected",
    action: "reject"
  }
};

// src/events.ts
function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// src/css/contract.ts
var DEFAULT_CSS_CLASS_CONTRACT = Object.freeze({
  active: "mosaic--active",
  ghost: "mosaic--ghost",
  dropTarget: "mosaic--drop-target",
  dropAllowed: "mosaic--drop-allowed",
  dropRejected: "mosaic--drop-rejected"
});

// src/mosaic.ts
var Mosaic = class {
  constructor(options) {
    this.snapshot = null;
    this.state = "idle" /* Idle */;
    this.controller = null;
    this.root = options.root;
    this.selectors = options.selectors;
    this.cssClasses = Object.freeze({
      ...DEFAULT_CSS_CLASS_CONTRACT,
      ...options.cssClasses
    });
    this.dragLifecycleHooks = options.dragLifecycleHooks;
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
   * Emits `mosaic:mutation:confirmed`.
   */
  confirm() {
    this.snapshot = null;
    emit("mosaic:mutation:confirmed");
  }
  /**
   * Rejects the current mutation and restores the previous DOM state.
   *
   * If no snapshot exists, this method is a no-op.
   * Emits `mosaic:mutation:rejected` and `mosaic:rollback`.
   */
  reject() {
    if (!this.snapshot) return;
    restoreSnapshot(this.snapshot);
    emit("mosaic:mutation:rejected");
    emit("mosaic:rollback");
    this.snapshot = null;
  }
  /**
   * Tears down the Mosaic instance and removes all event listeners.
   *
   * After calling destroy(), the instance is inert and should be discarded.
   * Emits `mosaic:destroy`.
   */
  destroy() {
    if (this.controller) {
      this.root.removeEventListener("pointerdown", this.controller.pointerDown);
      window.removeEventListener("pointermove", this.controller.pointerMove);
      window.removeEventListener("pointerup", this.controller.pointerUp);
      this.controller.reset();
      this.controller = null;
    }
    emit("mosaic:destroy");
  }
  getState() {
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
   *
   * @returns `true` if the transition was applied, `false` otherwise
   *
   * Emits:
   * - `mosaic:state` on success
   * - `mosaic:error` on invalid transition
   */
  setState(next, meta) {
    const prev = this.state;
    if (prev === next) return false;
    if (!canTransition(prev, next)) {
      emit("mosaic:error", {
        type: "invalid-transition",
        from: prev,
        to: next
      });
      return false;
    }
    this.state = next;
    emit("mosaic:state", {
      from: prev,
      to: next,
      meta
    });
    return true;
  }
};
export {
  DEFAULT_CSS_CLASS_CONTRACT,
  DRAG_HOOK_STATES,
  MOSAIC_TRANSITIONS,
  Mosaic,
  MosaicState,
  buildDragContext,
  canTransition,
  checkConstraints,
  createSnapshot,
  emit,
  restoreSnapshot
};
/* v8 ignore next -- @preserve | defensive guard */
/* v8 ignore next -- @preserve | branch guarded by hoverTarget inequality */
/* v8 ignore next -- @preserve | defensive guard: pointerUp should never fire without an active drag */
/* v8 ignore next 4 -- @preserve | defensive guard: Dropping is guaranteed from Dragging by the state machine.
   This branch exists to protect against external misuse or future transition changes. */
/* v8 ignore next -- @preserve | defensive guard: resolveHoverTarget is never called without activeNode */
/* v8 ignore next -- @preserve | defensive guard: pointerMove guarantees Dragging */
