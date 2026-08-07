import { describe, it, expect, afterEach } from "vitest";
import { Mosaic } from "../src";

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

describe("RM-21.3 (#159): cross-instance snapshot coordination — AC1 verification", () => {
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

  /**
   * AC1's exact verification scenario: drag a node from instance A,
   * live-preview-move it into linked instance B's DOM (#158), then call
   * A's restoreSnapshot (via Mosaic.reject(), the real production call
   * path) alone — B never captures a snapshot at all.
   *
   * FINDING (confirmed empirically, per AC1's own instruction not to
   * assume either direction): this passes. DOM `insertBefore`'s
   * implicit-move semantics mean `restoreSnapshot` correctly relocates
   * the node back to instance A's original parent/position even though
   * the node currently lives in instance B's DOM tree — `parent.
   * insertBefore(el, ref)` silently detaches `el` from wherever it
   * currently sits (B, here) before reinserting at the stored position in
   * A. No second, peer-owned snapshot is required for correct rollback.
   *
   * Per the ticket's own instruction ("if this passes, AC6/7 are already
   * satisfied by the existing single-snapshot model — document that
   * finding, add the regression test, and this ticket is done"), this
   * ticket's real scope turned out to be: **verification + regression
   * test only, no new coordination code.** AC2-5's speculative
   * "cross-instance coordination" code path is NOT built — it was
   * conditional on this test failing, and it didn't.
   */
  it("A's own snapshot alone correctly rolls back a node that was live-moved into a linked peer B", () => {
    document.body.innerHTML = `
      <div id="rootA">
        <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        <div class="item" id="a2" data-mosaic-id="a2">A2</div>
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
    Mosaic.link(mosaicA, mosaicB);

    // Deliberately never call anything that would make B capture a
    // snapshot — B.snapshot stays null throughout, per AC1's scenario.
    expect(mosaicB.snapshot).toBeNull();

    const a1 = document.getElementById("a1")!;
    const b1 = document.getElementById("b1")!;

    a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(mosaicA.snapshot?.dom.map((e) => e.id)).toEqual(["a1", "a2"]);

    // #158's live preview reparents a1 into B's DOM.
    moveOver(b1, true);
    expect(a1.parentElement).toBe(rootB);
    expect([...rootA.children].map((n) => n.id)).toEqual(["a2"]);

    // Reject via the real production call path (Mosaic.reject(), which
    // DragController.processResult calls on a rejected drop) — using A's
    // own snapshot only. B's snapshot was never touched.
    mosaicA.reject();

    expect(a1.parentElement).toBe(rootA);
    expect([...rootA.children].map((n) => n.id)).toEqual(["a1", "a2"]);
    expect([...rootB.children].map((n) => n.id)).toEqual(["b1"]);
    expect(mosaicA.snapshot).toBeNull();
    expect(mosaicB.snapshot).toBeNull();
  });

  it("restores exact original order among siblings, not just parentage", () => {
    // A stronger version of the same finding: original position matters,
    // not just "ends up somewhere in A".
    document.body.innerHTML = `
      <div id="rootA">
        <div class="item" id="a1" data-mosaic-id="a1">A1</div>
        <div class="item" id="a2" data-mosaic-id="a2">A2</div>
        <div class="item" id="a3" data-mosaic-id="a3">A3</div>
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
    Mosaic.link(mosaicA, mosaicB);

    // Drag the MIDDLE node — the interesting case for "original position".
    const a2 = document.getElementById("a2")!;
    const b1 = document.getElementById("b1")!;

    a2.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    moveOver(b1, true);
    expect(a2.parentElement).toBe(rootB);

    mosaicA.reject();

    expect([...rootA.children].map((n) => n.id)).toEqual(["a1", "a2", "a3"]);
  });

  describe("confirmed cross-peer drop clears state on both sides (AC4)", () => {
    it("a confirmed drop clears A's snapshot; B's stays null throughout since it was never set", () => {
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
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      expect(mosaicA.snapshot).not.toBeNull();
      expect(mosaicB.snapshot).toBeNull();

      // Confirm via the real production call path.
      mosaicA.confirm();

      expect(mosaicA.snapshot).toBeNull();
      expect(mosaicB.snapshot).toBeNull();
      // The live-previewed move stands — a1 stays in B, confirmed.
      expect(a1.parentElement).toBe(rootB);
    });
  });

  describe("no stale unconfirmed snapshot leak on a peer that was only briefly hovered (AC5)", () => {
    it("B never captures a snapshot at all merely from being hovered as a peer (#158 never touches B.snapshot)", () => {
      // #158's live preview only ever manipulates B's DOM directly
      // (container.appendChild/insertBefore) — it never calls
      // createSnapshot() on B. Confirms there's no leaked/stale snapshot
      // for AC5 to even worry about: B.snapshot is simply never set by a
      // cross-peer hover in the first place, regardless of whether the
      // drag that touched it ever completes, is rejected, or ends
      // elsewhere entirely.
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
      Mosaic.link(mosaicA, mosaicB);

      const a1 = document.getElementById("a1")!;
      const b1 = document.getElementById("b1")!;

      a1.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      moveOver(b1, true);
      expect(mosaicB.snapshot).toBeNull();

      // Drag ends without ever resolving over B specifically (reset via
      // reject, simulating "drag ended elsewhere") — still nothing to leak.
      mosaicA.reject();
      expect(mosaicB.snapshot).toBeNull();
    });
  });
});
