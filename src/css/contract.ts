export interface CSSClassContract {
  /** Applied to the element currently being dragged */
  active: string;

  /** Applied to the ghost/clone element */
  ghost: string;

  /** Applied to valid drop targets */
  dropTarget: string;

  /** Applied when a drop is allowed */
  dropAllowed: string;

  /** Applied when a drop is rejected */
  dropRejected: string;
}

export const DEFAULT_CSS_CLASS_CONTRACT = Object.freeze({
  active: "mosaic--active",
  ghost: "mosaic--ghost",
  dropTarget: "mosaic--drop-target",
  dropAllowed: "mosaic--drop-allowed",
  dropRejected: "mosaic--drop-rejected",
} as const satisfies CSSClassContract);
