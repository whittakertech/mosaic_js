import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic, MosaicState } from "../src";
import { WorldObserver } from "../src/world-tolerance";

/**
 * MutationObserver callbacks are delivered on a microtask; the debounce
 * timer inside WorldObserver is a real `setTimeout`. Waiting past both
 * with a real timer is simpler and more faithful than juggling fake
 * timers against an unmocked microtask queue.
 */
function waitForWorldMutation(ms = 80): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setup() {
  document.body.innerHTML = `
    <div id="root">
      <div class="item" id="a" data-mosaic-id="a">A</div>
      <div class="item" id="b" data-mosaic-id="b">B</div>
      <div class="item" id="c" data-mosaic-id="c">C</div>
    </div>
  `;
  return document.getElementById("root")!;
}

function makeItem(id: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "item";
  el.id = id;
  el.setAttribute("data-mosaic-id", id);
  el.textContent = id.toUpperCase();
  return el;
}

function startDrag(root: HTMLElement, nodeId: string) {
  const node = document.getElementById(nodeId)!;
  node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

  // A pointermove is required to reach Dragging — hover over nothing in
  // particular so no live reorder occurs.
  document.elementFromPoint = () => null;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
  );
}

describe("WorldObserver (unit)", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  beforeEach(() => {
    root = setup();
    mosaic = new Mosaic({ root, selectors: { node: ".item" } });
  });

  it("reports isConnected across connect()/disconnect()", () => {
    const observer = new WorldObserver(mosaic);
    expect(observer.isConnected).toBe(false);

    observer.connect();
    expect(observer.isConnected).toBe(true);

    observer.disconnect();
    expect(observer.isConnected).toBe(false);
  });

  it("connect() is idempotent", () => {
    const observer = new WorldObserver(mosaic);
    observer.connect();
    observer.connect();
    expect(observer.isConnected).toBe(true);
    observer.disconnect();
  });

  it("disconnect() cancels a pending debounce timer", async () => {
    const observer = new WorldObserver(mosaic);
    observer.connect();

    root.appendChild(makeItem("d"));
    // Let the MutationObserver microtask fire and schedule the debounce
    // timer, but disconnect before it elapses.
    await Promise.resolve();
    await Promise.resolve();

    const handler = vi.fn();
    window.addEventListener("mosaic:world:mutated", handler);

    observer.disconnect();
    await waitForWorldMutation();

    expect(handler).not.toHaveBeenCalled();
  });

  it("drain() is a no-op when disconnected", () => {
    const observer = new WorldObserver(mosaic);
    expect(() => observer.drain()).not.toThrow();
  });
});

