import { describe, it, expect, beforeEach } from 'vitest'
import { checkConstraints } from '../src/constraints';

describe('Constraints', () => {
  let dragged: HTMLElement;
  let target: HTMLElement;
  let root: HTMLElement;
  let options: any;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div id="a" data-mosaic-id="a" class="item"></div>
        <div id="b" data-mosaic-id="b" class="item"></div>
        <div id="c" class="not-item"></div>
      </div>
    `;

    root = document.getElementById('root')!;
    dragged = document.getElementById('a')!;
    target = document.getElementById('b')!;

    options = { selectors: { node: '.item' } };
  });

  it("permits self drop", () => {
    const result = checkConstraints({
      dragged,
      target: dragged,
      selectors: options.selectors,
    });

    expect(result.allowed).toBe(true);
  });

  it("rejects drops on invalid selector", () => {
    const invalidTarget = document.getElementById('c')!;

    const result = checkConstraints({
      dragged,
      target: invalidTarget,
      selectors: options.selectors,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("invalid-target");
  });

  it("accepts valid drop", () => {
    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("accepts a drop on an explicit drop target", () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="a" data-mosaic-id="a" class="item"></div>
        <div id="zone" class="zone"></div>
      </div>
    `;
    const node = document.getElementById('a')!;
    const zone = document.getElementById('zone')!;

    const result = checkConstraints({
      dragged: node,
      target: zone,
      kind: "dropTarget",
      selectors: { node: '.item', dropTarget: '.zone' },
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("rejects an element matching neither node nor dropTarget", () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="a" data-mosaic-id="a" class="item"></div>
        <div id="other" class="other"></div>
      </div>
    `;
    const node = document.getElementById('a')!;
    const other = document.getElementById('other')!;

    const result = checkConstraints({
      dragged: node,
      target: other,
      selectors: { node: '.item', dropTarget: '.zone' },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("invalid-target");
  });

  it("returns reasons for debugging", () => {
    const invalidTarget = document.getElementById('c')!;

    const result = checkConstraints({
      dragged,
      target: invalidTarget,
      selectors: options.selectors,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "invalid-target",
      metadata: {
        targetSelector: ".item",
        actualElement: invalidTarget,
      },
    });
  });

  it("rejects with circular-nesting when the container is the dragged element itself", () => {
    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
      container: dragged,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "circular-nesting",
      metadata: { ancestorChain: [dragged] },
    });
  });

  it("rejects with circular-nesting when the container is a descendant of the dragged element", () => {
    dragged.appendChild(target);

    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
      container: target,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "circular-nesting",
      metadata: { ancestorChain: [target, dragged] },
    });
  });

  it("treats an omitted depth as 0 against maxNestingDepth", () => {
    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
      maxNestingDepth: 0,
      // depth intentionally omitted — defaults to 0, within the limit.
    });

    expect(result.allowed).toBe(true);
  });

  it("uses the same omitted-depth-defaults-to-0 fallback in nesting-depth-exceeded's own metadata", () => {
    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
      maxNestingDepth: -1,
      // depth intentionally omitted — defaults to 0, which still exceeds -1.
    });

    expect(result).toEqual({
      allowed: false,
      reason: "nesting-depth-exceeded",
      metadata: { depth: 0, maxNestingDepth: -1 },
    });
  });

  it("reports null (not undefined) for whichever side of a group-boundary rejection has no group at all", () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="group" id="g1">
          <div class="item" id="grouped" data-mosaic-id="grouped"></div>
        </div>
        <div class="item" id="ungrouped" data-mosaic-id="ungrouped"></div>
      </div>
    `;
    const grouped = document.getElementById("grouped")!;
    const ungrouped = document.getElementById("ungrouped")!;

    const result = checkConstraints({
      dragged: grouped,
      target: ungrouped,
      selectors: { node: ".item", group: ".group" },
      sourceGroup: document.getElementById("g1")!,
      targetGroup: null,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "group-boundary",
      metadata: { sourceGroupId: "g1", targetGroupId: null },
    });
  });

  it("reports null for sourceGroupId too, when the dragged node's own side has no group", () => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" id="ungrouped" data-mosaic-id="ungrouped"></div>
        <div class="group" id="g2">
          <div class="item" id="grouped" data-mosaic-id="grouped"></div>
        </div>
      </div>
    `;
    const ungrouped = document.getElementById("ungrouped")!;
    const grouped = document.getElementById("grouped")!;

    const result = checkConstraints({
      dragged: ungrouped,
      target: grouped,
      selectors: { node: ".item", group: ".group" },
      sourceGroup: null,
      targetGroup: document.getElementById("g2")!,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "group-boundary",
      metadata: { sourceGroupId: null, targetGroupId: "g2" },
    });
  });

  it("rejects with nesting-depth-exceeded when depth exceeds maxNestingDepth", () => {
    const result = checkConstraints({
      dragged,
      target,
      selectors: options.selectors,
      depth: 2,
      maxNestingDepth: 1,
    });

    expect(result).toEqual({
      allowed: false,
      reason: "nesting-depth-exceeded",
      metadata: { depth: 2, maxNestingDepth: 1 },
    });
  });
});