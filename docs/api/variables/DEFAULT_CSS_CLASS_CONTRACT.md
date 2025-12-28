[@whittakertech/mosaic](../index.md) / DEFAULT\_CSS\_CLASS\_CONTRACT

# Variable: DEFAULT\_CSS\_CLASS\_CONTRACT

```ts
const DEFAULT_CSS_CLASS_CONTRACT: Readonly<{
  active: "mosaic--active";
  dropAllowed: "mosaic--drop-allowed";
  dropRejected: "mosaic--drop-rejected";
  dropTarget: "mosaic--drop-target";
  ghost: "mosaic--ghost";
}>;
```

Defined in: [css/contract.ts:42](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L42)

The default semantic CSS class contract used by MosaicJS.

This object defines the canonical set of CSS class names applied
during the drag lifecycle when no user overrides are provided.

## Remarks

MosaicJS does not ship with visual styles.
These class names are intended to be consumed by external
design systems, utility frameworks, or application stylesheets.

Consumers may override individual entries via [MosaicOptions.cssClasses](../interfaces/MosaicOptions.md#cssclasses).
