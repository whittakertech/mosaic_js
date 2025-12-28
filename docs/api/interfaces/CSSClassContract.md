[@whittakertech/mosaic](../index.md) / CSSClassContract

# Interface: CSSClassContract

Defined in: [css/contract.ts:12](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L12)

Defines the semantic CSS class contract used by MosaicJS.

Each property represents a stable, meaning-based styling hook
that may be applied during the drag lifecycle.

## Remarks

MosaicJS does not impose visual styles.
These class names are intended to integrate with external
design systems or utility frameworks.

## Properties

### active

```ts
active: string;
```

Defined in: [css/contract.ts:14](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L14)

Applied to the element currently being dragged

***

### dropAllowed

```ts
dropAllowed: string;
```

Defined in: [css/contract.ts:23](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L23)

Applied when a drop is allowed

***

### dropRejected

```ts
dropRejected: string;
```

Defined in: [css/contract.ts:26](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L26)

Applied when a drop is rejected

***

### dropTarget

```ts
dropTarget: string;
```

Defined in: [css/contract.ts:20](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L20)

Applied to valid drop targets

***

### ghost

```ts
ghost: string;
```

Defined in: [css/contract.ts:17](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/css/contract.ts#L17)

Applied to the ghost/clone element
