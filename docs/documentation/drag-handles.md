# Drag Handles

By default, `pointerdown` anywhere on a draggable node starts a drag. A
**handle** restricts that: only a `pointerdown` on (or inside) a specific
descendant element initiates the drag — the rest of the node's surface stops
being a drag trigger, while still moving along with the node once a drag
starts from its handle.

## Configuration

```ts
const mosaic = new Mosaic({
  root: document.getElementById("list"),
  selectors: {
    node: ".item",
    handle: ".drag-handle"
  }
});

mosaic.initialize();
```

```html
<div id="list">
  <div class="item" data-mosaic-id="a">
    <span class="drag-handle">⠿</span>
    <span>Item content — not a drag trigger on its own</span>
  </div>
</div>
```

- `selectors.handle` — the descendant selector that gates drag initiation

When `selectors.handle` is omitted entirely, the whole node remains
draggable — the pre-handle baseline, unchanged.

## Containment Rule

The handle match is resolved via `e.target.closest(selectors.handle)`,
exactly like node/drop-target resolution — so a `pointerdown` on a
descendant of the handle element (not just the handle element itself) still
counts. The real, load-bearing rule is what happens *after* that: the
matched handle must be contained within the already-resolved node
(`node.contains(handleMatch)`). A `selectors.handle` that happens to match
an *ancestor* of the node, or an unrelated element elsewhere on the page,
does not gate the node — the containment check rejects it, and no drag
starts.

```ts
// DragController#pointerDown, roughly:
const node = e.target.closest(selectors.node);
if (!node) return;

if (selectors.handle) {
  const handleMatch = e.target.closest(selectors.handle);
  if (!handleMatch || !node.contains(handleMatch)) return; // no drag
}
```

In practice this means: a `pointerdown` anywhere on the node whose closest
handle match is *not* inside that same node — e.g. it bubbled from a handle
element belonging to a different, unrelated node, or from a handle-shaped
element outside the node's own subtree entirely — never starts a drag.

## Interaction with Groups and Drop Targets

The handle check runs first, before group resolution or any drop-target
logic — a `pointerdown` that fails the handle check never reaches
`activeGroup` resolution or snapshot capture at all. Handles compose freely
with `selectors.group` and `selectors.dropTarget`; none of the three
selectors constrain each other's matching.

## Related

- [Drag Lifecycle](./drag-lifecycle) — where handle resolution fits in the
  `pointerdown` phase, and what happens once a drag actually starts
- [Drop Targets](./drop-targets) — a second selector, resolved independently
  of `selectors.handle`
- [Group Containers](./group-containers) — a third selector, also resolved
  independently
