import { describe, it, expect, beforeEach } from "vitest";
import { Mosaic, MosaicState } from "../src";

describe("Hover Target Tracking", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" id="a" data-mosaic-id="a">A</div>
        <div class="item" id="b" data-mosaic-id="b">B</div>
        <div class="item" id="c" data-mosaic-id="c">C</div>
      </div>
    `;

    root = document.getElementById("root")!;
    mosaic = new Mosaic({
      root,
      selectors: { node: ".item" }
    });

    mosaic.initialize();
  });

  it("does not resolve hover before Dragging is entered", () => {
    const a = document.getElementById("a")!
    const b = document.getElementById("b")!

    document.elementFromPoint = () => b

    // pointerMove before pointerDown → not dragging
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 5, clientY: 5 })
    )

    expect(mosaic.getState()).toBe(MosaicState.Idle)
    expect([...root.children].map(n => n.id)).toEqual(["a", "b", "c"])
  });

  it("does not resolve hover when no active node exists", () => {
    const b = document.getElementById("b")!;

    // No pointerDown → activeNode is null
    document.elementFromPoint = () => b;

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 5, clientY: 5 })
    );

    // No state change, no reorder
    expect(mosaic.getState()).toBe(MosaicState.Idle);
    expect([...root.children].map(n => n.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores invalid hover targets and the active node itself", () => {
    const a = document.getElementById("a")!;
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    // Start drag on A
    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Hover over non-matching element
    document.elementFromPoint = () => outside;

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 5, clientY: 5 })
    );

    // Hover over itself
    document.elementFromPoint = () => a;

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 5, clientY: 5 })
    );

    // State should still be Dragging, no crash, no reorder
    expect(mosaic.getState()).toBe(MosaicState.Dragging);
    expect([...root.children].map(n => n.id)).toEqual(["a", "b", "c"]);
  });

  it("resolves the same hover target deterministically for the same pointer position", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    document.elementFromPoint = () => b;

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    const firstOrder = [...root.children].map(n => n.id);

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    const secondOrder = [...root.children].map(n => n.id);

    expect(firstOrder).toEqual(secondOrder);
  });

  it("does not emit redundant hover transitions for repeated moves over the same target", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    document.elementFromPoint = () => b;

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    const afterFirstMove = [...root.children].map(n => n.id);

    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    const afterSecondMove = [...root.children].map(n => n.id);

    expect(afterSecondMove).toEqual(afterFirstMove);
  });
});
