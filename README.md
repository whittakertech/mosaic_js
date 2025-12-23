# MosaicJS
![npm](https://img.shields.io/npm/v/@whittakertech/mosaic)
![CI](https://github.com/whittakertech/mosaic_js/actions/workflows/ci.yml/badge.svg)
![docs](https://github.com/whittakertech/mosaic_js/actions/workflows/docs.yml/badge.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![license](https://img.shields.io/npm/l/@whittakertech/mosaic)  

<picture>
  <source srcset="/docs/public/mosaic-js-logo-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)">
  <img src="/docs/public/mosaic-js-logo.svg" alt="MosaicJS Logo" width="200">
</picture>

**An event-driven, snapshot-based drag-and-drop engine for the modern web.**

MosaicJS is a lightweight, framework-agnostic TypeScript library for building **precise, reversible, constraint-aware drag-and-drop interactions** in the browser.

It belongs to the WhittakerTech ecosystem but works anywhere the DOM exists — including vanilla JS, React, Vue, and Web Components.

MosaicJS favors **correctness, determinism, and reversibility** over implicit DOM mutation.

---

## Why MosaicJS?

Most drag-and-drop libraries focus on *visual movement first* and treat correctness as an afterthought.  
MosaicJS inverts that model.

**MosaicJS is built around guarantees:**

- Every drag begins with a **DOM snapshot**
- Every drop is **validated by constraints**
- Invalid operations **automatically roll back**
- All state transitions are **explicit, deterministic, and observable**

If you care about:
- Undo / rollback safety
- Predictable state transitions
- Auditable drag behavior
- Complex rules that go beyond “can I drop here?”

MosaicJS is designed for you.

---

## Features

- Snapshot + rollback system
- Constraint-driven validation
- Deterministic state machine
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

MosaicJS will:

1. Capture a DOM snapshot on drag start
2. Evaluate constraints on drop
3. Roll back automatically when invalid
4. Broadcast all lifecycle events

---

## Core Concepts

### Snapshot System

MosaicJS guarantees DOM safety via snapshotting:

```ts
createSnapshot(root);
restoreSnapshot(snapshot);
```

Invalid drags **never leave the DOM in a corrupted state**.

---

### Constraints System

```ts
const result = checkConstraints(dragged, target, selectors);
```

Built-in rules include:

- No self-drop
- Selector mismatch prevention

Constraints are deterministic, testable, and extensible.

---

### Events Layer

MosaicJS emits structured DOM events for all lifecycle changes:

```ts
emit("mosaic:state", {
  from, // Previous state
  to,   // New state
  meta  // Optional metadata
});
```

Example listener:

```ts
window.addEventListener("mosaic:state", (e) => {
  console.log(e.detail.from, "→", e.detail.to);
});
```

Available events:

- `mosaic:init`
- `mosaic:destroy`
- `mosaic:state`
- `mosaic:mutation:confirmed`
- `mosaic:mutation:rejected`
- `mosaic:rollback`

---

### State Machine

`MosaicState` defines the full drag lifecycle:

- `idle`
- `pointerdown`
- `dragging`
- `dropping`
- `mutated`
- `rollback`
- `destroyed`

All transitions are **validated at runtime**.  
Invalid transitions emit errors and are rejected.

---

## Documentation

Full documentation is available at:

**https://mosaicjs.whittakertech.com**

Includes:

- Getting Started
- API Reference
- Architecture
- Snapshot Flow
- Constraints Design
- Drag Lifecycle

Run locally:

```bash
npm run docs
```

---

## Roadmap

### v0.1 (current)
✓ Snapshot system  
✓ Constraints system  
✓ Event layer  
✓ Mosaic core  
✓ Deterministic state machine  
✓ 100% test coverage

### v0.2
• Public DragController extension points  
• Hover target detection  
• Enhanced constraints  
• Visual markers API

### v0.3+
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
