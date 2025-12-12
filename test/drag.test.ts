vi.mock("../src/constraints", () => ({
  checkConstraints: vi.fn()
}));

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkConstraints, Mosaic, MosaicState } from "../src";

describe("DragController", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" data-mosaic-id="a">A</div>
        <div class="item" data-mosaic-id="b">B</div>
      </div>
    `;
    root = document.getElementById('root')!;
    mosaic = new Mosaic({ root, selectors: { node: ".item" } });
    mosaic.initialize();
  });

  afterEach(() => {
    mosaic.destroy();
  })

  describe("#pointerDown", () => {
    it("activates a node and takes snapshot", () => {
      const a = root.querySelector('[data-mosaic-id="a"]')!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).not.toBeNull();
      expect((mosaic as any).state).toBe(MosaicState.PointerDown);
    });

    it("ignores events whose target is not a matching node", () => {
      const outside = document.createElement("div");
      root.appendChild(outside);

      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect((mosaic as any).state).toBe(MosaicState.Idle);
      expect(mosaic.snapshot).toBeNull();
    });
  });

  describe("#pointerMove", () => {
    it("reorders elements", () => {
      const a = root.children[0];
      const b = root.children[1];
      if (!document.elementFromPoint) {
        document.elementFromPoint = () => null;
      }

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      vi.spyOn(document, "elementFromPoint").mockReturnValue(b);

      window.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 5, clientY: 5, bubbles: true
      }));

      expect(root.children[0]).toBe(b);
      expect(root.children[1]).toBe(a);
    });

    it("enters before-branch (insertBefore)", () => {
      const a = root.children[0] as HTMLElement;
      const b = root.children[1] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Force elementFromPoint → B
      vi.spyOn(document, "elementFromPoint").mockReturnValue(b);

      // Force bounding box to guarantee the 'before' branch
      vi.spyOn(b, "getBoundingClientRect").mockReturnValue({
        top: 100,
        left: 0,
        width: 0,
        height: 100,
        bottom: 200,
        right: 0,
        x: 0,
        y: 100,
        toJSON() {},
      });

      window.dispatchEvent(
        new PointerEvent("pointermove", { clientY: 50, clientX: 0, bubbles: true })
      );

      expect(root.children[0]).toBe(a); // a moved before b
      expect(root.children[1]).toBe(b);
    });

    it("does nothing when elementFromPoint target does not match selector", () => {
      const a = root.children[0] as HTMLElement;

      // Start drag
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Mock a non-matching element for elementFromPoint
      const fake = document.createElement("div");
      vi.spyOn(document, "elementFromPoint").mockReturnValue(fake);

      // Capture original order
      const before = [...root.children];

      // Move pointer
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 10,
          clientY: 10,
          bubbles: true
        })
      );

      // Should remain unchanged
      expect([...root.children]).toEqual(before);
    });

    it("exits early when document.elementFromPoint returns null", () => {
      const a = root.children[0] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      vi.spyOn(document, "elementFromPoint").mockReturnValue(null);

      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));

      // The order must remain unchanged
      expect(root.children[0]).toBe(a);
    });

    it("returns early when no activeNode is set", () => {
      const before = [...root.children];

      // No pointerDown → activeNode = null
      window.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 10,
        clientY: 10,
        bubbles: true
      }));

      // No DOM changes occur
      expect([...root.children]).toEqual(before);
    });
  });

  describe("#pointerUp", () => {

    it("confirms when constraints allow", () => {
      const a = root.querySelector('[data-mosaic-id="a"]')!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      (checkConstraints as vi.Mock).mockReturnValue({ allowed: true });

      a.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect((mosaic as Mosaic).state).toBe(MosaicState.Dropping);
    });

    it("triggers rollback when constraints disallow drop", () => {
      const a = root.children[0] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      (checkConstraints as vi.Mock).mockReturnValue({ allowed: false });

      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect((mosaic as any).state).toBe(MosaicState.RollingBack);
    });

    it("falls back to activeNode when event.target is not an HTMLElement", () => {
      const a = root.children[0] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      (checkConstraints as vi.Mock).mockReturnValue({ allowed: true });

      const evt = new PointerEvent("pointerup", { bubbles: true });

      window.dispatchEvent(evt);

      expect((mosaic as Mosaic).state).toBe(MosaicState.Dropping);
    });

    it("does nothing if no activeNode is set", () => {
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect((mosaic as any).state).toBe(MosaicState.Idle);
    });

    it("falls back to activeNode when closest() returns null", () => {
      const a = root.children[0] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      (checkConstraints as vi.Mock).mockReturnValue({ allowed: true });

      // Fake HTMLElement with a closest() that returns null
      const fake = document.createElement("div");
      fake.closest = () => null;

      const evt = new PointerEvent("pointerup", { bubbles: true });
      Object.defineProperty(evt, "target", { value: fake });

      window.dispatchEvent(evt);

      expect((mosaic as any).state).toBe(MosaicState.Dropping);
    });

    it("falls back to activeNode when target.closest is not a function", () => {
      const a = root.children[0] as HTMLElement;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // mock constraints allow
      (checkConstraints as vi.Mock).mockReturnValue({ allowed: true });

      // Construct a fake element missing .closest
      const fake = document.createElement("div");
      // @ts-ignore
      fake.closest = undefined;

      const evt = new PointerEvent("pointerup", { bubbles: true });
      Object.defineProperty(evt, "target", { value: fake });

      window.dispatchEvent(evt);

      expect((mosaic as any).state).toBe(MosaicState.Dropping);
    });
  });
});
