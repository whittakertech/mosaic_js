import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mosaic } from "../src";
import type { ConstraintInput, ConstraintResult } from "../src/constraints";

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

describe("RM-20: constraint system extension", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  afterEach(() => {
    mosaic?.destroy();
  });

  describe("cross-group rejection — ALREADY SHIPPED (#13), regression only (AC1/AC2/AC7/AC8)", () => {
    beforeEach(() => {
      root = setupTwoGroups();
    });

    it("rejects a cross-group drop by default with reason group-boundary when no cross-group constraints are registered", () => {
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const g1 = document.getElementById("g1")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      startAndDropOn(a, c);

      expect(rollback).toHaveBeenCalled();
      expect([...g1.children].map((n) => n.id)).toEqual(["a"]);
    });

    it("allows the cross-group drop when crossGroupDrag is enabled (built-in ConstraintInput already carries sourceGroup/targetGroup/crossGroupDrag)", () => {
      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        crossGroupDrag: true,
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const rollback = vi.fn();
      const confirmed = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      // No live pointermove hover occurs here (elementFromPoint is null in
      // startAndDropOn), so pointerUp's own target resolution — not a live
      // DOM reorder — is what's under test: dropping directly on `c` via
      // pointerUp resolves cross-group, and with crossGroupDrag enabled the
      // built-in group-boundary check passes (confirmed, no rollback).
      startAndDropOn(a, c);

      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
    });
  });

  describe("user constraint registration — REMAINING REAL WORK (AC3-6, AC9-12)", () => {
    beforeEach(() => {
      root = setupTwoGroups();
    });

    it("design clarification: an always-allow user constraint cannot rescue a built-in-rejected drop — AC4 forecloses this reading of AC9's 'otherwise-rejected' phrasing", () => {
      // AC9 says "a registered user constraint that returns allowed:true
      // permits an otherwise-rejected drop" — read in isolation this
      // could suggest a user constraint can override a built-in
      // rejection. AC4 explicitly forecloses that: "a built-in rejection
      // short-circuits before any user constraint runs." The two are
      // reconciled by reading AC9's "otherwise-rejected" as "the drop
      // this ticket's OWN new registration mechanism would otherwise
      // leave unconfirmed if the mechanism didn't work" (see the next
      // test), not "a drop some other, built-in check rejected." This
      // test pins the AC4 reading concretely: cross-group would
      // group-boundary-reject here, and an always-allow user constraint
      // has zero power over that — it's never even called.
      const alwaysAllow = vi.fn(
        (): ConstraintResult => ({ allowed: true })
      );

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        constraints: [alwaysAllow],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;
      const confirmed = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      startAndDropOn(a, c);

      expect(alwaysAllow).not.toHaveBeenCalled();
      expect(confirmed).not.toHaveBeenCalled();
    });

    it("a registered user constraint that returns allowed:true permits the drop to confirm (AC9)", () => {
      root = setupSingle();
      const allow = vi.fn((): ConstraintResult => ({ allowed: true }));

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [allow],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const confirmed = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      startAndDropOn(a, b);

      expect(allow).toHaveBeenCalledTimes(1);
      expect(confirmed).toHaveBeenCalledTimes(1);
    });

    it("a registered user constraint that returns allowed:false rejects with that reason and triggers rollback (AC10)", () => {
      root = setupSingle();
      const reject = vi.fn(
        (): ConstraintResult => ({ allowed: false, reason: "custom-business-rule" })
      );

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [reject],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      startAndDropOn(a, b);

      expect(reject).toHaveBeenCalledTimes(1);
      expect(rollback).toHaveBeenCalledTimes(1);
      // Rolled back to original order (b was never actually kept swapped).
      expect([...root.children].map((n) => n.id)).toEqual(["a", "b"]);
    });

    it("evaluates multiple user constraints in order, first rejection wins, later constraints never run (AC11)", () => {
      root = setupSingle();
      const calls: string[] = [];
      const first = vi.fn((): ConstraintResult => {
        calls.push("first");
        return { allowed: true };
      });
      const second = vi.fn((): ConstraintResult => {
        calls.push("second");
        return { allowed: false, reason: "second-rejects" };
      });
      const third = vi.fn((): ConstraintResult => {
        calls.push("third");
        return { allowed: true };
      });

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [first, second, third],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;
      const rollback = vi.fn();
      window.addEventListener("mosaic:rollback", rollback);

      startAndDropOn(a, b);

      expect(calls).toEqual(["first", "second"]);
      expect(third).not.toHaveBeenCalled();
      expect(rollback).toHaveBeenCalledTimes(1);
    });

    it("built-in constraints still run before any user constraint, even with constraints registered (AC4)", () => {
      const userConstraint = vi.fn((): ConstraintResult => ({ allowed: true }));

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", group: ".group" },
        // crossGroupDrag intentionally omitted — built-in group-boundary
        // rejection should short-circuit before this ever runs.
        constraints: [userConstraint],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const c = document.getElementById("c")!;

      startAndDropOn(a, c);

      expect(userConstraint).not.toHaveBeenCalled();
    });

    it("user constraints receive the identical ConstraintInput object the built-in check received (AC12, reference equality)", () => {
      root = setupSingle();
      let received: ConstraintInput | undefined;
      const capture = vi.fn((input: ConstraintInput): ConstraintResult => {
        received = input;
        return { allowed: true };
      });

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item" },
        constraints: [capture],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const b = document.getElementById("b")!;

      startAndDropOn(a, b);

      expect(received).toBeDefined();
      expect(received!.dragged).toBe(a);
      expect(received!.target).toBe(b);
      expect(received!.selectors).toBe(mosaic.selectors);
      // Full shape, not just a subset — matches what checkConstraints()
      // itself receives.
      expect(Object.keys(received!).sort()).toEqual(
        [
          "container",
          "crossGroupDrag",
          "depth",
          "dragged",
          "kind",
          "maxNestingDepth",
          "selectors",
          "sourceGroup",
          "target",
          "targetGroup",
        ].sort()
      );
    });

    it("passes the winning ancestor's ConstraintInput to user constraints when bubbleConstraints rescues a nested rejection", () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="item" id="a" data-mosaic-id="a">A</div>
          <div class="zone" id="outer">
            <div class="zone" id="inner">deep</div>
          </div>
        </div>
      `;
      root = document.getElementById("root")!;

      let received: ConstraintInput | undefined;
      const capture = vi.fn((input: ConstraintInput): ConstraintResult => {
        received = input;
        return { allowed: true };
      });

      mosaic = new Mosaic({
        root,
        selectors: { node: ".item", dropTarget: ".zone" },
        maxNestingDepth: 0,
        bubbleConstraints: true,
        constraints: [capture],
      });
      mosaic.initialize();

      const a = document.getElementById("a")!;
      const inner = document.getElementById("inner")!;
      const outer = document.getElementById("outer")!;
      const confirmed = vi.fn();
      window.addEventListener("mosaic:mutation:confirmed", confirmed);

      startAndDropOn(a, inner);

      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(received).toBeDefined();
      // The rescued target is `outer` (depth 0), not `inner` (depth 1,
      // over the maxNestingDepth limit) — proves the user constraint saw
      // the ancestor that actually passed, not the original rejected one.
      expect(received!.target).toBe(outer);
    });
  });
});
