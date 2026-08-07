import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Mosaic, MosaicState, MOSAIC_TRANSITIONS } from "../src";

describe("RM-19: error reporting for invalid state transitions", () => {
  let mosaic: Mosaic;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("mosaic:error payload", () => {
    beforeEach(() => {
      mosaic = new Mosaic({
        root: document.createElement("div"),
        selectors: { node: ".item" },
      });
    });

    it("includes validTransitions matching MOSAIC_TRANSITIONS[from]", () => {
      let payload: any;
      window.addEventListener("mosaic:error", (e) => {
        payload = (e as CustomEvent).detail;
      });

      // Idle -> Dragging is not a valid transition (must go through
      // PointerDown first).
      mosaic.setState(MosaicState.Dragging);

      expect(payload.validTransitions).toEqual(
        MOSAIC_TRANSITIONS[MosaicState.Idle]
      );
    });

    it("includes all four documented fields with correct types", () => {
      let payload: any;
      window.addEventListener("mosaic:error", (e) => {
        payload = (e as CustomEvent).detail;
      });

      mosaic.setState(MosaicState.Dragging);

      expect(payload.from).toBe(MosaicState.Idle);
      expect(payload.to).toBe(MosaicState.Dragging);
      expect(Array.isArray(payload.validTransitions)).toBe(true);
      expect(typeof payload.timestamp).toBe("number");
    });

    it("does not log to console when debug is not enabled (default)", () => {
      mosaic.setState(MosaicState.Dragging);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("debug mode", () => {
    beforeEach(() => {
      mosaic = new Mosaic({
        root: document.createElement("div"),
        selectors: { node: ".item" },
        debug: true,
      });
    });

    it("logs a structured console.warn with the same information as the event payload", () => {
      mosaic.setState(MosaicState.Dragging);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [, details] = warnSpy.mock.calls[0];
      expect(details).toMatchObject({
        from: MosaicState.Idle,
        to: MosaicState.Dragging,
        validTransitions: MOSAIC_TRANSITIONS[MosaicState.Idle],
      });
      expect(typeof (details as any).timestamp).toBe("number");
    });

    it("does not log on a valid transition", () => {
      mosaic.setState(MosaicState.PointerDown);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
