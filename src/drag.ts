import { createSnapshot } from "./snapshot";
import { checkConstraints } from "./constraints";
import { MosaicState } from "./state";
import type { Mosaic } from "./mosaic";

export class DragController {
  private mosaic: Mosaic;
  private activeNode: HTMLElement | null = null;

  constructor(mosaic: Mosaic) {
    this.mosaic = mosaic;

    this.pointerDown = this.pointerDown.bind(this);
    this.pointerMove = this.pointerMove.bind(this);
    this.pointerUp = this.pointerUp.bind(this);
  }

  pointerDown(e: PointerEvent) {
    const node = (e.target as HTMLElement)?.closest(this.mosaic.selectors.node);
    if (!node) return;

    this.activeNode = node;
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.mosaic.setState(MosaicState.PointerDown);
  }

  pointerMove(e: PointerEvent) {
    if (!this.activeNode) return; // 28

    this.mosaic.setState(MosaicState.Dragging);

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!el) return;

    const target = el.closest(this.mosaic.selectors.node);
    if (!target || target === this.activeNode) return;

    const targetRect = target.getBoundingClientRect();
    const before = e.clientY < targetRect.top + targetRect.height / 2;

    const { root } = this.mosaic;

    if (before) {
      root.insertBefore(this.activeNode, target);
    } else {
      root.insertBefore(this.activeNode, target.nextSibling);
    }
  }

  pointerUp(e: PointerEvent) {
    if (!this.activeNode) return;

    let t = e.target;
    if (!(t instanceof HTMLElement)) {
      t = this.activeNode;
    }

    let dropTarget: HTMLElement = this.activeNode;
    if (t instanceof HTMLElement && typeof t.closest === "function") { //59
      dropTarget = t.closest(this.mosaic.selectors.node) ?? this.activeNode;
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
      this.mosaic.setState(MosaicState.Dropping);
      this.mosaic.confirm();
    }

    this.reset();
  }

  reset() {
    this.activeNode = null;
  }
}
