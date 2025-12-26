import { describe, it, expect } from "vitest";
import { DEFAULT_CSS_CLASS_CONTRACT } from "../src/css";

describe("DEFAULT_CSS_CLASS_CONTRACT", () => {
  it("defines all required CSS class keys", () => {
    expect(DEFAULT_CSS_CLASS_CONTRACT).toEqual({
      active: "mosaic--active",
      ghost: "mosaic--ghost",
      dropTarget: "mosaic--drop-target",
      dropAllowed: "mosaic--drop-allowed",
      dropRejected: "mosaic--drop-rejected",
    });
  });

  it("is immutable", () => {
    expect(Object.isFrozen(DEFAULT_CSS_CLASS_CONTRACT)).toBe(true);
  });
});
