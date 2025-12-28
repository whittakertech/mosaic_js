[@whittakertech/mosaic](../index.md) / createSnapshot

# Function: createSnapshot()

```ts
function createSnapshot(root): MosaicSnapshot;
```

Defined in: [snapshot.ts:39](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/snapshot.ts#L39)

Captures a structural snapshot of the current DOM state.

The snapshot is used to guarantee rollback safety if a drop
operation is rejected.

## Parameters

### root

`HTMLElement`

The root element whose children will be tracked

## Returns

[`MosaicSnapshot`](../interfaces/MosaicSnapshot.md)

A [MosaicSnapshot](../interfaces/MosaicSnapshot.md) representing DOM structure

## Remarks

Snapshots are captured automatically by MosaicJS at drag start.
Manual usage is intended for advanced or diagnostic scenarios.
