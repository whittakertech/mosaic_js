[@whittakertech/mosaic](../index.md) / DragLifecycleHooks

# Interface: DragLifecycleHooks

Defined in: [drag/lifecycle.ts:16](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L16)

Lifecycle hooks for observing MosaicJS drag behavior.

Each hook is invoked at a specific point in the drag lifecycle
and receives an immutable drag context.

## Remarks

Hooks are invoked in strict alignment with the internal
deterministic state machine.

Invoking a hook in an unexpected state will throw an error.

## Properties

### onDragEnd()?

```ts
optional onDragEnd: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:24](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L24)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`

***

### onDragMove()?

```ts
optional onDragMove: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:18](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L18)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`

***

### onDragStart()?

```ts
optional onDragStart: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:17](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L17)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`

***

### onDropConfirmed()?

```ts
optional onDropConfirmed: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:21](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L21)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`

***

### onDropRejected()?

```ts
optional onDropRejected: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:22](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L22)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`

***

### onPreDrop()?

```ts
optional onPreDrop: (ctx) => void;
```

Defined in: [drag/lifecycle.ts:20](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L20)

#### Parameters

##### ctx

[`DragContext`](DragContext.md)

#### Returns

`void`
