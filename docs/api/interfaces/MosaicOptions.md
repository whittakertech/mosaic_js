[@whittakertech/mosaic](../index.md) / MosaicOptions

# Interface: MosaicOptions

Defined in: [mosaic.ts:20](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L20)

Configuration options used to construct a Mosaic instance.

MosaicOptions define the DOM scope, selector semantics, styling hooks,
and lifecycle observation points for a Mosaic drag session.

## Remarks

Options are read once at construction time.
Changing values after initialization has no effect.

## Properties

### cssClasses?

```ts
optional cssClasses: Partial<CSSClassContract>;
```

Defined in: [mosaic.ts:75](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L75)

Optional overrides for the default CSS class contract.

Unspecified entries fall back to MosaicJS defaults.

***

### dragLifecycleHooks?

```ts
optional dragLifecycleHooks: DragLifecycleHooks;
```

Defined in: [mosaic.ts:83](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L83)

Optional lifecycle hooks for observing drag behavior.

Hooks are invoked in strict alignment with the internal
deterministic state machine.

***

### root

```ts
root: HTMLElement;
```

Defined in: [mosaic.ts:26](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L26)

The root DOM element managed by MosaicJS.

All draggable nodes must exist within this element.

***

### selectors

```ts
selectors: object;
```

Defined in: [mosaic.ts:32](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L32)

Selector configuration used to identify draggable elements
and related structural roles.

#### children?

```ts
optional children: string;
```

Optional selector identifying child elements within a draggable node.

##### Remarks

This selector is intended for structural clarity and future extensibility.
It is not required for basic drag-and-drop behavior.

#### group?

```ts
optional group: string;
```

Optional selector identifying logical grouping elements.

##### Remarks

Group selectors are reserved for future features such as
grouped or nested drag interactions.
They are not interpreted by MosaicJS in v0.2.

#### handle?

```ts
optional handle: string;
```

Optional selector identifying a drag handle within a node.

##### Remarks

When provided, drag initiation may be restricted to matching
handle elements in future versions.
This selector is currently advisory.

#### node

```ts
node: string;
```

Selector matching draggable nodes.

This selector defines which elements participate in drag operations.
