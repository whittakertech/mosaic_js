import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mosaic, MosaicState } from '../src';
import type { DragContext } from '../src/drag';

vi.mock("../src/constraints", () => ({
  checkConstraints: vi.fn(() => ({ allowed: true }))
}));
describe("drag hooks", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" data-mosaic-id="a">A</div>
        <div class="item" data-mosaic-id="b">B</div>
      </div>`;
    root = document.getElementById("root")!;
  });

  it("invokes hooks in correct order for successful drop", () => {
    const calls: string[] = [];

    const mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
      dragLifecycleHooks: {
        onDragStart: () => calls.push("start"),
        onDragMove: () => calls.push("move"),
        onPreDrop: () => calls.push("predrop"),
        onDropConfirmed: () => calls.push("confirmed"),
        onDragEnd: () => calls.push("end"),
      }
    });

    mosaic.initialize();

    const a = root.children[0] as HTMLElement;

    if (!("elementFromPoint" in document)) {
      Object.defineProperty(document, "elementFromPoint", {
        value: () => null,
        writable: true,
      });
    }

    vi.spyOn(document, "elementFromPoint")
      .mockReturnValue(root.children[1] as HTMLElement);

    a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    expect(calls).toEqual([
      "start",
      "move",
      "predrop",
      "confirmed",
      "end",
    ]);
  });

  it("provides stable context values to hooks", () => {
    let ctx!: DragContext;

    const mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
      dragLifecycleHooks: {
        onDragStart(c) {
          ctx = c;
        }
      }
    });

    mosaic.initialize();

    const a = root.children[0] as HTMLElement;
    a.id = "item-a";

    a.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 20, bubbles: true })
    );

    expect(ctx.activeNodeId).toBe("item-a");
    expect(ctx.pointer).toEqual({ x: 10, y: 20 });
    expect(ctx.state).toBe(MosaicState.PointerDown);
  });

  it("does not throw when no hooks are provided", () => {
    const mosaic = new Mosaic({ root, selectors: { node: ".item" } });
    mosaic.initialize();

    const a = root.children[0] as HTMLElement;

    expect(() => {
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    }).not.toThrow();
  });
});
