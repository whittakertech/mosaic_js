import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Mosaic } from "../src";
import type { DragContext } from "../src";

function setupSingleGroup() {
  document.body.innerHTML = `
    <div id="root">
      <div class="group" id="g1">
        <div class="item" id="a" data-mosaic-id="a">A</div>
        <div class="item" id="b" data-mosaic-id="b">B</div>
      </div>
    </div>
  `;
  return document.getElementById("root")!;
}

function setupUngrouped() {
  document.body.innerHTML = `
    <div id="root">
      <div class="item" id="a" data-mosaic-id="a">A</div>
      <div class="item" id="b" data-mosaic-id="b">B</div>
    </div>
  `;
  return document.getElementById("root")!;
}

describe("RM-18: DragContext stabilization for multi-actor environments", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("mosaicInstanceId", () => {
    it("is a non-empty string assigned at construction time", () => {
      root = setupUngrouped();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });

      expect(typeof mosaic.mosaicInstanceId).toBe("string");
      expect(mosaic.mosaicInstanceId.length).toBeGreaterThan(0);
    });

    it("is distinct across two Mosaic instances on the same page (AC4/AC8)", () => {
      document.body.innerHTML = `
        <div id="root1"><div class="item" id="a1" data-mosaic-id="a1">A1</div></div>
        <div id="root2"><div class="item" id="a2" data-mosaic-id="a2">A2</div></div>
      `;
      const root1 = document.getElementById("root1")!;
      const root2 = document.getElementById("root2")!;

      const m1 = new Mosaic({ root: root1, selectors: { node: ".item" } });
      const m2 = new Mosaic({ root: root2, selectors: { node: ".item" } });

      expect(m1.mosaicInstanceId).not.toBe(m2.mosaicInstanceId);

      m1.destroy();
      m2.destroy();
    });

    it("is distinct even when both instances share the same DOM root id (mosaicRootId collision)", () => {
      document.body.innerHTML = `
        <div id="dup"><div class="item" id="x" data-mosaic-id="x">X</div></div>
      `;
      const root1 = document.getElementById("dup")!;
      // A second, detached root sharing the same id — mosaicRootId is not
      // guaranteed unique; mosaicInstanceId is the field that is.
      const root2 = document.createElement("div");
      root2.id = "dup";

      const m1 = new Mosaic({ root: root1, selectors: { node: ".item" } });
      const m2 = new Mosaic({ root: root2, selectors: { node: ".item" } });

      expect(m1.root.id).toBe(m2.root.id);
      expect(m1.mosaicInstanceId).not.toBe(m2.mosaicInstanceId);

      m1.destroy();
      m2.destroy();
    });
  });

  describe("DragContext hook payload", () => {
    it("passes mosaicInstanceId and groupId (null, ungrouped) through to hooks (AC1/AC2/AC6/AC7)", () => {
      root = setupUngrouped();
      let ctx: DragContext | undefined;

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        dragLifecycleHooks: {
          onDragStart: (c) => {
            ctx = c;
          },
        },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(ctx).toBeDefined();
      expect(ctx!.mosaicInstanceId).toBe(mosaic.mosaicInstanceId);
      expect(ctx!.groupId).toBeNull();

      // Pre-existing fields untouched (AC6).
      expect(ctx!.mosaicRootId).toBe("root");
      expect(ctx!.activeNodeId).toBe("a");
      expect(ctx!.hasSnapshot).toBe(true);
    });

    it("passes the active node's real groupId through to hooks, matching mosaic:state's value exactly (AC2/AC10)", () => {
      root = setupSingleGroup();

      let ctx: DragContext | undefined;
      let statePayload: any;
      window.addEventListener("mosaic:state", (e) => {
        statePayload = (e as CustomEvent).detail;
      });

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        dragLifecycleHooks: {
          onDragStart: (c) => {
            ctx = c;
          },
        },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(ctx!.groupId).toBe("g1");
      // No drift between the mosaic:state call site and createContext().
      expect(ctx!.groupId).toBe(statePayload.groupId);
    });

    it("is frozen and JSON-serializable with the new fields intact (AC3/AC9)", () => {
      root = setupSingleGroup();
      let ctx: DragContext | undefined;

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        dragLifecycleHooks: {
          onDragStart: (c) => {
            ctx = c;
          },
        },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(Object.isFrozen(ctx)).toBe(true);
      expect(() => {
        // @ts-expect-error intentional mutation attempt against readonly field
        ctx!.mosaicInstanceId = "tampered";
      }).toThrow();

      const roundTripped = JSON.parse(JSON.stringify(ctx));
      expect(roundTripped.mosaicInstanceId).toBe(mosaic.mosaicInstanceId);
      expect(roundTripped.groupId).toBe("g1");
    });

    it("allows hooks to filter by mosaicInstanceId across two live instances (AC5)", () => {
      document.body.innerHTML = `
        <div id="root1"><div class="item" id="a1" data-mosaic-id="a1">A1</div></div>
        <div id="root2"><div class="item" id="a2" data-mosaic-id="a2">A2</div></div>
      `;
      const root1 = document.getElementById("root1")!;
      const root2 = document.getElementById("root2")!;

      const seenFromInstance1: DragContext[] = [];

      const m1 = new Mosaic({
        root: root1,
        selectors: { node: ".item" },
        dragLifecycleHooks: {
          onDragStart: (c) => {
            if (c.mosaicInstanceId === m1.mosaicInstanceId) {
              seenFromInstance1.push(c);
            }
          },
        },
      });
      const m2 = new Mosaic({
        root: root2,
        selectors: { node: ".item" },
        dragLifecycleHooks: {
          onDragStart: (c) => {
            // A hook that only cares about m1 would filter here; assert
            // m2's own context never claims m1's identity.
            expect(c.mosaicInstanceId).not.toBe(m1.mosaicInstanceId);
          },
        },
      });
      m1.initialize();
      m2.initialize();

      document.getElementById("a1")!.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      document.getElementById("a2")!.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );

      expect(seenFromInstance1).toHaveLength(1);
      expect(seenFromInstance1[0].mosaicInstanceId).toBe(m1.mosaicInstanceId);

      m1.destroy();
      m2.destroy();
    });
  });
});
