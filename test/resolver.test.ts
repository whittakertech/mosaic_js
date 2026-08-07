import { describe, it, expect, beforeEach } from "vitest";
import { resolveTarget } from "../src/drag/resolver";

describe("resolveTarget", () => {
  let root: HTMLElement;
  let active: HTMLElement;
  let nodeB: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div class="item" id="a" data-mosaic-id="a">A</div>
        <div class="item" id="b" data-mosaic-id="b">B</div>
        <div class="zone" id="z">
          <span class="label" id="z-label">drop here</span>
        </div>
      </div>
    `;
    root = document.getElementById("root")!;
    active = document.getElementById("a")!;
    nodeB = document.getElementById("b")!;
  });

  const selectors = { node: ".item" };
  const withZone = { node: ".item", dropTarget: ".zone" };
  const instanceId = "test-instance";

  it("returns null when `from` is null", () => {
    expect(resolveTarget(null, active, root, selectors, instanceId)).toBeNull();
  });

  it("returns null when `from.closest` is not a function", () => {
    const fake = document.createElement("div");
    // @ts-expect-error — deliberately break the closest contract
    fake.closest = undefined;
    expect(resolveTarget(fake, active, root, selectors, instanceId)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    const outsiderInside = document.getElementById("z-label")!;
    expect(resolveTarget(outsiderInside, active, root, selectors, instanceId)).toBeNull();
  });

  it("returns null when the match is outside the root", () => {
    const stray = document.createElement("div");
    stray.className = "item";
    document.body.appendChild(stray);
    expect(resolveTarget(stray, active, root, selectors, instanceId)).toBeNull();
  });

  it("returns null when the match is the active node itself", () => {
    expect(resolveTarget(active, active, root, selectors, instanceId)).toBeNull();
  });

  it("resolves a node target with flat defaults", () => {
    const resolved = resolveTarget(nodeB, active, root, selectors, instanceId);
    expect(resolved).toEqual({
      element: nodeB,
      kind: "node",
      container: root,
      depth: 0,
      group: null,
      ancestors: [],
      instanceId,
    });
  });

  it("resolves an explicit drop target when configured", () => {
    const zone = document.getElementById("z")!;
    const resolved = resolveTarget(zone, active, root, withZone, instanceId);
    expect(resolved?.element).toBe(zone);
    expect(resolved?.kind).toBe("dropTarget");
  });

  it("resolves the innermost drop target from a descendant", () => {
    const label = document.getElementById("z-label")!;
    const zone = document.getElementById("z")!;
    const resolved = resolveTarget(label, active, root, withZone, instanceId);
    expect(resolved?.element).toBe(zone);
    expect(resolved?.kind).toBe("dropTarget");
  });

  it("classifies a node as kind 'node' even when a dropTarget selector is set", () => {
    const resolved = resolveTarget(nodeB, active, root, withZone, instanceId);
    expect(resolved?.kind).toBe("node");
  });
});
