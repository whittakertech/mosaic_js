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
    const result = checkConstraints(dragged, dragged, options);

    expect(result.allowed).toBe(true);
  });

  it("rejects drops on invalid selector", () => {
    const invalidTarget = document.getElementById('c')!;

    const result = checkConstraints(dragged, invalidTarget, options);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("invalid-target");
  });

  it("accepts valid drop", () => {
    const result = checkConstraints(dragged, target, options.selectors);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns reasons for debugging", () => {
    const invalidTarget = document.getElementById('c')!;

    const result = checkConstraints(dragged, invalidTarget, options);

    expect(result).toEqual({
      allowed: false,
      reason: "invalid-target"
    });
  });
});