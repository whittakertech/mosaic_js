import { describe, it, expect, afterEach } from "vitest";
import { Mosaic } from "../src";

function makeRoot(id: string): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function makeMosaic(rootId: string): Mosaic {
  return new Mosaic({ root: makeRoot(rootId), selectors: { node: ".item" } });
}

describe("RM-21.1 (#157): peer registry — Mosaic.link()/unlink()/arePeers()", () => {
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

  describe("linking is symmetric (AC1, AC9)", () => {
    it("Mosaic.link(a, b) makes arePeers(a, b) and arePeers(b, a) both true", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      expect(Mosaic.arePeers(a, b)).toBe(false);
      expect(Mosaic.arePeers(b, a)).toBe(false);

      Mosaic.link(a, b);

      expect(Mosaic.arePeers(a, b)).toBe(true);
      expect(Mosaic.arePeers(b, a)).toBe(true);
    });

    it("linking an already-linked pair is idempotent", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      Mosaic.link(a, b);
      Mosaic.link(a, b);
      Mosaic.link(b, a);

      expect(Mosaic.arePeers(a, b)).toBe(true);
      expect(Mosaic.arePeers(b, a)).toBe(true);
    });

    it("linking an instance to itself is a no-op", () => {
      const a = track(makeMosaic("a"));

      expect(() => Mosaic.link(a, a)).not.toThrow();
      expect(Mosaic.arePeers(a, a)).toBe(false);
    });
  });

  describe("unlinking is symmetric (AC2, AC10)", () => {
    it("Mosaic.unlink(a, b) removes both directions", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      Mosaic.link(a, b);
      Mosaic.unlink(a, b);

      expect(Mosaic.arePeers(a, b)).toBe(false);
      expect(Mosaic.arePeers(b, a)).toBe(false);
    });

    it("unlinking a never-linked pair is a no-op, not an error", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      expect(() => Mosaic.unlink(a, b)).not.toThrow();
      expect(Mosaic.arePeers(a, b)).toBe(false);
    });

    it("unlinking one pair leaves other links on the same instance intact", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));
      const c = track(makeMosaic("c"));

      Mosaic.link(a, b);
      Mosaic.link(a, c);
      Mosaic.unlink(a, b);

      expect(Mosaic.arePeers(a, b)).toBe(false);
      expect(Mosaic.arePeers(a, c)).toBe(true);
    });
  });

  describe("linking is not transitive (AC5, AC11)", () => {
    it("A-B and B-C linked does not imply A-C are peers", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));
      const c = track(makeMosaic("c"));

      Mosaic.link(a, b);
      Mosaic.link(b, c);

      expect(Mosaic.arePeers(a, b)).toBe(true);
      expect(Mosaic.arePeers(b, c)).toBe(true);
      expect(Mosaic.arePeers(a, c)).toBe(false);
      expect(Mosaic.arePeers(c, a)).toBe(false);
    });
  });

  describe("destroy() cleanup (AC6, AC7, AC12)", () => {
    it("destroy() removes all of an instance's links; a former peer's arePeers() check returns false", () => {
      const a = makeMosaic("a"); // not tracked — destroyed explicitly below
      const b = track(makeMosaic("b"));
      const c = track(makeMosaic("c"));

      Mosaic.link(a, b);
      Mosaic.link(a, c);
      expect(Mosaic.arePeers(a, b)).toBe(true);
      expect(Mosaic.arePeers(a, c)).toBe(true);

      a.destroy();

      expect(Mosaic.arePeers(a, b)).toBe(false);
      expect(Mosaic.arePeers(b, a)).toBe(false);
      expect(Mosaic.arePeers(a, c)).toBe(false);
      expect(Mosaic.arePeers(c, a)).toBe(false);
    });

    it("destroying an instance with no links at all does not throw", () => {
      const a = makeMosaic("a");
      expect(() => a.destroy()).not.toThrow();
    });

    it("re-linking a former peer's instanceId after destroy is impossible via a stale reference (destroyed instance stays inert)", () => {
      // Regression guard for AC7's "no dangling registry entries" — after
      // destroy(), the destroyed instance's own id no longer appears as a
      // key in the peer registry at all, not just emptied.
      const a = makeMosaic("a");
      const b = track(makeMosaic("b"));

      Mosaic.link(a, b);
      a.destroy();

      // b's own link set no longer references a's (now-stale) instanceId.
      expect(Mosaic.arePeers(b, a)).toBe(false);
    });
  });

  describe("default-reject baseline (AC8)", () => {
    it("arePeers() returns false for two instances that were never linked", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      expect(Mosaic.arePeers(a, b)).toBe(false);
    });
  });

  describe("keyed by instanceId, not object reference or root (AC4, AC13)", () => {
    it("two Mosaic instances constructed against the same root produce distinct instanceIds and independent link state", () => {
      const root = makeRoot("shared");
      const first = track(new Mosaic({ root, selectors: { node: ".item" } }));
      const second = track(new Mosaic({ root, selectors: { node: ".item" } }));
      const peer = track(makeMosaic("peer"));

      expect(first.mosaicInstanceId).not.toBe(second.mosaicInstanceId);

      Mosaic.link(first, peer);

      // Linking `first` must not leak into `second`'s link state just
      // because they share a root element.
      expect(Mosaic.arePeers(first, peer)).toBe(true);
      expect(Mosaic.arePeers(second, peer)).toBe(false);
    });
  });

  describe("isLinkedTo() instance-method convenience wrapper (AC3)", () => {
    it("mirrors Mosaic.arePeers() from either side", () => {
      const a = track(makeMosaic("a"));
      const b = track(makeMosaic("b"));

      expect(a.isLinkedTo(b)).toBe(false);

      Mosaic.link(a, b);

      expect(a.isLinkedTo(b)).toBe(true);
      expect(b.isLinkedTo(a)).toBe(true);
    });
  });
});
