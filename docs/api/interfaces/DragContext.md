[@whittakertech/mosaic](../index.md) / DragContext

# Interface: DragContext

Defined in: [drag/context.ts:20](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L20)

Immutable context object describing the current drag operation.

A `DragContext` provides a stable, serializable view of MosaicJS’s
internal drag state at a specific moment in time.

It is passed to lifecycle hooks and emitted with relevant events
to allow external systems to observe drag behavior safely.

## Remarks

- A DragContext is **read-only** and **frozen** at creation time.
- It represents a snapshot of state, not a live reference.
- Consumers must not attempt to mutate or persist this object.

The shape of DragContext is considered part of MosaicJS’s
stable public API.

## Properties

### activeNodeId

```ts
readonly activeNodeId: string | null;
```

Defined in: [drag/context.ts:25](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L25)

Currently dragged node ID, or null when idle

***

### dropTargetId

```ts
readonly dropTargetId: string | null;
```

Defined in: [drag/context.ts:28](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L28)

Resolved drop target node ID, or null when none

***

### hasSnapshot

```ts
readonly hasSnapshot: boolean;
```

Defined in: [drag/context.ts:40](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L40)

Whether a drag snapshot currently exists

***

### mosaicRootId

```ts
readonly mosaicRootId: string;
```

Defined in: [drag/context.ts:22](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L22)

Root Mosaic instance identifier

***

### pointer

```ts
readonly pointer: object;
```

Defined in: [drag/context.ts:31](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L31)

Pointer position at time of emission

#### x

```ts
readonly x: number;
```

#### y

```ts
readonly y: number;
```

***

### state

```ts
readonly state: MosaicState;
```

Defined in: [drag/context.ts:37](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/context.ts#L37)

Current Mosaic drag lifecycle state
