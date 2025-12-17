import { DragController } from "./drag";
import { MosaicState, canTransition } from "./state";
import type { MosaicSnapshot } from "./snapshot";
import { restoreSnapshot } from "./snapshot";
import { emit } from "./events";
import type { CSSClassContract } from "./css";
import { DEFAULT_CSS_CLASS_CONTRACT } from "./css";
import type { DragLifecycleHooks } from "./drag";

export interface MosaicOptions {
  root: HTMLElement;
  selectors: {
    node: string;
    group?: string;
    children?: string;
    handle?: string;
  };
  cssClasses?: Partial<CSSClassContract>;
  dragLifecycleHooks?: DragLifecycleHooks;
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

  private state: MosaicState = MosaicState.Idle;
  private controller: DragController | null = null;
  private readonly dragLifecycleHooks?: DragLifecycleHooks;

  constructor(options: MosaicOptions) {
    this.root = options.root;
    this.selectors = options.selectors;
    this.cssClasses = {
      ...DEFAULT_CSS_CLASS_CONTRACT,
      ...options.cssClasses,
    };
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
   *
   * @returns `true` if the transition was applied, `false` otherwise
   *
   * Emits:
   * - `mosaic:state` on success
   * - `mosaic:error` on invalid transition
   */
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
