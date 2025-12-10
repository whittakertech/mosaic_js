import { MosaicState } from "./state";
import { createSnapshot, restoreSnapshot } from "./snapshot";
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
  private state: MosaicState;
  private snapshot: MosaicState | null = null;

  constructor(options: MosaicOptions) {
    this.root = options.root;
    this.state = MosaicState.Idle;

    this.bind();
  }

  private bind() {
    // pointerdown, pointermove, pointerup hooks go here
  }

  confirm() {
    this.snapshot = null;
    emit("mosaic:mutation:confirmed");
  }

  reject() {
    if (this.snapshot) {
      restoreSnapshot(this.snapshot);
      emit("mosaic:mutation:rejected");
      emit("mosaic:rollback");
    }
  }
}
