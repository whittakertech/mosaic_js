import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Mosaic } from "../src";

function setupUngrouped() {
  document.body.innerHTML = `
    <div id="root">
      <div class="item" id="a" data-mosaic-id="a">A</div>
      <div class="item" id="b" data-mosaic-id="b">B</div>
    </div>
  `;
  return document.getElementById("root")!;
}

function setupGrouped() {
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

describe("RM-16: drag lifecycle event payload expansion", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("mosaic:state dropTargetId (AC1, AC5)", () => {
    beforeEach(() => {
      root = setupUngrouped();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();
    });

    it("is null before any hover is resolved", () => {
      let payload: any;
      window.addEventListener("mosaic:state", (e) => {
        payload = (e as CustomEvent).detail;
      });

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(payload.dropTargetId).toBeNull();
    });

    it("reflects the currently-hovered target on a subsequent real transition (AC5)", () => {
      // The Dragging transition itself fires *before* pointerMove resolves
      // hover for that same call (setMosaicState(Dragging) runs, then
      // resolveTarget/this.hover assignment happens after) — so the first
      // mosaic:state.dropTargetId is still null. The next real transition
      // (Dropping, at pointerUp) fires with `this.hover` already populated
      // from the prior move, and is where dropTargetId is genuinely
      // observable — this is the real, not idealized, shipped behavior.
      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      const payloads: any[] = [];
      window.addEventListener("mosaic:state", (e) => {
        payloads.push((e as CustomEvent).detail);
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      document.elementFromPoint = () => b;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );

      b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      const dropping = payloads.find((p) => p.to === "dropping");
      expect(dropping).toBeDefined();
      expect(dropping.dropTargetId).toBe("b");
    });
  });

  describe("mosaic:hover groupId (AC2, AC6)", () => {
    beforeEach(() => {
      root = setupGrouped();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();
    });

    it("includes the hovered target's groupId on mosaic:hover:enter/leave", () => {
      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      let enterPayload: any;
      let leavePayload: any;
      root.addEventListener("mosaic:hover:enter", (e) => {
        enterPayload = (e as CustomEvent).detail;
      });
      root.addEventListener("mosaic:hover:leave", (e) => {
        leavePayload = (e as CustomEvent).detail;
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      document.elementFromPoint = () => b;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );

      expect(enterPayload).toEqual({
        targetId: "b",
        targetType: "node",
        depth: 0,
        groupId: "g1",
        // #158/RM-21.2: every ResolvedTarget-derived hover payload now
        // always carries these, own-instance hovers included (see that
        // ticket's ResolvedTarget.instanceId doc comment).
        sourceInstanceId: mosaic.mosaicInstanceId,
        targetInstanceId: mosaic.mosaicInstanceId,
      });

      // Move off root entirely to force a leave.
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );

      expect(leavePayload).toEqual({
        targetId: "b",
        targetType: "node",
        depth: 0,
        groupId: "g1",
        sourceInstanceId: mosaic.mosaicInstanceId,
        targetInstanceId: mosaic.mosaicInstanceId,
      });
    });
  });

  describe("backward compatibility — null when unconfigured (AC3, AC7)", () => {
    it("mosaic:state.groupId and .dropTargetId are both null with no groups/drop targets configured", () => {
      root = setupUngrouped();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      let payload: any;
      window.addEventListener("mosaic:state", (e) => {
        payload = (e as CustomEvent).detail;
      });

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(payload.groupId).toBeNull();
      expect(payload.dropTargetId).toBeNull();
    });

    it("mosaic:hover:enter.groupId is null when selectors.group is not configured", () => {
      root = setupUngrouped();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      let payload: any;
      root.addEventListener("mosaic:hover:enter", (e) => {
        payload = (e as CustomEvent).detail;
      });

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => b;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );

      expect(payload.groupId).toBeNull();
    });
  });

  describe("regression: groupId on mosaic:state (AC8, pins already-shipped #13 behavior)", () => {
    it("carries the active node's group id on every transition once a drag starts", () => {
      root = setupGrouped();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();

      const payloads: any[] = [];
      window.addEventListener("mosaic:state", (e) => {
        payloads.push((e as CustomEvent).detail);
      });

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      expect(payloads).toHaveLength(1);
      expect(payloads[0].groupId).toBe("g1");
    });
  });

  describe("AC4: group-hover vs. node-hover event ordering", () => {
    it("real shipped order is node/dropTarget hover before group hover, within the same pointerMove", () => {
      // Confirms — does not change — DragController.pointerMove's real
      // ordering: the node/dropTarget hover block runs, then the
      // cross-group hover-tracking block runs after it. See PR body for
      // the reasoning this is being kept as-is rather than flipped, and
      // this confirmed order is what RM-17 documents.
      document.body.innerHTML = `
        <div id="root">
          <div class="group" id="g1">
            <div class="item" id="a" data-mosaic-id="a">A</div>
          </div>
          <div class="group" id="g2">
            <div class="item" id="c" data-mosaic-id="c">C</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        crossGroupDrag: true,
      });
      mosaic.initialize();

      const order: string[] = [];
      root.addEventListener("mosaic:hover:enter", () => order.push("hover:enter"));
      root.addEventListener("mosaic:group:enter", () => order.push("group:enter"));

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      document.elementFromPoint = () => c;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );

      expect(order).toEqual(["hover:enter", "group:enter"]);
    });
  });
});
