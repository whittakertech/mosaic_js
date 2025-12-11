# Mosaic
**An event-driven, snapshot-based drag-and-drop engine for the modern web.**

Mosaic is a lightweight TypeScript library designed for precise, reversible, constraint-aware drag-and-drop interactions.  
It belongs to the WhittakerTech ecosystem, but works anywhere the DOM exists.

- Snapshot + rollback system
- Constraint-driven validation
- Simple, testable state machine
- Unified event API
- 100% test coverage
- Framework-agnostic (DOM, React, Vue, Web Components)

---

## Installation

```bash
npm install @whittakertech/mosaic
```

---

## Quick Start

```ts
import { Mosaic } from "@whittakertech/mosaic";

const mosaic = new Mosaic({
  root: document.getElementById("root")!,
  selectors: { node: ".item" }
});

mosaic.initialize();
```

Mosaic will:

1. capture a DOM snapshot on drag start
2. evaluate constraints on drop
3. rollback automatically when invalid
4. broadcast all lifecycle events

---

## Core Concepts

### Snapshot System
Mosaic guarantees DOM safety via:

```ts
createSnapshot(root)
restoreSnapshot(snapshot)
```

Invalid drags always restore the previous state.

### Constraints System

```ts
const result = checkConstraints(dragged, target, options)
```

Built-in rules:

- no self-drop
- selector mismatch prevention

### Events Layer

Events are dispatched through:

```ts
emit("mosaic:state", { state: "dragging" })
```

Available events:

- `mosaic:init`
- `mosaic:destroy`
- `mosaic:state`
- `mosaic:mutation:confirmed`
- `mosaic:mutation:rejected`
- `mosaic:rollback`

### State Machine

`MosaicState` expresses all phases of drag behavior:

- `idle`
- `pointerdown`
- `dragging`
- `hovering`
- `dropping`
- `pending`
- `rollback`

---

## Documentation

Full documentation is available in the `/docs` directory.

Sections include:

- Getting Started
- API Reference
- Architecture
- Snapshot Flow
- Constraints Design
- Drag Lifecycle (v0.2)

Run docs locally:

```bash
npm run docs
```

---

## Roadmap

**v0.1**  
✓ Snapshot system  
✓ Constraints system  
✓ Event layer  
✓ Mosaic core  
✓ 100% test coverage

**v0.2**  
• DragController  
• Hover target detection  
• Enhanced constraints  
• Visual markers API

**v0.3+**  
• Grouping & nested drag  
• Cross-container constraints  
• Plugin system

---

## Contributing

Pull requests are welcome.  
Please run tests and linting before submitting:

```bash
npm run test
npm run lint
```

---

## License

MIT © WhittakerTech  