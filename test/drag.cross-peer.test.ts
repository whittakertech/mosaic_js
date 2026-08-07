import { describe, it, expect, afterEach, vi } from "vitest";
import { Mosaic, MosaicState } from "../src";

function moveOver(target: Element, before = true) {
  document.elementFromPoint = () => target;
  const rect = {
    top: 0,
    left: 0,
    width: 0,
    height: 100,
    bottom: 100,
    right: 0,
    x: 0,
    y: 0,
    toJSON() {},
  } as DOMRect;
  (target as HTMLElement).getBoundingClientRect = () => rect;
  const clientY = before ? -1 : 1000;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY, bubbles: true })
  );
}

function moveOffAllTargets() {
  document.elementFromPoint = () => null;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
  );
}

describe("RM-21.2 (#158): live cross-peer target resolution and hover", () => {
  const instances: Mosaic[] = [];

  afterEach(() => {
    while (instances.length) {
      instances.pop()?.destroy();
    }
    document.body.innerHTML = "";
  });

  function track(m: Mosaic): Mosaic {
    instances.push(m);
    return m;
  }

  function setupTwoInstances() {
    document.body.innerHTML = `
      <div id="rootA">
        <div class="item" id="a1" data-mosaic-id="a1">A1</div>
      </div>
      <div id="rootB">
        <div class="item" id="b1" data-mosaic-id="b1">B1</div>
      </div>
    `;
    const rootA = document.getElementById("rootA")!;
    const rootB = document.getElementById("rootB")!;
    const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
    const mosaicB = track(new Mosaic({ root: rootB, selectors: { node: ".item" } }));
    mosaicA.initialize();
    mosaicB.initialize();
    return { rootA, rootB, mosaicA, mosaicB };
  }

  describe("live preview into a linked peer (AC1, AC3, AC8)", () => {
    it("dragging from A and hovering B's valid target live-moves the node into B's DOM", () => {
      const { rootA, rootB, mosaicA, mosaicB } = setupTwoInstances();
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);

      expect([...rootB.children].map((n) => n.id)).toEqual(["a1", "b1"]);
      expect([...rootA.children].map((n) => n.id)).toEqual([]);
    });

    it("own-root resolution takes priority over peer probing when both would match", () => {
      // a1 is hoverable in its own root — even though A and B are linked,
      // resolving a target that exists in A's own root must never fall
      // through to probing B at all (AC1: own-instance resolution first).
      const { rootA, mosaicA, mosaicB } = setupTwoInstances();
      Mosaic.link(mosaicA, mosaicB);

      // NOTE: appending via `element.appendChild` directly, never via
      // `document.body.innerHTML +=` — the latter destroys and re-parses
      // the whole subtree, silently orphaning the already-initialized
      // Mosaic instances' `root`/listeners from the live document and
      // turning this into a false-positive test (caught while writing it).
      const a2 = document.createElement("div");
      a2.className = "item";
      a2.id = "a2";
      a2.setAttribute("data-mosaic-id", "a2");
      rootA.appendChild(a2);

      const a1 = document.getElementById("a1")!;
      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(a2, true);

      expect([...rootA.children].map((n) => n.id)).toEqual(["a1", "a2"]);
    });
  });

  describe("unlinked peers are never touched (AC4, AC9)", () => {
    it("hovering an unlinked instance C produces no live preview move — C's DOM is untouched", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootC">
          <div class="item" id="c1" data-mosaic-id="c1">C1</div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootC = document.getElementById("rootC")!;
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicC = track(new Mosaic({ root: rootC, selectors: { node: ".item" } }));
      mosaicA.initialize();
      mosaicC.initialize();
      // Deliberately NOT linked.

      const a1 = document.getElementById("a1")!;
      const c1 = document.getElementById("c1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c1, true);

      expect([...rootC.children].map((n) => n.id)).toEqual(["c1"]);
      expect([...rootA.children].map((n) => n.id)).toEqual(["a1"]);
    });

    it("hover events never fire on an unlinked instance's root", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootC">
          <div class="item" id="c1" data-mosaic-id="c1">C1</div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootC = document.getElementById("rootC")!;
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicC = track(new Mosaic({ root: rootC, selectors: { node: ".item" } }));
      mosaicA.initialize();
      mosaicC.initialize();

      const handler = vi.fn();
      rootC.addEventListener("mosaic:hover:enter", handler);

      const a1 = document.getElementById("a1")!;
      const c1 = document.getElementById("c1")!;
      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(c1, true);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("hover events on the correct root with instance ids (AC5, AC6, AC10)", () => {
    it("dispatches mosaic:hover:enter on B's root, not A's, with sourceInstanceId/targetInstanceId populated", () => {
      const { rootA, rootB, mosaicA, mosaicB } = setupTwoInstances();
      Mosaic.link(mosaicA, mosaicB);

      const onA = vi.fn();
      const onB = vi.fn();
      rootA.addEventListener("mosaic:hover:enter", onA);
      rootB.addEventListener("mosaic:hover:enter", onB);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;
      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);

      expect(onA).not.toHaveBeenCalled();
      expect(onB).toHaveBeenCalledTimes(1);

      const detail = onB.mock.calls[0][0].detail;
      expect(detail).toEqual({
        targetId: "b1",
        targetType: "node",
        depth: 0,
        groupId: null,
        sourceInstanceId: mosaicA.mosaicInstanceId,
        targetInstanceId: mosaicB.mosaicInstanceId,
      });
    });

    it("dispatches mosaic:hover:leave on B's root when the pointer leaves B's target", () => {
      const { rootB, mosaicA, mosaicB } = setupTwoInstances();
      Mosaic.link(mosaicA, mosaicB);

      const onBLeave = vi.fn();
      rootB.addEventListener("mosaic:hover:leave", onBLeave);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;
      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      moveOffAllTargets();

      expect(onBLeave).toHaveBeenCalledTimes(1);
      const detail = onBLeave.mock.calls[0][0].detail;
      expect(detail.targetInstanceId).toBe(mosaicB.mosaicInstanceId);
      expect(detail.sourceInstanceId).toBe(mosaicA.mosaicInstanceId);
    });

    it("own-instance hovers set targetInstanceId to the same (own) instance id, never undefined (AC2)", () => {
      const { rootA, mosaicA } = setupTwoInstances();
      const a2 = document.createElement("div");
      a2.className = "item";
      a2.id = "a2";
      a2.setAttribute("data-mosaic-id", "a2");
      rootA.appendChild(a2);

      let detail: any;
      rootA.addEventListener("mosaic:hover:enter", (e) => {
        detail = (e as CustomEvent).detail;
      });

      const a1 = document.getElementById("a1")!;
      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(a2, true);

      expect(detail.sourceInstanceId).toBe(mosaicA.mosaicInstanceId);
      expect(detail.targetInstanceId).toBe(mosaicA.mosaicInstanceId);
    });

    it("a peer hover clears own-instance group-hover tracking (crossGroupDrag configured on the origin)", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="group" id="gA1">
            <div class="item" id="a1" data-mosaic-id="a1">A1</div>
          </div>
          <div class="group" id="gA2">
            <div class="item" id="a2" data-mosaic-id="a2">A2</div>
          </div>
        </div>
        <div id="rootB">
          <div class="item" id="b1" data-mosaic-id="b1">B1</div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootB = document.getElementById("rootB")!;
      const mosaicA = track(
        new Mosaic({
          root: rootA,
          selectors: { node: ".item", group: ".group" },
          crossGroupDrag: true,
        })
      );
      const mosaicB = track(new Mosaic({ root: rootB, selectors: { node: ".item" } }));
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const groupLeave = vi.fn();
      rootA.addEventListener("mosaic:group:leave", groupLeave);

      const a1 = document.getElementById("a1")!;
      const a2 = document.getElementById("a2")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Enter a2's own-instance group (gA2) first — hoverGroup becomes gA2.
      moveOver(a2, true);
      expect(document.getElementById("gA2")!.classList.contains("mosaic--group-hover")).toBe(
        true
      );

      // Now hover into linked peer B — a genuine cross-peer hover, which
      // must clear the own-instance group-hover state (fires group:leave
      // for gA2) rather than attempting a same-tree group comparison
      // against a peer-tree element.
      moveOver(b1, true);

      expect(groupLeave).toHaveBeenCalledTimes(1);
      expect(groupLeave.mock.calls[0][0].detail).toEqual({ groupId: "gA2" });
      expect(document.getElementById("gA2")!.classList.contains("mosaic--group-hover")).toBe(
        false
      );
    });
  });

  describe("own-instance behavior is unaffected when no peers are linked (AC11, regression)", () => {
    it("a Mosaic with zero linked peers behaves exactly as a single-instance drag", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="item" id="b" data-mosaic-id="b">B</div>
        </div>
      `;
      const root = document.getElementById("root")!;
      const mosaic = track(new Mosaic({ root, selectors: { node: ".item" } }));
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b, true);

      expect([...root.children].map((n) => n.id)).toEqual(["a", "b"]);
      expect(mosaic.getState()).toBe(MosaicState.Dragging);
    });
  });

  describe("circular-nesting/max-depth live guards apply to a cross-peer resolved target (AC12)", () => {
    it("does not live-reparent into a peer's drop target that would exceed the peer's own maxNestingDepth", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootB">
          <div class="zone" id="outer">
            <div class="zone" id="inner">deep</div>
          </div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootB = document.getElementById("rootB")!;
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicB = track(
        new Mosaic({
          root: rootB,
          selectors: { node: ".item", dropTarget: ".zone" },
          maxNestingDepth: 0,
        })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const inner = document.getElementById("inner")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(inner, true);

      // `inner` is depth 1 inside B, exceeding B's own maxNestingDepth: 0 —
      // must not be reparented in, even though B is linked and A itself
      // has no maxNestingDepth configured at all.
      expect(a1.parentElement).toBe(rootA);
    });

    it("evaluates nesting depth against the RESOLVED (peer) instance's maxNestingDepth, not the origin's", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootB">
          <div class="zone" id="outer">
            <div class="zone" id="inner">deep</div>
          </div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootB = document.getElementById("rootB")!;
      // Origin A has a strict maxNestingDepth: 0 — must NOT be the value
      // that governs a drop resolved against B, which has no limit at all.
      const mosaicA = track(
        new Mosaic({ root: rootA, selectors: { node: ".item" }, maxNestingDepth: 0 })
      );
      const mosaicB = track(
        new Mosaic({ root: rootB, selectors: { node: ".item", dropTarget: ".zone" } })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const inner = document.getElementById("inner")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(inner, true);

      expect(a1.parentElement).toBe(inner);
    });

    it("circular-nesting guard still applies against a peer's resolved container, once the dragged node already lives inside that peer", () => {
      // Real, reachable sequence (not artificial): the dragged node a1
      // carries its own nested drop-target child. First move live-reparents
      // a1 (and its child) into linked peer B's "outer" zone. Second move
      // hovers a1's own now-peer-resident child — B's own-root resolution
      // for that second move finds a1's-child matching B's dropTarget
      // selector, with container === that child, which is activeNode's own
      // descendant. The guard must still block this, exactly as it would
      // for a same-instance circular nest.
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">
            <div class="zone" id="a1-inner-zone">nested zone inside a1</div>
          </div>
        </div>
        <div id="rootB">
          <div class="zone" id="outer">outer zone</div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicB = track(
        new Mosaic({
          root: document.getElementById("rootB")!,
          selectors: { node: ".item", dropTarget: ".zone" },
        })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const outer = document.getElementById("outer")!;
      const innerZone = document.getElementById("a1-inner-zone")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Move 1: reparent a1 (with its child) into B's outer zone.
      moveOver(outer, true);
      expect(a1.parentElement).toBe(outer);

      // Move 2: hover a1's own child, now physically inside B's DOM.
      moveOver(innerZone, true);

      // Blocked — a1 did not move again, and its own child is untouched.
      expect(a1.parentElement).toBe(outer);
      expect(innerZone.parentElement).toBe(a1);
    });
  });
});
