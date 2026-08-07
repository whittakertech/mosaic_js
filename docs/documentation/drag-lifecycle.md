# Drag Lifecycle

MosaicJS implements a **deterministic, state-driven drag lifecycle**.  
Pointer events (`pointerdown`, `pointermove`, `pointerup`) act as **inputs** that advance the lifecycle, but they are **not** the lifecycle itself.

All drag behavior is governed by explicit state transitions that are observable, testable, and guaranteed.

## Drag State Machine

```mermaid
<!--@include: ./_generated/drag-state-machine.mmd-->
```

> <small>*Diagram generated from* `src/state.ts` *and rendered via MermaidJS*</small>

## Lifecycle Hooks

MosaicJS exposes **optional lifecycle hooks** that allow external systems to observe drag behavior **without mutating engine state**.

Hooks are invoked synchronously at specific, guaranteed points in the lifecycle.

<!--@include: ./_generated/drag-hook-table.md-->

### Example Usage

```html
<div id="root">
  <div class="item" data-mosaic-id="a" id="item-a">A</div>
  <div class="item" data-mosaic-id="b" id="item-b">B</div>
</div>

<script>
  const mosaic = new Mosaic({
    root: document.getElementById("root"),
    selectors: { node: ".item" },
    dragLifecycleHooks: {
      onDragEnd: () => {
        console.log("The drag operation has completed.");
      }
    }
  });

  mosaic.initialize();
</script>
```

Lifecycle hooks are intended for **observation and side effects** such as
analytics, logging, or UI feedback.   
Hooks **must not** manipulate the state machine or trigger additional drag operations.

## PointerDown Phase

Triggered by a valid `pointerdown` event on a draggable node.

```ts
pointerDown(e) {
  this.activeNode = node;
  this.mosaic.snapshot = createSnapshot(root);
  this.mosaic.setState(MosaicState.PointerDown);
}
```

**Responsibilities:**
- Identify and lock the active node
- If `selectors.handle` is configured, gate initiation to a `pointerdown`
  within that handle — see [Drag Handles](./drag-handles)
- Capture a snapshot of the current DOM order
- Transition the engine to `PointerDown`

## Dragging Phase

- The active node follows pointer movement
- Potential drop targets are computed internally — see
  [Drop Targets](./drop-targets) and [Group Containers](./group-containers)
  for the two selectors that scope this resolution
- The lifecycle transitions to and remains in `Dragging`

This phase may repeat many times during a single drag operation.

## Dropping Phase

Triggered by `pointerup`.

```ts
const result = checkConstraints(dragged, target, options);
```

- If constraints **pass**, Mosaic commits the mutation and clears the snapshot
- If constraints **fail**, Mosaic restores the snapshot via `restoreSnapshot()`

In both cases, cleanup is guaranteed and the lifecycle proceeds toward `Idle`.

## Guarantees

MosaicJS guarantees:

- Deterministic, explicit drag lifecycle transitions
- Snapshot rollback for all rejected drops
- Read-only lifecycle context for external observers
- Guaranteed cleanup and return to `Idle`
- External hooks cannot mutate engine state

MosaicJS intentionally does **not** guarantee:

- Styling, animation, or visual transitions
- Framework-specific integration behavior
- Accessibility semantics
- Business logic, persistence, or side effects