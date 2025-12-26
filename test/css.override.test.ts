import { describe, it, expect } from "vitest";
import { Mosaic } from "../src";
import { DEFAULT_CSS_CLASS_CONTRACT } from "../src/css";

describe("CSS Class Overrides", () => {
  it("uses default CSS classes when no overrides are provided", () => {
    const root = document.createElement("div");

    const mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
    });

    expect(mosaic.cssClasses).toEqual(DEFAULT_CSS_CLASS_CONTRACT);
  });

  it("allows partial overrides while preserving defaults", () => {
    const root = document.createElement("div");

    const mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
      cssClasses: {
        active: "custom-active",
      },
    });

    expect(mosaic.cssClasses.active).toBe("custom-active");

    // untouched defaults remain intact
    Object.keys(DEFAULT_CSS_CLASS_CONTRACT).forEach((key) => {
      if (key !== "active") {
        expect(mosaic.cssClasses[key as keyof typeof DEFAULT_CSS_CLASS_CONTRACT])
          .toBe(DEFAULT_CSS_CLASS_CONTRACT[key as keyof typeof DEFAULT_CSS_CLASS_CONTRACT]);
      }
    });
  });

  it("does not mutate DEFAULT_CSS_CLASS_CONTRACT", () => {
    const root = document.createElement("div");

    new Mosaic({
      root,
      selectors: { node: ".item" },
      cssClasses: {
        active: "mutant",
      },
    });

    expect(DEFAULT_CSS_CLASS_CONTRACT.active).not.toBe("mutant");
  });

  it("freezes cssClasses to prevent runtime mutation", () => {
    const root = document.createElement("div");

    const mosaic = new Mosaic({
      root,
      selectors: { node: ".item" },
      cssClasses: {
        active: "locked",
      },
    });

    expect(Object.isFrozen(mosaic.cssClasses)).toBe(true);

    const original = mosaic.cssClasses.active;

    // Attempt mutation (may fail silently depending on runtime)
    try {
      (mosaic.cssClasses as any).active = "hacked";
    } catch {
      // ignore — strict mode may throw
    }

    // Invariant: value must not change
    expect(mosaic.cssClasses.active).toBe(original);
  });
  it("isolates cssClasses per Mosaic instance", () => {
    const rootA = document.createElement("div");
    const rootB = document.createElement("div");

    const mosaicA = new Mosaic({
      root: rootA,
      selectors: { node: ".item" },
      cssClasses: { active: "a-active" },
    });

    const mosaicB = new Mosaic({
      root: rootB,
      selectors: { node: ".item" },
      cssClasses: { active: "b-active" },
    });

    expect(mosaicA.cssClasses.active).toBe("a-active");
    expect(mosaicB.cssClasses.active).toBe("b-active");
  });
});
