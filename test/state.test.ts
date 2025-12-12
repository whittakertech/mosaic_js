import { describe, it, expect } from 'vitest'
import { MosaicState, MOSAIC_TRANSITIONS } from "../src";

describe('MosaicState transitions', () => {
  it("allows Idle -> PointerDown", () => {
    expect(MOSAIC_TRANSITIONS[MosaicState.Idle])
      .toContain(MosaicState.PointerDown)
  })

  it("disallows Idle -> Dragging", () => {
    expect(MOSAIC_TRANSITIONS[MosaicState.Idle])
      .not.toContain(MosaicState.Dragging)
  })

  it("has no transitions from Destroyed", () => {
    expect(MOSAIC_TRANSITIONS[MosaicState.Destroyed]).toEqual([])
  })
})
