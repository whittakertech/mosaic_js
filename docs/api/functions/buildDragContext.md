[@whittakertech/mosaic](../index.md) / buildDragContext

# Function: buildDragContext()

```ts
function buildDragContext(params): DragContext;
```

Defined in: [drag/context.ts:60](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L60)

Constructs an immutable [DragContext](../interfaces/DragContext.md) from internal drag state.

This function is used by MosaicJS to create the context object
passed to lifecycle hooks and emitted with drag-related events.

## Parameters

### params

Internal drag state used to populate the context

#### activeNodeId

`string` \| `null`

#### dropTargetId

`string` \| `null`

#### hasSnapshot

`boolean`

#### mosaicRootId

`string`

#### pointer

\{
  `x`: `number`;
  `y`: `number`;
\}

#### pointer.x

`number`

#### pointer.y

`number`

#### state

[`MosaicState`](../enums/MosaicState.md)

## Returns

[`DragContext`](../interfaces/DragContext.md)

A frozen [DragContext](../interfaces/DragContext.md) representing the current drag state

## Remarks

- The returned object is frozen and must not be mutated.
- The context represents a snapshot in time, not a live reference.

While exported as part of the public API, this function is primarily
intended for internal use and advanced tooling.
