import type { CSSClassContract } from "./css";
import { applyClasses } from "./css/apply";

export class Ghost {
  private ghost: HTMLElement | null = null;

  private offsetX = 0;
  private offsetY = 0;

  /** RAF handle so we can cancel pending frames */
  private frame: number | null = null;

  /** continuous RAF loop state */
  private running = false;
  private latestX = 0;
  private latestY = 0;

  create(css: CSSClassContract, node: HTMLElement, x: number, y: number): void {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError(
        "Ghost.create expected HTMLElement; received " + typeof node
      );
    }

    this.remove(); // also clears RAF safely

    const rect = node.getBoundingClientRect();
    this.offsetX = x - rect.left;
    this.offsetY = y - rect.top;

    const clone = node.cloneNode(true) as HTMLElement;
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

  move(x: number, y: number) {
    if (!this.ghost) return;

    this.latestX = x;
    this.latestY = y;

    const tx = `${x - this.offsetX}px`;
    const ty = `${y - this.offsetY}px`;

    //
    // 1️⃣ Immediate transform so tests + jsdom see correct values synchronously
    //
    this.ghost.style.transform = `translate3d(${tx}, ${ty}, 0)`;

    //
    // 2️⃣ Continuous RAF loop for real browsers — buttery smooth
    //
    if (this.running) return;
    this.running = true;

    const loop = () => {
      /* v8 ignore next -- @preserve | defensive guard */
      if (!this.ghost) {
        this.running = false;
        return;
      }

      const tx = `${this.latestX - this.offsetX}px`;
      const ty = `${this.latestY - this.offsetY}px`;

      this.ghost.style.transform = `translate3d(${tx}, ${ty}, 0)`;

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
}
