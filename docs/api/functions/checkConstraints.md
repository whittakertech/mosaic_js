[@whittakertech/mosaic](../index.md) / checkConstraints

# Function: checkConstraints()

```ts
function checkConstraints(
   dragged, 
   target, 
   selectors): ConstraintResult;
```

Defined in: [constraints.ts:46](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/constraints.ts#L46)

Evaluates whether a drop operation is permitted.

This function applies MosaicJS’s built-in, deterministic constraints
to a proposed drag-and-drop interaction.

## Parameters

### dragged

`HTMLElement`

The element being dragged

### target

`HTMLElement`

The proposed drop target

### selectors

The active selector configuration

#### children?

`string`

Optional selector identifying child elements within a draggable node.

**Remarks**

This selector is intended for structural clarity and future extensibility.
It is not required for basic drag-and-drop behavior.

#### group?

`string`

Optional selector identifying logical grouping elements.

**Remarks**

Group selectors are reserved for future features such as
grouped or nested drag interactions.
They are not interpreted by MosaicJS in v0.2.

#### handle?

`string`

Optional selector identifying a drag handle within a node.

**Remarks**

When provided, drag initiation may be restricted to matching
handle elements in future versions.
This selector is currently advisory.

#### node

`string`

Selector matching draggable nodes.

This selector defines which elements participate in drag operations.

## Returns

[`ConstraintResult`](../interfaces/ConstraintResult.md)

A [ConstraintResult](../interfaces/ConstraintResult.md) indicating whether the drop is allowed

## Remarks

Constraint evaluation is synchronous and side-effect free.
Custom or user-defined constraints are not supported in v0.2.
