export interface ConstraintResult {
  allowed: boolean;
  reason?: string;
}

export function checkConstraints(
  dragged: HTMLElement,
  target: HTMLElement,
  options: MosaicOptions
): ConstraintResult {
  if (dragged === target) {
    return { allowed: false, reason: "self-drop" };
  }

  if (!target.matches(options.selectors.node)) {
    return { allowed: false, reason: "invalid-target" };
  }

  return { allowed: true };
}
