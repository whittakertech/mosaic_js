import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic } from "../src";

function setupTwoGroups() {
  document.body.innerHTML = `
    <div id="root">
      <div class="group" id="g1">
        <div class="item" id="a" data-mosaic-id="a">A</div>
        <div class="item" id="b" data-mosaic-id="b">B</div>
      </div>
      <div class="group" id="g2">
        <div class="item" id="c" data-mosaic-id="c">C</div>
      </div>
    </div>
  `;
  return document.getElementById("root")!;
}

function moveOver(target: Element, before: boolean) {
  document.elementFromPoint = () => target;
  const rect = {
    top: before ? 0 : 0,
    left: 0,
    width: 0,
    height: 100,
    bottom: 100,
    right: 0,
    x: 0,
    y: 0,
    toJSON() {},
  };
  // Force the "before" branch via clientY relative to the mocked rect.
  const clientY = before ? -1 : 1000;
  (target as HTMLElement).getBoundingClientRect = () => rect as DOMRect;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY, bubbles: true })
  );
}

describe("RM-13: group containers", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("group scoping (default, crossGroupDrag disabled)", () => {
    beforeEach(() => {
      root = setupTwoGroups();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();
    });

    it("reorders nodes among siblings within the same group", () => {
      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const g1 = document.getElementById("g1")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b, true);

      expect([...g1.children].map((n) => n.id)).toEqual(["a", "b"]);
    });

    it("does not reorder across groups when cross-group dragging is disabled", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g2 = document.getElementById("g2")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);

      // a must NOT have moved into g2
      expect([...g2.children].map((n) => n.id)).toEqual(["c"]);
    });

    it("rejects a cross-group drop at pointerUp with reason group-boundary and rolls back", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g1 = document.getElementById("g1")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // A pointermove is required to reach the Dragging state before
      // Dropping can be entered (the state machine rejects Dropping
      // directly from PointerDown) — hover over nothing in particular.
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 0,
          clientY: 0,
          bubbles: true,
        })
      );

      // pointerUp resolves via e.target, not elementFromPoint — dispatch
      // from `c` directly so it bubbles with e.target === c.
      c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      // Rejected drop rolls back — a stays in g1 at its original position.
      expect([...g1.children].map((n) => n.id)).toEqual(["a", "b"]);
      expect(rollback).toHaveBeenCalled();
    });

    it("applies mosaic--group-active to the active node's group container", () => {
      const a = document.getElementById("a")!;
      const g1 = document.getElementById("g1")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(g1.classList.contains("mosaic--group-active")).toBe(true);
    });

    it("removes mosaic--group-active on reset", () => {
      const a = document.getElementById("a")!;
      const g1 = document.getElementById("g1")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => a;
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(g1.classList.contains("mosaic--group-active")).toBe(false);
    });

    it("includes groupId on mosaic:state payloads when groups are configured", () => {
      const a = document.getElementById("a")!;
      let payload: any;
      window.addEventListener("mosaic:state", (e) => {
        payload = (e as CustomEvent).detail;
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(payload.groupId).toBe("g1");
    });

    it("multiple independent groups do not interfere with each other", () => {
      const b = document.getElementById("b")!;
      const a = document.getElementById("a")!;
      const g1 = document.getElementById("g1")!;
      const g2 = document.getElementById("g2")!;

      // Live reordering happens during pointerMove, not pointerUp.
      b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(a, true);

      expect([...g1.children].map((n) => n.id)).toEqual(["b", "a"]);
      expect([...g2.children].map((n) => n.id)).toEqual(["c"]);
    });
  });

  describe("cross-group dragging enabled", () => {
    beforeEach(() => {
      root = setupTwoGroups();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        crossGroupDrag: true,
      });
      mosaic.initialize();
    });

    it("moves a node into the target group and position when enabled", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g2 = document.getElementById("g2")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);

      expect([...g2.children].map((n) => n.id)).toEqual(["a", "c"]);
    });

    it("confirms a cross-group drop at pointerUp (no rollback)", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g2 = document.getElementById("g2")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);
      c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      // Drop confirmed, not rolled back — a stays in g2 where the live
      // cross-group reorder already placed it.
      expect([...g2.children].map((n) => n.id)).toEqual(["a", "c"]);
    });

    it("emits mosaic:group:enter when the drag crosses into a different group", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const events: string[] = [];
      root.addEventListener("mosaic:group:enter", (e) => {
        events.push((e as CustomEvent).detail.groupId);
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);

      expect(events).toEqual(["g2"]);
    });

    it("emits mosaic:group:leave when the drag exits the entered group", () => {
      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const c = document.getElementById("c")!;
      const leaveEvents: string[] = [];
      root.addEventListener("mosaic:group:leave", (e) => {
        leaveEvents.push((e as CustomEvent).detail.groupId);
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);
      moveOver(b, true);

      expect(leaveEvents).toEqual(["g2"]);
    });

    it("applies mosaic--group-hover to a group entered during cross-group drag", () => {
      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g2 = document.getElementById("g2")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c, true);

      expect(g2.classList.contains("mosaic--group-hover")).toBe(true);
    });

    it("rolls back to the original group on rejected constraints even in cross-group mode", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="group" id="g1">
            <div class="item" id="a" data-mosaic-id="a">A</div>
          </div>
          <div class="group" id="g2">
            <div class="not-item" id="x">not a node or drop target</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic.destroy();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        crossGroupDrag: true,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const g1 = document.getElementById("g1")!;
      const x = document.getElementById("x")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 0,
          clientY: 0,
          bubbles: true,
        })
      );
      x.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      // x matches neither selectors.node nor selectors.dropTarget →
      // invalid-target rejection, independent of group logic — rollback
      // still returns `a` to its original group.
      expect([...g1.children].map((n) => n.id)).toEqual(["a"]);
    });
  });

  describe("ungrouped Mosaic instances (backward compatibility)", () => {
    it("is entirely unaffected when selectors.group is not configured", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="item" id="b" data-mosaic-id="b">B</div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      let payload: any;
      window.addEventListener("mosaic:state", (e) => {
        payload = (e as CustomEvent).detail;
      });

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // groupId is null (never omitted, since Mosaic.setState defaults it) —
      // ungrouped Mosaics simply never see a truthy value. The ungrouped
      // DragController call path itself stays a single-argument setState()
      // call (setMosaicState's early-return branch), matching v0.2 behavior.
      expect(payload.groupId).toBeNull();
    });

    it("resolves group as null for a node not inside any group container", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="loner" data-mosaic-id="loner">not in a group</div>
          <div class="group" id="g1">
            <div class="item" id="a" data-mosaic-id="a">A</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();

      let payload: any;
      window.addEventListener("mosaic:state", (e) => {
        payload = (e as CustomEvent).detail;
      });

      document
        .getElementById("loner")!
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(payload.groupId).toBeNull();
    });
  });
});
