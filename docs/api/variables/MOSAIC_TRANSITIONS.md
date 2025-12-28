[@whittakertech/mosaic](../index.md) / MOSAIC\_TRANSITIONS

# Variable: MOSAIC\_TRANSITIONS

```ts
const MOSAIC_TRANSITIONS: object;
```

Defined in: [state.ts:38](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L38)

The complete set of valid state transitions for MosaicJS.

This object defines the deterministic finite state machine
governing the drag lifecycle.

## Type Declaration

### destroyed

```ts
readonly destroyed: readonly [] = [];
```

### dragging

```ts
readonly dragging: readonly [Dropping];
```

### dropping

```ts
readonly dropping: readonly [Mutated, RollingBack];
```

### idle

```ts
readonly idle: readonly [PointerDown, Destroyed];
```

### mutated

```ts
readonly mutated: readonly [Idle, RollingBack];
```

### pointerdown

```ts
readonly pointerdown: readonly [Dragging, Idle];
```

### rollback

```ts
readonly rollback: readonly [Idle];
```

## Remarks

This map is intentionally static and non-extensible.
All state transitions must be explicit, observable, and testable.
