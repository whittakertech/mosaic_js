import { describe, it, expect, vi } from "vitest";
import { DragController } from "../src/drag";
import { MosaicState } from "../src";
import type { DragContext } from "../src/drag";

// Minimal Mosaic stub — no DOM, no side effects
const mosaicStub = {
  root: { id: "root" },
  selectors: { node: ".item" },
  cssClasses: { active: "active" },
  getState: vi.fn(),
  setState: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
} as any;

describe("Drag lifecycle hook invariants", () => {
  it("throws when a hook is invoked in an unexpected state", () => {
    const hooks = {
      onDragStart: vi.fn(),
    };

    const controller = new DragController(mosaicStub, hooks);

    // Force an invalid state for onDragStart
    mosaicStub.getState.mockReturnValue(MosaicState.Idle);

    const ctx: DragContext = {
      mosaicRootId: "root",
      activeNodeId: null,
      pointer: { x: 0, y: 0 },
      state: MosaicState.Idle, // ❌ should be PointerDown
      dropTargetId: null,
      hasSnapshot: false,
    };

    expect(() => {
      controller["invokeHook"]("onDragStart", ctx);
    }).toThrowError(
      new Error(`Hook onDragStart invoked in ${MosaicState.Idle}, expected ${MosaicState.PointerDown}.`)
    );
  });
});