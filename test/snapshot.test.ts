import { describe, it, expect, beforeEach } from "vitest";
import { createSnapshot, restoreSnapshot, MosaicSnapshot } from "../src/snapshot";

describe("snapshot", () => {
  let root: HTMLElement;
  let a: HTMLElement;
  let b: HTMLElement;
  let c: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <div data-mosaic-id="a">A</div>
        <div data-mosaic-id="b">B</div>
        <div data-mosaic-id="c">C</div>
      </div>
    `;
    root = document.getElementById("root")!;
    a = root.querySelector('[data-mosaic-id="a"]')!;
    b = root.querySelector('[data-mosaic-id="b"]')!;
    c = root.querySelector('[data-mosaic-id="c"]')!;
  });

  it("captures order correctly", () => {
    const snapshot = createSnapshot(root);
    const arr = ["a", "b", "c"]

    expect(snapshot.dom.length).toBe(3);

    arr.forEach((id, i) => {
      expect(snapshot.dom[i].id).toBe(id);
      expect(snapshot.dom[i].order).toBe(i);
    })
  });

  it("restores previous order", () => {
    const snapshot = createSnapshot(root);

    root.innerHTML = "";
    root.appendChild(c);
    root.appendChild(a);
    root.appendChild(b);

    expect([...root.children].map(el => el.getAttribute("data-mosaic-id")))
      .toEqual(["c", "a", "b"]);

    restoreSnapshot(snapshot);

    expect([...root.children].map(el => el.getAttribute("data-mosaic-id")))
      .toEqual(["a", "b", "c"]);
  });

  it("does nothing if element IDs change", () => {
    const snapshot = createSnapshot(root);

    b.remove();

    restoreSnapshot(snapshot);

    expect([...root.children].map(el => el.getAttribute("data-mosaic-id")))
      .toEqual(["a", "c"]);
  });

  it("does nothing on null snapshot", () => {
    expect(() => restoreSnapshot(null)).not.toThrow();

    expect([...root.children].map(el => el.getAttribute("data-mosaic-id")))
      .toEqual(["a", "b", "c"]);
  });
});