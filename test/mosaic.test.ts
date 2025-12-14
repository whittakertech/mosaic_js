import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Mosaic } from "../src/mosaic";
import { MosaicState } from "../src/state";
import * as events from "../src/events";
import * as snapshotModule from "../src/snapshot";

describe("Mosaic", () => {
  let root: HTMLElement;
  let mosaic: Mosaic;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = document.getElementById('root')!;
    mosaic = new Mosaic({ root, selectors: { node: ".item" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  })

  it("emits mosaic:init on initialize()", () => {
    const spy = vi.spyOn(events, "emit");

    mosaic.initialize();

    expect(spy).toHaveBeenCalledWith("mosaic:init");
  });

  it("emits mosaic:destroy on destroy()", () => {
    const spy = vi.spyOn(events, "emit");

    mosaic.destroy();

    expect(spy).toHaveBeenCalledWith("mosaic:destroy");
  });

  it("confirm() clears snapshot and emits mosaic:mutation:confirmed", () => {
    const spy = vi.spyOn(events, "emit");

    // set fake snapshot
    // @ts-ignore accessing private field for test
    mosaic.snapshot = { fake: true };

    mosaic.confirm();

    // snapshot cleared
    // @ts-ignore
    expect(mosaic.snapshot).toBeNull();

    // event emitted
    expect(spy).toHaveBeenCalledWith("mosaic:mutation:confirmed");
  });

  it("reject() restores snapshot and emits rejection + rollback events", () => {
    const restoreSpy = vi.spyOn(snapshotModule, "restoreSnapshot");
    const emitSpy = vi.spyOn(events, "emit");

    // create fake snapshot
    const fakeSnapshot: snapshotModule.MosaicSnapshot = {
      dom: [
        { id: "a", parent: root, order: 0 },
        { id: "b", parent: root, order: 1 }
      ]
    }
    // @ts-ignore
    mosaic.snapshot = fakeSnapshot;

    mosaic.reject();

    expect(restoreSpy).toHaveBeenCalledWith(fakeSnapshot);
    expect(emitSpy).toHaveBeenCalledWith("mosaic:mutation:rejected");
    expect(emitSpy).toHaveBeenCalledWith("mosaic:rollback");
  });

  it("reject() does nothing when no snapshot exists", () => {
    const restoreSpy = vi.spyOn(snapshotModule, "restoreSnapshot");
    const emitSpy = vi.spyOn(events, "emit");

    expect(mosaic.snapshot).toBeNull();

    // snapshot is null, the default
    mosaic.reject();

    expect(restoreSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalledWith("mosaic:mutation:rejected");
    expect(emitSpy).not.toHaveBeenCalledWith("mosaic:rollback");
  });

  it("setState() updates state and emits mosaic:state", () => {
    const emitSpy = vi.spyOn(events, "emit");

    // @ts-ignore private method
    mosaic.setState(MosaicState.PointerDown);
    mosaic.setState(MosaicState.Dragging);

    // @ts-ignore access private field
    expect(mosaic.state).toBe(MosaicState.Dragging);
    expect(emitSpy).toHaveBeenCalledWith(
      "mosaic:state",
      expect.objectContaining({
        from: MosaicState.PointerDown,
        to: MosaicState.Dragging
      })
    );
  });

  it("destroy() emits destroy even if no controller was created", () => {
    const localRoot = document.createElement("div");
    const m = new Mosaic({ root: localRoot, selectors: { node: ".x" } });

    const fn = vi.fn();
    window.addEventListener("mosaic:destroy", fn);

    m.destroy();

    expect(fn).toHaveBeenCalled();
  });

  it("setState() returns early when new state equals current state", () => {
    const fn = vi.fn();
    window.addEventListener("mosaic:state", fn);

    (mosaic as Mosaic).setState(MosaicState.PointerDown);
    expect(fn).toHaveBeenCalledTimes(1);

    (mosaic as Mosaic).setState(MosaicState.PointerDown);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
