import { describe, it, expect, vi, beforeEach } from "vitest";
import { Mosaic, MosaicState } from '../src';
import * as events from '../src/events';

describe('Mosaic Transition', () => {
  let mosaic: Mosaic;

  beforeEach(()=>{
    mosaic = new Mosaic({
      root: document.createElement("div"),
      selectors: {
        node: ".item"
      }
    });
  });

  it("transitions from Idle -> PointerDown", () => {
    const result = mosaic.setState(MosaicState.PointerDown);

    expect(result).toBe(true);
  });

  it("rejects invalid transitions", () => {
    const spy = vi.spyOn(events, "emit");
    const result = mosaic.setState(MosaicState.Dragging);

    expect(result).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      "mosaic:error",
      expect.objectContaining({
        type: "invalid-transition"
      })
    );
  });

  it("emits mosaic:state on valid transition", () => {
    const spy = vi.spyOn(events, "emit");

    mosaic.setState(MosaicState.PointerDown);

    expect(spy).toHaveBeenCalledWith(
      "mosaic:state",
      expect.objectContaining({
        from: MosaicState.Idle,
        to: MosaicState.PointerDown,
      })
    );
  });
});
