# Drop Targets

By default, MosaicJS treats draggable nodes as the only valid places to drop
another node — reordering happens *among* the elements matched by
`selectors.node`. **Explicit drop targets** relax that: an element matching a
separate selector becomes a valid drop destination in its own right, distinct
from the nodes it may come to contain.

## Configuration

```ts
const mosaic = new Mosaic({
  root: document.getElementById("board"),
  selectors: {
    node: ".card",
    dropTarget: ".column"
  }
});

mosaic.initialize();
```

```html
<div id="board">
  <div class="column">
    <div class="card" data-mosaic-id="a">A</div>
  </div>
  <div class="column"></div>
</div>
```

- `selectors.node` — draggable nodes (unchanged meaning)
- `selectors.dropTarget` — elements that are *themselves* valid drop
  destinations, in addition to nodes

When `selectors.dropTarget` is omitted entirely, behavior is identical to the
pre-drop-target baseline: draggable nodes are the only valid drop
destinations. This is the default and requires no configuration.

## Resolution

Both selectors are combined into a single search: MosaicJS walks upward from
whatever element is under the pointer (or under the released `pointerup`
event) looking for the nearest match against `selectors.node` **or**
`selectors.dropTarget`. The resolved match's `kind` — `"node"` or
`"dropTarget"` — is carried on the internal `ResolvedTarget`/`TargetKind`
types and reflected on the public-facing hover event payload as
`targetType`.

```ts
window.addEventListener("mosaic:hover:enter", (e) => {
  const { targetId, targetType, depth } = e.detail;
  // targetType is "node" or "dropTarget"
});
```

A node target reorders among its container's children, same as the
selector-less baseline. A drop-target match reparents the dragged node
*into* it — appended after the drop target's existing children.

## Constraint Enforcement

A drop resolving to an element that matches **neither** `selectors.node` nor
`selectors.dropTarget` is rejected by `checkConstraints()` with reason
`"invalid-target"`. This is the same rejection reason used before drop
targets existed at all — it simply now also considers the `dropTarget`
selector when deciding what counts as valid.

```ts
// checkConstraints(), roughly:
const matchesNode = target.matches(selectors.node);
const matchesDropTarget =
  Boolean(selectors.dropTarget) && target.matches(selectors.dropTarget);

if (!matchesNode && !matchesDropTarget) {
  return { allowed: false, reason: "invalid-target" };
}
```

## Styling

While a valid drop target is hovered, MosaicJS applies the `dropTarget` CSS
class (default `mosaic--drop-target`, overridable via
`MosaicOptions.cssClasses`) to the hovered element. The class is removed the
moment hover moves elsewhere or the drag ends — see the
[CSS Class Contract](./css-contract) for the full override mechanism.

```css
.mosaic--drop-target {
  outline: 2px dashed;
}
```

## Nesting

Drop targets may nest inside other drop targets. Each resolution carries a
`depth` (0 at the root, incrementing per drop-target ancestor) and an
`ancestors` chain, which `MosaicOptions.maxNestingDepth` can cap — a drop
whose resolved depth exceeds the configured limit is rejected with reason
`"nesting-depth-exceeded"`. See [Constraints Design](./constraints-design)
for the full constraint-evaluation picture, including how nesting and group
scoping interact.

## Related

- [Drag Lifecycle](./drag-lifecycle) — where hover/target resolution fits in
  the overall pointer-event flow
- [Group Containers](./group-containers) — a second, independent way to scope
  where a node may be dropped
- [Constraints Design](./constraints-design) — the full set of built-in
  rejection reasons and how user-defined constraints layer on top
