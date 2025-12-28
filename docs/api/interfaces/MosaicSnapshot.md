[@whittakertech/mosaic](../index.md) / MosaicSnapshot

# Interface: MosaicSnapshot

Defined in: [snapshot.ts:11](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/snapshot.ts#L11)

A structural snapshot of the DOM captured at drag start.

Snapshots allow MosaicJS to restore the DOM to a known-good state
when a drop operation is rejected.

## Remarks

Snapshots capture node identity, parent relationships, and ordering.
They do not clone DOM nodes or capture visual state.

## Properties

### dom

```ts
dom: object[];
```

Defined in: [snapshot.ts:13](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/snapshot.ts#L13)

Serialized DOM position data for tracked nodes.

#### id

```ts
id: string;
```

The node's unique Mosaic identifier.

#### order

```ts
order: number;
```

The node's original index within its parent.

#### parent

```ts
parent: HTMLElement;
```

The node's original parent element.
