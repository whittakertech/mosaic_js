import { MosaicState } from "./state";
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
  private root: HTMLElement;
  private selectors: MosaicOptions["selectors"];
  private state: MosaicState;
  private snapshot: MosaicSnapshot | null = null;

  constructor(options: MosaicOptions) {
    this.root = options.root;
    this.selectors = options.selectors;
    this.state = MosaicState.Idle;
  }

  initialize() {
    this.bind();
    emit("mosaic:init");
  }

  confirm() {
    this.snapshot = null;
    emit("mosaic:mutation:confirmed");
  }

  reject() {
    if (this.snapshot == null) return;

    restoreSnapshot(this.snapshot);
    emit("mosaic:mutation:rejected");
    emit("mosaic:rollback");

    this.snapshot = null;
  }

  destroy() {
    emit("mosaic:destroy");
  }

  private bind() {
    // pointerdown, pointermove, pointerup hooks go here
  }

  private setState(s: MosaicState) {
    this.state = s;
    emit("mosaic:state", { state: s });
  }
}
