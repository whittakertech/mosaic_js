/**
 * Defines the semantic CSS class contract used by MosaicJS.
 *
 * Each property represents a stable, meaning-based styling hook
 * that may be applied during the drag lifecycle.
 *
 * @remarks
 * MosaicJS does not impose visual styles.
 * These class names are intended to integrate with external
 * design systems or utility frameworks.
 */
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

  /** Applied to the active node's group container during drag (#13) */
  groupActive: string;

  /** Applied to a group container being hovered during cross-group drag (#13) */
  groupHover: string;
}

/**
 * The default semantic CSS class contract used by MosaicJS.
 *
 * This object defines the canonical set of CSS class names applied
 * during the drag lifecycle when no user overrides are provided.
 *
 * @remarks
 * MosaicJS does not ship with visual styles.
 * These class names are intended to be consumed by external
 * design systems, utility frameworks, or application stylesheets.
 *
 * Consumers may override individual entries via {@link MosaicOptions.cssClasses}.
 */
export const DEFAULT_CSS_CLASS_CONTRACT = Object.freeze({
  active: "mosaic--active",
  ghost: "mosaic--ghost",
  dropTarget: "mosaic--drop-target",
  dropAllowed: "mosaic--drop-allowed",
  dropRejected: "mosaic--drop-rejected",
  groupActive: "mosaic--group-active",
  groupHover: "mosaic--group-hover",
} as const satisfies CSSClassContract);
