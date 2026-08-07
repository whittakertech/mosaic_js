# Group Containers

Group containers let a set of elements act as an independent drag scope: a
node dragged within its group reorders only among that group's own siblings,
and a drop outside the group is rejected by default.

## Configuration

```ts
const mosaic = new Mosaic({
  root: document.getElementById("board"),
  selectors: {
    node: ".card",
    group: ".lane"
  }
});

mosaic.initialize();
```

```html
<div id="board">
  <div class="lane" id="todo">
    <div class="card" data-mosaic-id="a">A</div>
  </div>
  <div class="lane" id="done">
    <div class="card" data-mosaic-id="b">B</div>
  </div>
</div>
```

- `selectors.group` — elements that scope drag behavior for their
  descendants

When `selectors.group` is omitted entirely, groups have no effect at all —
the whole root behaves as one flat drag scope, the pre-group baseline.

## Scoping Rules

At `pointerdown`, MosaicJS resolves the dragged node's own group container
(its nearest ancestor matching `selectors.group`, bounded by `root`) and
tracks it for the duration of the drag. At drop time, `checkConstraints()`
compares that origin group against the resolved drop target's own group: if
they differ, the drop is rejected with reason `"group-boundary"` — **unless**
`MosaicOptions.crossGroupDrag` is enabled.

```ts
const mosaic = new Mosaic({
  root,
  selectors: { node: ".card", group: ".lane" },
  crossGroupDrag: true // allow nodes to move between lanes
});
```

Two ungrouped nodes (no `selectors.group` configured at all, or a node with
no group ancestor even when it is configured) are treated as belonging to
the same (`null`) group — group-boundary rejection never fires for a Mosaic
that never configured `selectors.group`.

## Cross-Group Hover

With `crossGroupDrag` enabled, MosaicJS tracks which group container is
currently under the pointer independently of the node/drop-target hover
pair, and emits a dedicated pair of events as the pointer crosses group
boundaries:

```ts
window.addEventListener("mosaic:group:enter", (e) => {
  const { groupId } = e.detail; // the entered group's DOM id
});
window.addEventListener("mosaic:group:leave", (e) => {
  const { groupId } = e.detail;
});
```

These fire only for groups *other* than the dragged node's own origin group
— re-entering the group you started in emits neither event.

## Styling

Two CSS classes support group-aware styling (default names, both
overridable via `MosaicOptions.cssClasses`):

| Class | Applied to | When |
|---|---|---|
| `groupActive` (`mosaic--group-active`) | the dragged node's own origin group container | for the duration of the drag |
| `groupHover` (`mosaic--group-hover`) | a non-origin group container | while the pointer is over it, cross-group mode only |

```css
.mosaic--group-active {
  outline: 1px solid;
}
.mosaic--group-hover {
  background: rgba(0, 0, 0, 0.05);
}
```

## Related

- [Drop Targets](./drop-targets) — a second, independent way to scope drag
  destinations; the two combine (a group can contain nested drop targets)
- [Drag Lifecycle](./drag-lifecycle) — the overall pointer-event flow this
  scoping logic runs inside of
- [Constraints Design](./constraints-design) — the full set of built-in
  rejection reasons, including `"group-boundary"`
- [Constraint Scoping Across Groups and Containers](./constraint-scoping) —
  how to register user-defined constraints on top of this page's built-in
  group-boundary check, and how cross-*container* constraints (a separate
  concept — linked `Mosaic` instances, not groups within one instance)
  differ
