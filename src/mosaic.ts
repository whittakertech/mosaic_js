import { DragController } from "./drag";
import { MosaicState, canTransition } from "./state";
import type { MosaicSnapshot } from "./snapshot";
import { restoreSnapshot } from "./snapshot";
import { emit } from "./events";

export interface MosaicOptions {
  root: HTMLElement;
  selectors: {
    node: string;
    group?: string;
    children?: string;
    handle?: string;
  };
}

export class Mosaic {
  public root: HTMLElement;
  public selectors: MosaicOptions["selectors"];
  private state: MosaicState = MosaicState.Idle;
  public snapshot: MosaicSnapshot | null = null;
  private controller: DragController | null = null;

  constructor(options: MosaicOptions) {
    this.root = options.root;
    this.selectors = options.selectors;
  }

  initialize() {
    this.controller = new DragController(this);

    this.root.addEventListener("pointerdown", this.controller.pointerDown);
    window.addEventListener("pointermove", this.controller.pointerMove);
    window.addEventListener("pointerup", this.controller.pointerUp);

    emit("mosaic:init");
  }

  confirm() {
    this.snapshot = null;
    emit("mosaic:mutation:confirmed");
  }

  reject() {
    if (!this.snapshot) return;

    restoreSnapshot(this.snapshot);
    emit("mosaic:mutation:rejected");
    emit("mosaic:rollback");

    this.snapshot = null;
  }

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

  public setState(next: MosaicState, meta?: unknown): boolean {
    const prev = this.state;

    if (prev === next) return false;

    if (!canTransition(prev, next)) {
      emit("mosaic:error", {
        type: "invalid-transition",
        from: prev,
        to: next,
      });
      return false;
    }

    this.state = next;

    emit("mosaic:state", {
      from: prev,
      to: next,
      meta,
    });

    return true;
  }
}
