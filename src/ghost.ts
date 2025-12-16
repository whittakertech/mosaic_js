import type { CSSClassContract } from "./css";
import { applyClasses } from "./css";

export class Ghost {
  private ghost: HTMLElement | null = null;

  create(css: CSSClassContract, node: HTMLElement, x: number, y: number): void {
    if (!(node instanceof HTMLElement)) {
      throw new TypeError(
        "Ghost.create expected HTMLElement; received " + typeof node
      );
    }

    if (this.ghost) this.remove();

    const clone = node.cloneNode(true) as HTMLElement;

    applyClasses(clone, css.ghost);

    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.margin = "0";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "9999";
    clone.style.width = `${node.offsetWidth}px`;
    clone.style.height = `${node.offsetHeight}px`;

    document.body.appendChild(clone);

    this.ghost = clone;
    this.move(x, y);
  }

  move(x: number, y: number) {
    if (!this.ghost) return;
    this.ghost.style.transform = `translate(${x}px, ${y}px)`;
  }

  remove() {
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }
  }
}
