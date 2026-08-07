import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic } from "../src";
import { checkConstraints } from "../src/constraints";
import type { ConstraintResult } from "../src/constraints";

function setupTwoGroups() {
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
  return document.getElementById("root")!;
}

function setupSingle() {
  document.body.innerHTML = `
    <div id="root">
      <div class="item" id="a" data-mosaic-id="a">A</div>
      <div class="item" id="b" data-mosaic-id="b">B</div>
    </div>
  `;
  return document.getElementById("root")!;
}

function startAndDropOn(a: HTMLElement, target: HTMLElement) {
  a.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  document.elementFromPoint = () => null;
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true })
  );
  target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
}

describe("RM-22: constraint failure metadata for diagnostics", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("built-in rejection metadata, all four real reason strings (AC2, AC8)", () => {
    it("group-boundary carries sourceGroupId/targetGroupId as DOM-id strings, not element references", () => {
      root = setupTwoGroups();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, c);

      expect(payload).toEqual({
        allowed: false,
        reason: "group-boundary",
        metadata: { sourceGroupId: "g1", targetGroupId: "g2" },
      });
    });

    it("invalid-target carries targetSelector and the actual failing element", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="other" id="x">not a node</div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const x = document.getElementById("x")!;

      // resolveTarget's own closest-search returns null for a non-matching
      // target with no matching ancestors, which falls back to a self-drop
      // (always allowed) — so to exercise checkConstraints' own
      // invalid-target branch directly (this is what this AC is really
      // about: the metadata shape checkConstraints produces), call it
      // directly rather than through the full pointerUp resolution path.
      const result: ConstraintResult = checkConstraints({
        dragged: a,
        target: x,
        selectors: { node: ".item" },
      });

      expect(result).toEqual({
        allowed: false,
        reason: "invalid-target",
        metadata: { targetSelector: ".item", actualElement: x },
      });
    });

    it("circular-nesting carries the ancestorChain from container up to the dragged node", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="zone" id="a" data-mosaic-id="a">
            <div class="zone" id="child" data-mosaic-id="child">child</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".zone", dropTarget: ".zone" },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const child = document.getElementById("child")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, child);

      expect(payload.reason).toBe("circular-nesting");
      expect(payload.metadata.ancestorChain).toEqual([child, a]);
    });

    it("nesting-depth-exceeded carries depth and maxNestingDepth", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="outer">
            <div class="zone" id="inner">deep</div>
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
      const inner = document.getElementById("inner")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, inner);

      expect(payload).toEqual({
        allowed: false,
        reason: "nesting-depth-exceeded",
        metadata: { depth: 1, maxNestingDepth: 0 },
      });
    });
  });

  describe("user constraint metadata pass-through (AC3, AC9)", () => {
    it("a user constraint's own reason and metadata reach mosaic:mutation:rejected unchanged", () => {
      root = setupSingle();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [
          () => ({
            allowed: false,
            reason: "custom-business-rule",
            metadata: { userId: 42, ruleName: "no-weekday-drops" },
          }),
        ],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, b);

      expect(payload).toEqual({
        allowed: false,
        reason: "custom-business-rule",
        metadata: { userId: 42, ruleName: "no-weekday-drops" },
      });
    });
  });

  describe("mosaic:mutation:confirmed constraintsEvaluated (AC5, AC10)", () => {
    it("counts exactly one built-in evaluation for a simple confirmed drop", () => {
      root = setupSingle();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:confirmed", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, b);

      expect(payload).toEqual({ constraintsEvaluated: 1 });
    });

    it("counts built-in + every registered user constraint that ran", () => {
      root = setupSingle();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [
          () => ({ allowed: true }),
          () => ({ allowed: true }),
          () => ({ allowed: true }),
        ],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:confirmed", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, b);

      expect(payload).toEqual({ constraintsEvaluated: 4 });
    });

    it("counts every bubble-up ancestor attempt on a rescued nested drop", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="outer">
            <div class="zone" id="inner">deep</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone" },
        maxNestingDepth: 0,
        bubbleConstraints: true,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const inner = document.getElementById("inner")!;
      let payload: any;
      window.addEventListener("mosaic:mutation:confirmed", (e) => {
        payload = (e as CustomEvent).detail;
      });

      startAndDropOn(a, inner);

      // 1 for the original (rejected, depth 1) + 1 for the ancestor
      // `outer` (accepted, depth 0) = 2.
      expect(payload).toEqual({ constraintsEvaluated: 2 });
    });
  });

  describe("backward compatibility (AC6, AC7, AC11)", () => {
    it("omitting metadata from a returned ConstraintResult does not error", () => {
      root = setupSingle();
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [() => ({ allowed: false, reason: "no-metadata-here" })],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      expect(() => startAndDropOn(a, b)).not.toThrow();
      expect(rollback).toHaveBeenCalledTimes(1);
    });

    it("Mosaic.confirm() called directly with no args preserves the exact pre-#22 no-payload emission", () => {
      root = setupSingle();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.snapshot = { dom: [] };

      let detail: any;
      window.addEventListener("mosaic:mutation:confirmed", (e) => {
        detail = (e as CustomEvent).detail;
      });

      mosaic.confirm();

      // No second `emit()` argument at all → CustomEvent.detail is null,
      // matching the exact pre-#22 shape (not `{}` or `undefined` wrapped).
      expect(detail).toBeNull();
    });

    it("Mosaic.reject() called directly with no args preserves the exact pre-#22 no-payload emission", () => {
      root = setupSingle();
      mosaic = new Mosaic({ root, selectors: { node: ".item" } });
      mosaic.snapshot = { dom: [] };

      let detail: any;
      window.addEventListener("mosaic:mutation:rejected", (e) => {
        detail = (e as CustomEvent).detail;
      });

      mosaic.reject();

      expect(detail).toBeNull();
    });
  });
});