describe("RM-15: world tolerance for dynamic DOM mutations", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
    vi.useRealTimers();
  });

  describe("disabled (default)", () => {
    beforeEach(() => {
      root = setup();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();
    });

    it("worldTolerance defaults to false", () => {
      expect(mosaic.worldTolerance).toBe(false);
    });

    it("does not observe mutations, idle or dragging (AC14/AC15)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      // Idle: mutate freely.
      root.appendChild(makeItem("d"));
      await waitForWorldMutation();
      expect(handler).not.toHaveBeenCalled();

      // Dragging: still no observer since worldTolerance is off.
      startDrag(root, "a");
      root.appendChild(makeItem("e"));
      await waitForWorldMutation();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("enabled", () => {
    beforeEach(() => {
      root = setup();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        worldTolerance: true,
      });
      mosaic.initialize();
    });

    it("is opt-in via MosaicOptions.worldTolerance", () => {
      expect(mosaic.worldTolerance).toBe(true);
    });

    it("is not active outside the drag lifecycle (idle) (AC15)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("is not active after destroy() (AC15)", async () => {
      startDrag(root, "a");
      mosaic.destroy();

      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores benign attribute mutations on non-participating elements", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      root.setAttribute("data-decoy", "1");
      const b = document.getElementById("b")!;
      b.setAttribute("aria-label", "unrelated change");

      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores insertion of non-participating elements and non-Element nodes", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");

      // A decoy element that doesn't match `.item` ...
      const decoy = document.createElement("span");
      decoy.textContent = "decoy";
      root.appendChild(decoy);

      // ... and a raw text node, which isn't an Element at all.
      root.appendChild(document.createTextNode("just text"));

      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores removal of a non-participating element", async () => {
      const decoy = document.createElement("span");
      decoy.textContent = "decoy";
      root.appendChild(decoy);

      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      decoy.remove();

      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("resets the debounce timer across separate mutation bursts", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");

      root.appendChild(makeItem("d"));
      // Let this burst's MutationObserver callback fire and schedule the
      // debounce timer, well before it would elapse.
      await new Promise((resolve) => setTimeout(resolve, 10));

      root.appendChild(makeItem("e"));
      await waitForWorldMutation();

      // Both bursts collapsed into a single response — the second burst's
      // arrival reset (rather than raced) the first's pending timer.
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        mutationType: "added",
        affectedNodeCount: 2,
      });
    });

    it("detects external node insertion during drag and re-captures the snapshot (AC10)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      const before = mosaic.snapshot;
      expect(before?.dom.map((e) => e.id)).toEqual(["a", "b", "c"]);

      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        mutationType: "added",
        affectedNodeCount: 1,
      });

      // Re-captured, not the drag-start snapshot.
      expect(mosaic.snapshot).not.toBe(before);
      expect(mosaic.snapshot?.dom.map((e) => e.id)).toEqual([
        "a",
        "b",
        "c",
        "d",
      ]);
    });

    it("detects external node removal during drag and re-captures the snapshot (AC11)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      const before = mosaic.snapshot;

      const c = document.getElementById("c")!;
      c.remove();
      await waitForWorldMutation();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        mutationType: "removed",
        affectedNodeCount: 1,
      });

      expect(mosaic.snapshot).not.toBe(before);
      expect(mosaic.snapshot?.dom.map((e) => e.id)).toEqual(["a", "b"]);
    });

    it("classifies a mixed insertion+removal batch as mutationType 'mixed'", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      const c = document.getElementById("c")!;
      c.remove();
      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        mutationType: "mixed",
        affectedNodeCount: 2,
      });
    });

    it("debounces rapid sequential mutations into a single response (AC9)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      root.appendChild(makeItem("d"));
      root.appendChild(makeItem("e"));
      root.appendChild(makeItem("f"));

      await waitForWorldMutation();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({
        mutationType: "added",
        affectedNodeCount: 3,
      });
    });

    it("does not treat MosaicJS's own live reorder as an external mutation", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      document.elementFromPoint = () => b;
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
      b.getBoundingClientRect = () => rect;
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: -1, bubbles: true })
      );

      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });

    it("rollback after external mutation restores the re-captured state, not the drag-start state (AC12)", async () => {
      startDrag(root, "a");
      const dragStartSnapshot = mosaic.snapshot;
      expect(dragStartSnapshot?.dom.map((e) => e.id)).toEqual(["a", "b", "c"]);

      // External insertion between a and b.
      const a = document.getElementById("a")!;
      const d = makeItem("d");
      root.insertBefore(d, a.nextSibling);
      await waitForWorldMutation();

      const recaptured = mosaic.snapshot;
      expect(recaptured).not.toBe(dragStartSnapshot);
      expect(recaptured?.dom.map((e) => e.id)).toEqual(["a", "d", "b", "c"]);

      // Scramble the DOM synchronously (no further observer flush before
      // reject()), simulating drag-driven movement between the recapture
      // and the drop.
      root.appendChild(d);
      expect([...root.children].map((n) => n.id)).toEqual(["a", "b", "c", "d"]);

      mosaic.reject();

      // Restored to the RE-CAPTURED order (a, d, b, c) — proof rollback
      // targeted the last known-good state. Restoring the stale
      // drag-start snapshot (which never knew about "d") would have left
      // the DOM at ["a", "b", "c", "d"] instead.
      expect([...root.children].map((n) => n.id)).toEqual([
        "a",
        "d",
        "b",
        "c",
      ]);
    });

    it("emits mosaic:world:mutated with correct payload shape (AC13)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");
      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      const detail = handler.mock.calls[0][0].detail;
      expect(Object.keys(detail).sort()).toEqual([
        "affectedNodeCount",
        "mutationType",
      ]);
      expect(typeof detail.mutationType).toBe("string");
      expect(typeof detail.affectedNodeCount).toBe("number");
    });

    it("disconnects the observer on reset() so a mutation after drag end is ignored (AC8)", async () => {
      const handler = vi.fn();
      window.addEventListener("mosaic:world:mutated", handler);

      startDrag(root, "a");

      const a = document.getElementById("a")!;
      a.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

      expect(mosaic.getState()).toBe(MosaicState.Idle);

      root.appendChild(makeItem("d"));
      await waitForWorldMutation();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
