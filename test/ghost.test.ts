import { describe, it, expect, beforeEach, vi } from "vitest";
import { Ghost } from "../src/ghost";
import { DEFAULT_CSS_CLASS_CONTRACT } from "../src/css";

describe("Ghost (offset aligned)", () => {
  let node: HTMLElement;
  let ghost: Ghost;

  // starting pointer coords (will be updated per test)
  let startX = 0;
  let startY = 0;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="origin" class="item">Hello</div>
    `;

    node = document.getElementById("origin")!;

    // Predictable geometry
    vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
      left: 40,
      top: 60,
      width: 120,
      height: 40,
      right: 160,
      bottom: 100,
      x: 40,
      y: 60,
      toJSON: () => {}
    });

    ghost = new Ghost();
  });

  /**
   * Helper asserting the ghost is always aligned such that:
   * ghostX + offsetX = pointerX
   * ghostY + offsetY = pointerY
   */
  function expectGhostPosition(pointerX: number, pointerY: number) {
    const g = document.querySelector(".mosaic--ghost") as HTMLElement;
    expect(g).not.toBeNull();

    const rect = node.getBoundingClientRect();

    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    const expectedX = pointerX - offsetX;
    const expectedY = pointerY - offsetY;

    expect(g.style.transform)
      .toBe(`translate3d(${expectedX}px, ${expectedY}px, 0)`);
  }

  it("creates a ghost aligned to pointer grab offset", () => {
    startX = 100;
    startY = 200;

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, startX, startY);

    expectGhostPosition(startX, startY);
  });

  it("moves ghost maintaining pointer alignment", () => {
    startX = 100;
    startY = 200;

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, startX, startY);

    ghost.move(200, 300);

    expectGhostPosition(200, 300);
  });

  it("removes the ghost", () => {
    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, 0, 0);

    ghost.remove();

    expect(document.querySelector(".mosaic--ghost")).toBeNull();
  });

  it("is safe to remove when no ghost exists", () => {
    expect(() => ghost.remove()).not.toThrow();
  });

  it("replaces old ghost on new create and maintains correct alignment", () => {
    startX = 10;
    startY = 20;

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, startX, startY);
    const first = document.querySelector(".mosaic--ghost") as HTMLElement;

    startX = 200;
    startY = 300;

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, startX, startY);
    const second = document.querySelector(".mosaic--ghost") as HTMLElement;

    expect(first).not.toBe(second);

    expectGhostPosition(200, 300);
  });

  it("move() does nothing safely if no ghost exists", () => {
    expect(() => ghost.move(50, 60)).not.toThrow();
  });

  it("applies multiple space-separated ghost css classes", () => {
    const css = {
      ...DEFAULT_CSS_CLASS_CONTRACT,
      ghost: "ghost-base ghost-shadow ghost-pointer"
    };

    ghost.create(css, node, 0, 0);

    const g = document.querySelector(".ghost-base") as HTMLElement;

    expect(g).toBeTruthy();
    expect(g.classList.contains("ghost-shadow")).toBe(true);
    expect(g.classList.contains("ghost-pointer")).toBe(true);
  });

  it("throws when given a non HTMLElement", () => {
    expect(() =>
      ghost.create(DEFAULT_CSS_CLASS_CONTRACT, 42 as any, 0, 0)
    ).toThrowError(TypeError);

    expect(() =>
      ghost.create(DEFAULT_CSS_CLASS_CONTRACT, 42 as any, 0, 0)
    ).toThrowError(
      "Ghost.create expected HTMLElement; received number"
    );

    expect(document.querySelector(".mosaic--ghost")).toBeNull();
  });

  it("applies the translated transform inside the animation frame", () => {
    vi.useFakeTimers();

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, 100, 200);

    ghost.move(200, 300);

    vi.runOnlyPendingTimers();

    const g = document.querySelector(".mosaic--ghost") as HTMLElement;
    expect(g).not.toBeNull();

    //
    // New math:
    //
    const rectLeft = 40;
    const rectTop  = 60;

    const grabX = 100;
    const grabY = 200;

    const moveX = 200;
    const moveY = 300;

    const offsetX = grabX - rectLeft; // 60
    const offsetY = grabY - rectTop;  // 140

    const expectedX = moveX - offsetX; // 140
    const expectedY = moveY - offsetY; // 160

    expect(g.style.transform)
      .toBe(`translate3d(${expectedX}px, ${expectedY}px, 0)`);

    vi.useRealTimers();
  });

  it("covers RAF null-ghost bailout branch (forced)", () => {
    vi.useFakeTimers();

    // sabotage cancelAnimationFrame so RAF still executes
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    ghost.create(DEFAULT_CSS_CLASS_CONTRACT, node, 100, 200);

    ghost.move(200, 300);

    // remove ghost but RAF is NOT canceled now
    ghost.remove();

    expect(() => {
      vi.runOnlyPendingTimers();   // RAF now executes and hits: if (!ghost) return;
    }).not.toThrow();

    vi.useRealTimers();
  });
});
