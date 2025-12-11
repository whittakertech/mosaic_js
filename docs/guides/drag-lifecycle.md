# Drag Lifecycle (v0.2 Preview)

Drag behavior in Mosaic follows a predictable progression:

1. **pointerdown** → capture active node + create snapshot
2. **pointermove** → update hover target + set state
3. **pointerup** → evaluate constraints & commit or rollback

---

## Mermaid Diagram: Drag State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> PointerDown: pointerdown
    PointerDown --> Dragging: pointermove
    Dragging --> Hovering: over new target
    Hovering --> Dragging: move away
    Dragging --> Dropping: pointerup
    Dropping --> Pending: constraints pass
    Pending --> Idle: confirm()
    Dropping --> RollingBack: constraints fail
    RollingBack --> Idle: reject()
```

---

## PointerDown Phase

```ts
pointerDown(e) {
  this.activeNode = node;
  this.mosaic.snapshot = createSnapshot(root);
  this.mosaic.setState(MosaicState.PointerDown);
}
```

---

## Dragging Phase

- Node moves under pointer
- Hover target is computed (v0.2)
- State transitions to `Dragging`

---

## Dropping Phase

```ts
const result = checkConstraints(dragged, target, options);
```

- If `allowed`, Mosaic commits mutation and clears snapshot
- If rejected, Mosaic rolls back via `restoreSnapshot()`

---

## Guarantees

- Every invalid drag leads to rollback
- State transitions are deterministic
- Drag logic remains fully testable  