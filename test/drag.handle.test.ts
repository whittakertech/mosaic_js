import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Mosaic, MosaicState } from "../src";

describe("RM-14: drag handles (selectors.handle)", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("when selectors.handle is configured", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" data-mosaic-id="a">
            <span class="handle">grip</span>
            <span class="body">
              <span class="nested-child">deep</span>
            </span>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", handle: ".handle" },
      });
      mosaic.initialize();
    });

    it("initiates drag when pointerdown targets the handle", () => {
      const handle = root.querySelector(".handle")!;
      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).not.toBeNull();
      expect((mosaic as any).state).toBe(MosaicState.PointerDown);
    });

    it("does not initiate drag when pointerdown targets a non-handle area", () => {
      const body = root.querySelector(".body")!;
      body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).toBeNull();
      expect((mosaic as any).state).toBe(MosaicState.Idle);
    });

    it("resolves a handle nested at any depth within the node", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" data-mosaic-id="a">
            <span class="wrapper"><span class="handle">grip</span></span>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic.destroy();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", handle: ".handle" },
      });
      mosaic.initialize();

      root
        .querySelector(".handle")!
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).not.toBeNull();
    });

    it("clones the full node (not just the handle) into the ghost", () => {
      const handle = root.querySelector(".handle")!;
      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      const ghost = document.querySelector(".mosaic--ghost");
      expect(ghost).not.toBeNull();
      // The ghost is a clone of the full node — it must contain the
      // non-handle sibling content too, not just the handle element.
      expect(ghost?.querySelector(".body")).not.toBeNull();
    });

    it("applies the active CSS class to the node, not the handle", () => {
      const item = root.querySelector(".item") as HTMLElement;
      const handle = root.querySelector(".handle") as HTMLElement;

      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(item.classList.contains("mosaic--active")).toBe(true);
      expect(handle.classList.contains("mosaic--active")).toBe(false);
    });

    it("ignores a handle match that lands outside the resolved node", () => {
      document.body.innerHTML = `
        <div id="outer-root">
          <span class="handle" id="stray-handle">grip</span>
          <div class="item" data-mosaic-id="a">no handle here</div>
        </div>
      `;
      root = document.getElementById("outer-root")!;
      mosaic.destroy();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", handle: ".handle" },
      });
      mosaic.initialize();

      // pointerdown target is inside .item, but .item itself has no
      // descendant matching .handle — the stray sibling handle must not count.
      const item = root.querySelector(".item")!;
      item.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).toBeNull();
    });
  });

  describe("when selectors.handle is omitted", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" data-mosaic-id="a">
            <span class="body">anywhere</span>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();
    });

    it("initiates drag from anywhere within the node (backward compatible)", () => {
      const body = root.querySelector(".body")!;
      body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(mosaic.snapshot).not.toBeNull();
      expect((mosaic as any).state).toBe(MosaicState.PointerDown);
    });
  });
});
