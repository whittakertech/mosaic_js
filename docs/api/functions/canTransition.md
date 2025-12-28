[@whittakertech/mosaic](../index.md) / canTransition

# Function: canTransition()

```ts
function canTransition(from, to): boolean;
```

Defined in: [state.ts:62](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/state.ts#L62)

Determines whether a transition between two lifecycle states is valid.

This function enforces MosaicJS’s deterministic state machine.

## Parameters

### from

[`MosaicState`](../enums/MosaicState.md)

The current lifecycle state

### to

[`MosaicState`](../enums/MosaicState.md)

The proposed next lifecycle state

## Returns

`boolean`

`true` if the transition is permitted, `false` otherwise

## Remarks

Invalid transitions are rejected by `Mosaic.setState` and emit
a `mosaic:error` event.
