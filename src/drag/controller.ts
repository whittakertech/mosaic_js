import { createSnapshot } from "../snapshot";
import { checkConstraints } from "../constraints";
import { MosaicState } from "../state";
import type { Mosaic } from "../mosaic";
import { Ghost } from "../ghost";
import { applyClasses, removeClasses } from "../css";
import type { DragLifecycleHooks } from "./lifecycle";
import { DRAG_HOOK_STATES } from "./lifecycle";
import type { DragContext } from "./context";

export class DragController {
  /** @internal */
  readonly mosaic: Mosaic;
  readonly hooks?: DragLifecycleHooks;
  private activeNode: HTMLElement | null = null;
  private ghost: Ghost;

  constructor(mosaic: Mosaic, hooks?: DragLifecycleHooks) {
    this.mosaic = mosaic;
    this.hooks = hooks;
    this.ghost = new Ghost();

    this.pointerDown = this.pointerDown.bind(this);
    this.pointerMove = this.pointerMove.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
  }

  pointerDown(e: PointerEvent) {
    const node = (e.target as HTMLElement)?.closest(this.mosaic.selectors.node);
    if (!(node instanceof HTMLElement)) return;

    this.activeNode = node;
    applyClasses(this.activeNode, this.mosaic.cssClasses.active);
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.mosaic.setState(MosaicState.PointerDown);

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

    this.mosaic.setState(MosaicState.Dragging);

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el) return;

    const target = el.closest(this.mosaic.selectors.node);
    if (!target || target === this.activeNode) return;

    const targetRect = target.getBoundingClientRect();
    const before = e.clientY < targetRect.top + targetRect.height / 2;

    this.ghost.move(e.clientX, e.clientY);
    this.invokeHook("onDragMove", this.createContext(e));

    const { root } = this.mosaic;

    if (before) {
      root.insertBefore(this.activeNode, target);
    } else {
      root.insertBefore(this.activeNode, target.nextSibling);
    }
  }

  pointerUp(e: PointerEvent) {
    /* v8 ignore next -- @preserve | defensive guard: pointerUp should never fire without an active drag */
    if (!this.activeNode) return;

    let t = e.target;
    if (!(t instanceof HTMLElement)) {
      t = this.activeNode;
    }

    let dropTarget: HTMLElement = this.activeNode;
    if (t instanceof HTMLElement && typeof t.closest === "function") {
      dropTarget = t.closest(this.mosaic.selectors.node) ?? this.activeNode;
    }

    const enteredDropping = this.mosaic.setState(MosaicState.Dropping);
    /* v8 ignore next 4 -- @preserve | defensive guard: Dropping is guaranteed from Dragging by the state machine.
       This branch exists to protect against external misuse or future transition changes. */
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

  processResult(allowed: boolean, e: PointerEvent): void {
    const result = allowed ? RESULT_MAP.allowed : RESULT_MAP.rejected;

    this.mosaic.setState(result.state);
    this.invokeHook(result.hook, this.createContext(e));
    this.mosaic[result.action]();
  }

  reset(e?: PointerEvent) {
    this.ghost.remove();
    if (this.activeNode) {
      removeClasses(this.activeNode, this.mosaic.cssClasses.active);
    }
    this.activeNode = null;
    this.mosaic.setState(MosaicState.Idle);

    if (e) this.invokeHook("onDragEnd", this.createContext(e));
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
    return {
      mosaicRootId: this.mosaic.root.id,
      activeNodeId: this.activeNode?.id ?? null,
      pointer: {
        x: e.clientX,
        y: e.clientY,
      },
      state: this.mosaic.getState(),
    };
  }
}

const RESULT_MAP = {
  allowed: {
    state: MosaicState.Mutated,
    hook: "onDropConfirmed",
    action: "confirm",
  },
  rejected: {
    state: MosaicState.RollingBack,
    hook: "onDropRejected",
    action: "reject",
  },
} as const;
