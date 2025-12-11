export class DragController {
  private mosaic: Mosaic;
  private activeNode: HTMLElement | null = null;

  constructor(mosaic: Mosaic) {
    this.mosaic = mosaic;
  }

  pointerDown(e: PointerEvent) {
    const node = e.target.closet(this.mosaic.selectors.node);
    if (!node) return;

    this.activeNode = node;
    this.mosaic.snapshot = createSnapshot(this.mosaic.root);
    this.mosaic.setState(MosaicState.PointerDown);
  }

  pointerMove(_e: PointerEvent) {
    if (!this.activeNode) return;

    this.mosaic.setState(MosaicState.Dragging);

    // hover -> Find potential drop target
  }

  pointerUp(e: PointerEvent) {
    if (!this.activeNode) return;

    const target = e.target as HTMLElement;
    const result = checkConstraints(
      this.activeNode,
      target,
      this.mosaic.options
    );
    if (!result.allowed) {
      this.mosaic.setState(MosaicState.RollingBack);
      this.mosaic.reject();
      this.activeNode = null;
      return;
    }

    this.mosaic.setState(MosaicState.Dropping);
    // commit mutation
    this.mosaic.confirm();

    this.activeNode = null;
  }
}
