[@whittakertech/mosaic](../index.md) / ConstraintResult

# Interface: ConstraintResult

Defined in: [constraints.ts:15](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/constraints.ts#L15)

The result of evaluating a drag-and-drop constraint.

A `ConstraintResult` represents a deterministic decision about whether
a proposed drop operation is allowed.

## Remarks

Constraint evaluation in MosaicJS is synchronous, pure, and side-effect free.
A rejected result will trigger rollback behavior if a snapshot is present.

Consumers should treat `reason` as diagnostic metadata only.

## Properties

### allowed

```ts
allowed: boolean;
```

Defined in: [constraints.ts:19](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/constraints.ts#L19)

Whether the drop operation is permitted.

***

### reason?

```ts
optional reason: string;
```

Defined in: [constraints.ts:27](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/constraints.ts#L27)

Optional machine-readable reason for rejection.

This value is not interpreted by MosaicJS internally, but may be
surfaced through events or logs for debugging purposes.
