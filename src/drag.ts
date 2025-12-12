import { createSnapshot } from "./snapshot";
import { checkConstraints } from "./constraints";
import { MosaicState } from "./state";
import type { Mosaic } from "./mosaic";
import { Ghost } from "./ghost";

export class DragController {
  private mosaic: Mosaic;
  private activeNode: HTMLElement | null = null;
  private ghost: Ghost;

  constructor(mosaic: Mosaic) {
    this.mosaic = mosaic;
    this.ghost = new Ghost();

    this.pointerDown = this.pointerDown.bind(this);
    this.pointerMove = this.pointerMove.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
  }

  pointerDown(e: PointerEvent) {
    const node = (e.target as HTMLElement)?.closest(this.mosaic.selectors.node);
    if (!(node instanceof HTMLElement)) return;

    this.activeNode = node;
    this.activeNode.classList.add("mosaic--dragging");
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.mosaic.setState(MosaicState.PointerDown);
    this.ghost.create(this.activeNode, e.clientX, e.clientY);
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
      this.reset();
      return;
    }

    const result = checkConstraints(
      this.activeNode,
      dropTarget,
      this.mosaic.selectors
    );

    if (!result.allowed) {
      this.mosaic.setState(MosaicState.RollingBack);
      this.mosaic.reject();
    } else {
      this.mosaic.setState(MosaicState.Mutated);
      this.mosaic.confirm();
    }

    this.reset();
  }

  reset() {
    this.ghost.remove();
    if (this.activeNode) {
      this.activeNode.classList.remove("mosaic--dragging");
    }
    this.activeNode = null;
  }
}
