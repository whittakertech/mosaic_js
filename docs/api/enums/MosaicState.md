[@whittakertech/mosaic](../index.md) / MosaicState

# Enumeration: MosaicState

Defined in: [state.ts:5](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L5)

Represents the current interaction lifecycle state of a MosaicJS instance.
States are mutually exclusive and transition deterministically.

## Enumeration Members

### Destroyed

```ts
Destroyed: "destroyed";
```

Defined in: [state.ts:25](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L25)

Instance has been destroyed and will not process further events

***

### Dragging

```ts
Dragging: "dragging";
```

Defined in: [state.ts:13](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L13)

Active drag operation in progress

***

### Dropping

```ts
Dropping: "dropping";
```

Defined in: [state.ts:16](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L16)

Pointer released; evaluating constraints

***

### Idle

```ts
Idle: "idle";
```

Defined in: [state.ts:7](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L7)

No active interaction

***

### Mutated

```ts
Mutated: "mutated";
```

Defined in: [state.ts:19](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L19)

A mutation has been applied and is awaiting confirmation

***

### PointerDown

```ts
PointerDown: "pointerdown";
```

Defined in: [state.ts:10](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L10)

Pointer is down but no drag threshold has been exceeded

***

### RollingBack

```ts
RollingBack: "rollback";
```

Defined in: [state.ts:22](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L22)

Restoring the previous state after a rejected mutation
