[@whittakertech/mosaic](../index.md) / restoreSnapshot

# Function: restoreSnapshot()

```ts
function restoreSnapshot(snapshot): void;
```

Defined in: [snapshot.ts:62](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/snapshot.ts#L62)

Restores the DOM to a previously captured snapshot state.

This function reorders existing DOM nodes to match the snapshot.

## Parameters

### snapshot

A snapshot previously returned by [createSnapshot](createSnapshot.md)

[`MosaicSnapshot`](../interfaces/MosaicSnapshot.md) | `null` | `undefined`

## Returns

`void`

## Remarks

If the snapshot is invalid or incomplete, restoration is a no-op.
This function does not recreate or remove DOM nodes.
