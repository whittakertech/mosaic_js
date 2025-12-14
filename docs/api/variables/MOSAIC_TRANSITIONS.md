[@whittakertech/mosaic](../index.md) / MOSAIC\_TRANSITIONS

# Variable: MOSAIC\_TRANSITIONS

```ts
const MOSAIC_TRANSITIONS: object;
```

Defined in: [state.ts:28](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/state.ts#L28)

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
