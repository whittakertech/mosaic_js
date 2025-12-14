import { describe, it, expect, beforeEach } from "vitest";
import { Ghost } from "../src/ghost";

describe("Ghost", () => {
  let node: HTMLElement;
  let ghost: Ghost;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="origin" class="item">Hello</div>
    `;
    node = document.getElementById("origin")!;
    ghost = new Ghost();
  });

  it("creates a ghost element cloned from the original node", () => {
    ghost.create(node, 100, 200);

    const g = document.querySelector(".mosaic--ghost") as HTMLElement;

    expect(g).not.toBeNull();
    expect(g.textContent).toBe("Hello"); // cloned properly
    expect(g.parentElement).toBe(document.body);
    expect(g.style.transform).toBe("translate(100px, 200px)");
  });

  it("moves the ghost by updating its transform", () => {
    ghost.create(node, 0, 0);

    ghost.move(50, 75);

    const g = document.querySelector(".mosaic--ghost") as HTMLElement;

    expect(g.style.transform).toBe("translate(50px, 75px)");
  });

  it("removes the ghost from the DOM", () => {
    ghost.create(node, 0, 0);

    ghost.remove();

    const g = document.querySelector(".mosaic--ghost");
    expect(g).toBeNull();
  });

  it("does not throw when remove() is called with no ghost present", () => {
    expect(() => ghost.remove()).not.toThrow();
  });

  it("clears internal reference after removal", () => {
    ghost.create(node, 0, 0);

    ghost.remove();

    // @ts-ignore private access for test only
    expect(ghost.ghost).toBeNull();
  });

  it("replaces an existing ghost when create() is called again", () => {
    ghost.create(node, 10, 20);
    const first = document.querySelector(".mosaic--ghost") as HTMLElement;

    ghost.create(node, 30, 40);
    const second = document.querySelector(".mosaic--ghost") as HTMLElement;

    expect(first).not.toBe(second);
    expect(second.style.transform).toBe("translate(30px, 40px)");
  });

  it("move() returns early when no ghost exists", () => {
    // no ghost created yet
    expect(() => ghost.move(50, 60)).not.toThrow();
  });
});