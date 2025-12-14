import type { MosaicOptions } from "./mosaic";

export interface ConstraintResult {
  allowed: boolean;
  reason?: string;
}

export function checkConstraints(
  dragged: HTMLElement,
  target: HTMLElement,
  selectors: MosaicOptions["selectors"]
): ConstraintResult {
  if (dragged === target) {
    return { allowed: true };
  }

  if (!target.matches(selectors.node)) {
    return { allowed: false, reason: "invalid-target" };
  }

  return { allowed: true };
}
