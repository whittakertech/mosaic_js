import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic } from "../src";

function move(target: Element) {
  document.elementFromPoint = () => target;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true })
  );
}

/** Like `move()`, but forces the "insert before" branch via a mocked rect. */
function moveBefore(target: HTMLElement) {
  document.elementFromPoint = () => target;
  target.getBoundingClientRect = () =>
    ({
      top: 100,
      left: 0,
      width: 0,
      height: 100,
      bottom: 200,
      right: 0,
      x: 0,
      y: 100,
      toJSON() {},
    }) as DOMRect;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY: 50, bubbles: true })
  );
}

describe("RM-12: nested drop targets", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("basic nesting (single level)", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="outer-zone">
            <div class="item" id="nested" data-mosaic-id="nested">nested</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone" },
      });
      mosaic.initialize();
    });

    it("reparents a node into a drop target that already has children", () => {
      const a = document.getElementById("a")!;
      const outerZone = document.getElementById("outer-zone")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(outerZone);

      expect([...root.children].map((n) => n.id)).toEqual(["outer-zone"]);
      expect([...outerZone.children].map((n) => n.id)).toEqual(["nested", "a"]);
    });

    it("reorders among a nested drop target's own children once inside it", () => {
      const a = document.getElementById("a")!;
      const nested = document.getElementById("nested")!;
      const outerZone = document.getElementById("outer-zone")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(outerZone);
      // Now `a` lives inside outerZone alongside `nested` (order: nested, a)
      // — hover `nested` itself, forcing the "before" branch, to reorder
      // within the drop target's own children.
      moveBefore(nested);

      expect([...outerZone.children].map((n) => n.id)).toEqual(["a", "nested"]);
    });

    it("populates depth/ancestors for a node already inside a drop target", () => {
      const a = document.getElementById("a")!;
      const nested = document.getElementById("nested")!;
      let payload: any;
      root.addEventListener("mosaic:hover:enter", (e) => {
        payload = (e as CustomEvent).detail;
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(nested);

      expect(payload).toEqual({
        targetId: "nested",
        targetType: "node",
        depth: 1,
        sourceInstanceId: mosaic.mosaicInstanceId,
        targetInstanceId: mosaic.mosaicInstanceId,
        groupId: null,
      });
    });

    it("confirms a drop directly onto the drop target at pointerUp", () => {
      const a = document.getElementById("a")!;
      const outerZone = document.getElementById("outer-zone")!;
      const confirmed = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(outerZone);
      outerZone.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(confirmed).toHaveBeenCalledTimes(1);
      expect([...outerZone.children].map((n) => n.id)).toEqual(["nested", "a"]);
    });
  });

  describe("without selectors.dropTarget (backward compatibility)", () => {
    it("never reparents beyond root, even for structurally nested nodes", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="x" data-mosaic-id="x">X</div>
          <div class="item" id="outer" data-mosaic-id="outer">
            <div class="item" id="inner" data-mosaic-id="inner">inner</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      const outer = document.getElementById("outer")!;
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      document.getElementById("x")!.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      move(document.getElementById("inner")!);

      // No selectors.dropTarget configured at all — #12 nesting is opt-in
      // and inactive, so the v0.2/#11 root-only reorder invariant holds.
      expect([...root.children].map((n) => n.id)).toEqual(["x", "outer"]);
      expect([...outer.children].map((n) => n.id)).toEqual(["inner"]);
    });
  });

  describe("circular nesting guard", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="zone" id="a" data-mosaic-id="a">
            <div class="zone" id="child-zone" data-mosaic-id="child-zone">child zone</div>
          </div>
          <div class="item" id="plain" data-mosaic-id="plain">plain</div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".zone, .item", dropTarget: ".zone" },
      });
      mosaic.initialize();
    });

    it("does not live-reparent a drop target into its own descendant", () => {
      const a = document.getElementById("a")!;
      const childZone = document.getElementById("child-zone")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(childZone);

      // `a` must NOT have been appended into its own child.
      expect(a.contains(childZone)).toBe(true);
      expect(childZone.contains(a)).toBe(false);
      expect([...root.children].map((n) => n.id)).toEqual(["a", "plain"]);
    });

    it("rejects a circular drop at pointerUp with reason circular-nesting and rolls back", () => {
      const a = document.getElementById("a")!;
      const childZone = document.getElementById("child-zone")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // A pointermove is required to reach Dragging before Dropping.
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      childZone.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
      expect([...root.children].map((n) => n.id)).toEqual(["a", "plain"]);
    });

    it("does not bubble a circular-nesting rejection into the dragged element's own ancestor slot", () => {
      // bubbleConstraints must not "rescue" a circular drop just because the
      // dragged element itself happens to sit in its own target's ancestor
      // chain — resolveTarget() correctly refuses to resolve the dragged
      // element against itself (returns null), so that ancestor is skipped
      // rather than accidentally treated as a valid bubble destination.
      mosaic.destroy();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".zone, .item", dropTarget: ".zone" },
        bubbleConstraints: true,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const childZone = document.getElementById("child-zone")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      childZone.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
      expect([...root.children].map((n) => n.id)).toEqual(["a", "plain"]);
    });
  });

  describe("max nesting depth", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="z1">
            <div class="zone" id="z2">deep zone</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone" },
        maxNestingDepth: 0,
      });
      mosaic.initialize();
    });

    it("blocks the live reorder preview beyond the configured max depth", () => {
      const a = document.getElementById("a")!;
      const z2 = document.getElementById("z2")!;
      const z1 = document.getElementById("z1")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(z2);

      // z2 is depth 1 (nested inside z1) — exceeds maxNestingDepth: 0.
      expect(z1.contains(a)).toBe(false);
      expect([...root.children].map((n) => n.id)).toEqual(["a", "z1"]);
    });

    it("rejects a depth-exceeding drop at pointerUp with reason nesting-depth-exceeded", () => {
      const a = document.getElementById("a")!;
      const z2 = document.getElementById("z2")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      z2.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
    });

    it("allows a drop at or within the configured max depth", () => {
      const a = document.getElementById("a")!;
      const z1 = document.getElementById("z1")!;
      const confirmed = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(z1);
      z1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      // z1 is depth 0 (root-level) — within the limit.
      expect(confirmed).toHaveBeenCalledTimes(1);
      expect([...z1.children].map((n) => n.id)).toEqual(["z2", "a"]);
    });
  });

  describe("bubbleConstraints (opt-in)", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="root">
          <div class="group" id="g1">
            <div class="item" id="a" data-mosaic-id="a">A</div>
          </div>
          <div class="group" id="g2">
            <div class="zone" id="zone-in-g2">
              <div class="item" id="x" data-mosaic-id="x">x</div>
            </div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
    });

    it("avoids an unnecessary rollback when pointerUp lands on a target too deep to accept, but an ancestor would", () => {
      // maxNestingDepth: 0 means `x` (depth 1, inside zone-in-g2) is too
      // deep to accept directly — but zone-in-g2 itself (depth 0) is fine.
      // pointerMove's own guard already prevents a live move deeper than
      // the limit, so `a` can legitimately live-move onto zone-in-g2 (depth
      // 0) but never onto `x` itself. Without bubbling, a final pointerUp
      // release that happens to land precisely on `x` would rollback a
      // perfectly valid position purely because of exactly where the
      // pointer let go — bubbleConstraints avoids that.
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone", group: ".group" },
        crossGroupDrag: true,
        bubbleConstraints: true,
        maxNestingDepth: 0,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const x = document.getElementById("x")!;
      const zoneInG2 = document.getElementById("zone-in-g2")!;
      const rollback = vi.fn();
      const confirmed = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // Live-move onto the zone itself — depth 0, within the limit, so this
      // succeeds and reparents `a` into zone-in-g2 alongside `x`.
      move(zoneInG2);
      expect([...zoneInG2.children].map((n) => n.id)).toEqual(["x", "a"]);

      // Release precisely over `x` (depth 1) — rejected on its own, but
      // bubbles up through its ancestors to zone-in-g2 (depth 0, already
      // where `a` legitimately sits) and is accepted there instead.
      x.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
      expect([...zoneInG2.children].map((n) => n.id)).toEqual(["x", "a"]);
    });

    it("without bubbleConstraints, the same release rolls back despite the valid intermediate position", () => {
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone", group: ".group" },
        crossGroupDrag: true,
        maxNestingDepth: 0,
        // bubbleConstraints omitted — defaults to false.
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const x = document.getElementById("x")!;
      const g1 = document.getElementById("g1")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      move(document.getElementById("zone-in-g2")!);
      x.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
      expect([...g1.children].map((n) => n.id)).toEqual(["a"]);
    });

    it("stays rejected when no ancestor in the chain is allowed either", () => {
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone", group: ".group" },
        bubbleConstraints: true,
        // crossGroupDrag left disabled — every ancestor is in g2, still a
        // different group than `a`'s own g1, so nothing in the chain passes.
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const x = document.getElementById("x")!;
      const g1 = document.getElementById("g1")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      x.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
      expect([...g1.children].map((n) => n.id)).toEqual(["a"]);
    });
  });

  describe("bubbleConstraints disabled (default)", () => {
    it("does not retry against ancestors — a rejection stays a rejection", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="z1">
            <div class="zone" id="z2">deep zone</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone" },
        maxNestingDepth: 0,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const z2 = document.getElementById("z2")!;
      const z1 = document.getElementById("z1")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      z2.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollback).toHaveBeenCalled();
      expect([...z1.children].map((n) => n.id)).toEqual(["z2"]);
    });
  });
});
