import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic, MosaicState } from "../src";

const DROP_TARGET_CLASS = "mosaic--drop-target";

describe("Explicit drop targets (#11)", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;
  let a: HTMLElement;
  let b: HTMLElement;
  let zone: HTMLElement;

  function mount(selectors: { node: string; dropTarget?: string }) {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" id="a" data-mosaic-id="a">A</div>
        <div class="item" id="b" data-mosaic-id="b">B</div>
        <div class="zone" id="z">Z</div>
      </div>
    `;
    root = document.getElementById("root")!;
    a = document.getElementById("a")!;
    b = document.getElementById("b")!;
    zone = document.getElementById("z")!;
    mosaic = new Mosaic({ root, selectors });
    mosaic.initialize();
  }

  function move(target: Element) {
    document.elementFromPoint = () => target as Element;
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );
  }

  afterEach(() => {
    mosaic.destroy();
    vi.restoreAllMocks();
  });

  describe("with a dropTarget selector configured", () => {
    beforeEach(() => mount({ node: ".item", dropTarget: ".zone" }));

    it("emits hover:enter with targetType 'dropTarget' and applies the class", () => {
      const enterSpy = vi.fn();
      root.addEventListener("mosaic:hover:enter", enterSpy);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);

      expect(enterSpy).toHaveBeenCalledTimes(1);
      expect(enterSpy.mock.calls[0][0].detail).toEqual({
        targetId: "z",
        targetType: "dropTarget",
        depth: 0,
        sourceInstanceId: mosaic.mosaicInstanceId,
        targetInstanceId: mosaic.mosaicInstanceId,
        groupId: null,
      });
      expect(zone.classList.contains(DROP_TARGET_CLASS)).toBe(true);
    });

    it("removes the class and emits leave when moving off the drop target", () => {
      const events: Array<{ type: string; detail: any }> = [];
      root.addEventListener("mosaic:hover:enter", (e) =>
        events.push({ type: "enter", detail: (e as CustomEvent).detail })
      );
      root.addEventListener("mosaic:hover:leave", (e) =>
        events.push({ type: "leave", detail: (e as CustomEvent).detail })
      );

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);
      move(b);

      expect(zone.classList.contains(DROP_TARGET_CLASS)).toBe(false);
      const ids = {
        sourceInstanceId: mosaic.mosaicInstanceId,
        targetInstanceId: mosaic.mosaicInstanceId,
        groupId: null,
      };
      expect(events).toEqual([
        { type: "enter", detail: { targetId: "z", targetType: "dropTarget", depth: 0, ...ids } },
        { type: "leave", detail: { targetId: "z", targetType: "dropTarget", depth: 0, ...ids } },
        { type: "enter", detail: { targetId: "b", targetType: "node", depth: 0, ...ids } },
      ]);
    });

    it("clears the drop-target class on reset (pointerup)", () => {
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);
      expect(zone.classList.contains(DROP_TARGET_CLASS)).toBe(true);

      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(zone.classList.contains(DROP_TARGET_CLASS)).toBe(false);
      expect(mosaic.getState()).toBe(MosaicState.Idle);
    });

    it("accepts a drop onto the drop target (no rollback)", () => {
      const confirmed = vi.fn();
      const rejected = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);
      window.addEventListener("mosaic:mutation:rejected", rejected);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);

      const up = new PointerEvent("pointerup", { bubbles: true });
      Object.defineProperty(up, "target", { value: zone });
      window.dispatchEvent(up);

      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(rejected).not.toHaveBeenCalled();
      expect(mosaic.snapshot).toBeNull();
      expect(mosaic.getState()).toBe(MosaicState.Idle);
    });

    // Superseded by #12: reparenting into an explicit drop target was
    // deferred by #11's own PR to #12, which now implements it — hovering a
    // drop target live-reparents the dragged node into it (see
    // test/drag.nesting.test.ts). This test is kept, updated, to document
    // the change at the exact seam where it happens rather than deleting
    // the coverage of "what happens when hovering a drop target" outright.
    it("reparents the dragged node into the drop target on hover (#12)", () => {
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);

      expect([...root.children].map((n) => n.id)).toEqual(["b", "z"]);
      expect([...zone.children].map((n) => n.id)).toEqual(["a"]);
    });
  });

  describe("without a dropTarget selector (v0.2 backward compatibility)", () => {
    beforeEach(() => mount({ node: ".item" }));

    it("ignores drop-target elements entirely", () => {
      const enterSpy = vi.fn();
      root.addEventListener("mosaic:hover:enter", enterSpy);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(zone);

      expect(enterSpy).not.toHaveBeenCalled();
      expect(zone.classList.contains(DROP_TARGET_CLASS)).toBe(false);
      expect(mosaic.getState()).toBe(MosaicState.Dragging);
    });
  });
});
