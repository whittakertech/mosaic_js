import { describe, it, expect, beforeEach, vi } from "vitest";
import { Mosaic } from "../src";

describe("Hover Target Events", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" id="a">A</div>
        <div class="item" id="b">B</div>
        <div class="item" id="c">C</div>
      </div>
    `;

    root = document.getElementById("root")!;
    mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
    });

    mosaic.initialize();
  });

  it("emits mosaic:hover:enter when a hover target is entered", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;

    const enterSpy = vi.fn();
    root.addEventListener("mosaic:hover:enter", enterSpy);

    // Start drag
    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Hover over B
    document.elementFromPoint = () => b;
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    expect(enterSpy).toHaveBeenCalledTimes(1);
    expect(enterSpy.mock.calls[0][0].detail).toEqual({
      targetId: "b",
      targetType: "node",
      depth: 0,
      sourceInstanceId: mosaic.mosaicInstanceId,
      targetInstanceId: mosaic.mosaicInstanceId,
      groupId: null,
    });
  });

  it("emits mosaic:hover:leave when leaving a hover target", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    const c = document.getElementById("c")!;

    const leaveSpy = vi.fn();
    root.addEventListener("mosaic:hover:leave", leaveSpy);

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Hover B
    document.elementFromPoint = () => b;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));

    // Move to C
    document.elementFromPoint = () => c;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 20 }));

    expect(leaveSpy).toHaveBeenCalledTimes(1);
    expect(leaveSpy.mock.calls[0][0].detail).toEqual({
      targetId: "b",
      targetType: "node",
      depth: 0,
      sourceInstanceId: mosaic.mosaicInstanceId,
      targetInstanceId: mosaic.mosaicInstanceId,
      groupId: null,
    });
  });

  it("emits leave before enter when hover target changes", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    const c = document.getElementById("c")!;

    const events: string[] = [];

    root.addEventListener("mosaic:hover:leave", () => events.push("leave"));
    root.addEventListener("mosaic:hover:enter", () => events.push("enter"));

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    document.elementFromPoint = () => b;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));

    document.elementFromPoint = () => c;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 20 }));

    expect(events).toEqual(["enter", "leave", "enter"]);
  });

  it("does not emit hover events for repeated moves over the same target", () => {
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;

    const enterSpy = vi.fn();
    const leaveSpy = vi.fn();

    root.addEventListener("mosaic:hover:enter", enterSpy);
    root.addEventListener("mosaic:hover:leave", leaveSpy);

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    document.elementFromPoint = () => b;

    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10 }));

    expect(enterSpy).toHaveBeenCalledTimes(1);
    expect(leaveSpy).not.toHaveBeenCalled();
  });
});
