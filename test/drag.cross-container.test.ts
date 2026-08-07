import { describe, it, expect, afterEach, vi } from "vitest";
import { Mosaic } from "../src";
import type { ConstraintInput, ConstraintResult } from "../src/constraints";

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

describe("RM-21.4 (#160): cross-container constraint evaluation, transfer event, integration", () => {
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

  function setupLinkedPair(mosaicOptions: Partial<{ maxNestingDepth: number }> = {}) {
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
    const mosaicB = track(
      new Mosaic({ root: rootB, selectors: { node: ".item" }, ...mosaicOptions })
    );
    mosaicA.initialize();
    mosaicB.initialize();
    Mosaic.link(mosaicA, mosaicB);
    return { rootA, rootB, mosaicA, mosaicB };
  }

  describe("full end-to-end confirmed cross-container drop (AC8)", () => {
    it("A to linked B: live preview, drop-time pass, confirm, transfer event, node genuinely in B", () => {
      const { rootA, rootB, mosaicA, mosaicB } = setupLinkedPair();

      const transferHandler = vi.fn();
      window.addEventListener("mosaic:container:transfer", transferHandler);
      const confirmedHandler = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmedHandler);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true); // live preview (#158) — a1 already in B's DOM
      expect(a1.parentElement).toBe(rootB);

      b1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(confirmedHandler).toHaveBeenCalledTimes(1);
      expect(transferHandler).toHaveBeenCalledTimes(1);
      expect(transferHandler.mock.calls[0][0].detail).toEqual({
        sourceInstanceId: mosaicA.mosaicInstanceId,
        targetInstanceId: mosaicB.mosaicInstanceId,
        nodeId: "a1",
      });

      // Genuinely lives in B afterward.
      expect(a1.parentElement).toBe(rootB);
      expect([...rootA.children].map((n) => n.id)).toEqual([]);
      expect(mosaicA.snapshot).toBeNull();
    });
  });

  describe("full rejected cross-container drop (AC9)", () => {
    it("a registered cross-container constraint rejects: rollback via A's own snapshot, B unaffected, no transfer event", () => {
      // Built directly (not via setupLinkedPair()) since B needs a
      // rejecting crossContainerConstraint configured at construction.
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootB">
          <div class="item" id="b1" data-mosaic-id="b1">B1</div>
        </div>
      `;
      const freshRootA = document.getElementById("rootA")!;
      const freshRootB = document.getElementById("rootB")!;
      const a = track(new Mosaic({ root: freshRootA, selectors: { node: ".item" } }));
      const b = track(
        new Mosaic({
          root: freshRootB,
          selectors: { node: ".item" },
          crossContainerConstraints: [
            () => ({ allowed: false, reason: "b-refuses-incoming" }),
          ],
        })
      );
      a.initialize();
      b.initialize();
      Mosaic.link(a, b);

      const transferHandler = vi.fn();
      window.addEventListener("mosaic:container:transfer", transferHandler);
      const rollbackHandler = vi.fn();
      window.addEventListener("mosaic:rollback", rollbackHandler);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      expect(a1.parentElement).toBe(freshRootB);

      b1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollbackHandler).toHaveBeenCalledTimes(1);
      expect(transferHandler).not.toHaveBeenCalled();
      expect(a1.parentElement).toBe(freshRootA);
      expect([...freshRootB.children].map((n) => n.id)).toEqual(["b1"]);
      expect(a.snapshot).toBeNull();
    });
  });

  describe("unlinked instance rejected before any constraint runs (AC2, AC10)", () => {
    it("drop resolved onto an unlinked instance C is rejected without invoking any cross-container constraint", () => {
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
      const spy = vi.fn((): ConstraintResult => ({ allowed: true }));
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicC = track(
        new Mosaic({
          root: rootC,
          selectors: { node: ".item" },
          crossContainerConstraints: [spy],
        })
      );
      mosaicA.initialize();
      mosaicC.initialize();
      // Deliberately NOT linked.

      const rollbackHandler = vi.fn();
      window.addEventListener("mosaic:rollback", rollbackHandler);
      const transferHandler = vi.fn();
      window.addEventListener("mosaic:container:transfer", transferHandler);

      const a1 = document.getElementById("a1")!;
      const c1 = document.getElementById("c1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // A pointermove is required to reach Dragging before Dropping can
      // be entered (state machine) — hover over nothing in particular so
      // no live preview occurs (#158 never touches an unlinked peer
      // anyway).
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      // Release the pointer directly over c1, to exercise pointerUp's own
      // unlinked-instance detection independently of live preview ever
      // having reparented anything.
      c1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(spy).not.toHaveBeenCalled();
      expect(rollbackHandler).toHaveBeenCalledTimes(1);
      expect(transferHandler).not.toHaveBeenCalled();
      expect(a1.parentElement).toBe(rootA);
      expect([...rootC.children].map((n) => n.id)).toEqual(["c1"]);
    });

    it("surfaces reason 'unlinked-instance' with targetInstanceId metadata on mosaic:mutation:rejected", () => {
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

      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      const a1 = document.getElementById("a1")!;
      const c1 = document.getElementById("c1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      c1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(payload).toEqual({
        allowed: false,
        reason: "unlinked-instance",
        metadata: { targetInstanceId: mosaicC.mosaicInstanceId },
      });
    });
  });

  describe("registered cross-container constraint rejection surfaces reason/metadata (AC11)", () => {
    it("a rejecting cross-container constraint's reason/metadata reach mosaic:mutation:rejected, same as RM-22's same-instance plumbing", () => {
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
      const mosaicB = track(
        new Mosaic({
          root: rootB,
          selectors: { node: ".item" },
          crossContainerConstraints: [
            () => ({
              allowed: false,
              reason: "quota-exceeded",
              metadata: { maxItems: 5, currentItems: 5 },
            }),
          ],
        })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      b1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(payload).toEqual({
        allowed: false,
        reason: "quota-exceeded",
        metadata: { maxItems: 5, currentItems: 5 },
      });
    });
  });

  describe("cross-container constraints run only after the target's own built-in and user constraints pass (AC5, AC6)", () => {
    it("target B's own built-in group-boundary rejection short-circuits before the cross-container constraint ever runs", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootB">
          <div class="group" id="g1">
            <div class="item" id="b1" data-mosaic-id="b1">B1</div>
          </div>
        </div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootB = document.getElementById("rootB")!;
      const spy = vi.fn((): ConstraintResult => ({ allowed: true }));
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicB = track(
        new Mosaic({
          root: rootB,
          selectors: { node: ".item", group: ".group" },
          // crossGroupDrag omitted (false) — B's own built-in
          // group-boundary check will reject this drop (dropping into
          // g1 as a "different group" than the dropped node's own null
          // sourceGroup — wait, the RELEVANT comparison here is B's own
          // internal group-boundary logic given targetGroup=g1 vs
          // sourceGroup=null (a1 has no group in A) — still a real
          // rejection since they differ and crossGroupDrag is off).
          crossContainerConstraints: [spy],
        })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const rollbackHandler = vi.fn();
      window.addEventListener("mosaic:rollback", rollbackHandler);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      b1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(rollbackHandler).toHaveBeenCalledTimes(1);
      expect(spy).not.toHaveBeenCalled();
    });

    it("target B's own user constraints (RM-20) run before cross-container constraints, in order", () => {
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
      const calls: string[] = [];
      const userConstraint = vi.fn((): ConstraintResult => {
        calls.push("user");
        return { allowed: true };
      });
      const crossContainerConstraint = vi.fn((): ConstraintResult => {
        calls.push("cross-container");
        return { allowed: true };
      });
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicB = track(
        new Mosaic({
          root: rootB,
          selectors: { node: ".item" },
          constraints: [userConstraint],
          crossContainerConstraints: [crossContainerConstraint],
        })
      );
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      b1.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(calls).toEqual(["user", "cross-container"]);
    });

    it("cross-container constraints receive ConstraintInput with sourceInstanceId/targetInstanceId populated (AC4)", () => {
      let received: ConstraintInput | undefined;
      document.body.innerHTML = `
        <div id="rootA2">
          <div class="item" id="a2" data-mosaic-id="a2">A2</div>
        </div>
        <div id="rootB2">
          <div class="item" id="b2" data-mosaic-id="b2">B2</div>
        </div>
      `;
      const rootA2 = document.getElementById("rootA2")!;
      const rootB2 = document.getElementById("rootB2")!;
      const a = track(new Mosaic({ root: rootA2, selectors: { node: ".item" } }));
      const b = track(
        new Mosaic({
          root: rootB2,
          selectors: { node: ".item" },
          crossContainerConstraints: [
            (input) => {
              received = input;
              return { allowed: true };
            },
          ],
        })
      );
      a.initialize();
      b.initialize();
      Mosaic.link(a, b);

      const a2 = document.getElementById("a2")!;
      const b2 = document.getElementById("b2")!;
      a2.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b2, true);
      b2.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(received).toBeDefined();
      expect(received!.sourceInstanceId).toBe(a.mosaicInstanceId);
      expect(received!.targetInstanceId).toBe(b.mosaicInstanceId);
    });
  });

  describe("drop resolved onto neither own root, a linked peer, nor any known instance at all", () => {
    it("a linked peer that also fails to resolve falls through to the self-drop fallback (no rejection, no transfer)", () => {
      document.body.innerHTML = `
        <div id="rootA">
          <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        </div>
        <div id="rootB">
          <div class="item" id="b1" data-mosaic-id="b1">B1</div>
        </div>
        <div id="unrelated">not part of any Mosaic root</div>
      `;
      const rootA = document.getElementById("rootA")!;
      const rootB = document.getElementById("rootB")!;
      const mosaicA = track(new Mosaic({ root: rootA, selectors: { node: ".item" } }));
      const mosaicB = track(new Mosaic({ root: rootB, selectors: { node: ".item" } }));
      mosaicA.initialize();
      mosaicB.initialize();
      Mosaic.link(mosaicA, mosaicB);

      const transferHandler = vi.fn();
      window.addEventListener("mosaic:container:transfer", transferHandler);
      const confirmedHandler = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmedHandler);

      const a1 = document.getElementById("a1")!;
      const unrelated = document.getElementById("unrelated")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.elementFromPoint = () => null;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
      );
      // Neither A's own root, nor linked peer B's root, nor any other
      // known Mosaic instance's root contains this element at all —
      // falls through to the pre-existing self-drop fallback (a1 as its
      // own dropTarget), unrelated to cross-container logic entirely.
      unrelated.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(confirmedHandler).toHaveBeenCalledTimes(1);
      expect(transferHandler).not.toHaveBeenCalled();
      expect(a1.parentElement).toBe(rootA);
    });
  });

  describe("same-instance drops are entirely unaffected (regression)", () => {
    it("a plain same-instance drop never fires mosaic:container:transfer and ConstraintInput has no instance ids", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="item" id="b" data-mosaic-id="b">B</div>
        </div>
      `;
      const root = document.getElementById("root")!;
      let received: ConstraintInput | undefined;
      const mosaic = track(
        new Mosaic({
          root,
          selectors: { node: ".item" },
          constraints: [
            (input) => {
              received = input;
              return { allowed: true };
            },
          ],
        })
      );
      mosaic.initialize();

      const transferHandler = vi.fn();
      window.addEventListener("mosaic:container:transfer", transferHandler);

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b, true);
      b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(transferHandler).not.toHaveBeenCalled();
      expect(received?.sourceInstanceId).toBeUndefined();
      expect(received?.targetInstanceId).toBeUndefined();
    });
  });
});
