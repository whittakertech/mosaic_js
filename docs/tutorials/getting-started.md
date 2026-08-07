---
description: Install MosaicJS and create your first Mosaic instance — a step-by-step introduction to initialization and basic usage.
---

# Getting Started

MosaicJS is a lightweight, event-driven drag-and-drop engine for the DOM.
It focuses on **predictability**, **rollback safety**, and **zero framework lock-in**.

## Installation

Install MosaicJS via npm:

```bash
npm install @whittakertech/mosaic
```

MosaicJS ships as a standard ES module and works in modern browsers and bundlers.

## Basic Usage

Create a Mosaic instance by providing a root element and a selector for draggable nodes.

```ts
import { Mosaic } from "@whittakertech/mosaic";

const mosaic = new Mosaic({
  root: document.getElementById("root")!,
  selectors: {
    node: ".item"
  }
});

mosaic.initialize();
```

That's it.  
Once initialized, MosaicJS immediately begins managing drag interactions.

::: tip No framework required
MosaicJS works directly with the DOM.

It does **not** depend on React, Vue, Svelte, or any other framework.
You can use it in plain HTML, legacy apps, or alongside any UI framework
without adapters, hooks, or wrappers.
:::

## Required Markup

MosaicJS identifies draggable elements using `data-mosaic-id`.

Each draggable node **must** have a stable, unique identifier.

```html
<div id="root">
  <div class="item" data-mosaic-id="item-1">Item 1</div>
  <div class="item" data-mosaic-id="item-2">Item 2</div>
  <div class="item" data-mosaic-id="item-3">Item 3</div>
</div>
```

Mosaic does **not** generate or mutate IDs for you — this guarantees deterministic behavior and safe rollback.

## What MosaicJS Manages for You

Once initialized, MosaicJS automatically handles:

- Drag lifecycle state transitions
- Ghost element creation and positioning
- DOM snapshot creation before mutations
- Safe rollback when constraints fail
- Constraint evaluation and mutation validation
- Predictable state emission via global events

MosaicJS **does not** impose styling, animation, or layout decisions.
Those are entirely under your control.

## Common Pitfalls

### Missing `data-mosaic-id`

Every draggable element **must** have a stable `data-mosaic-id`.

If IDs are missing, duplicated, or change between renders, MosaicJS cannot
guarantee correct behavior or safe rollback.

---

### Mutating the DOM during a drag

Avoid modifying the DOM manually while a drag is active.

MosaicJS maintains internal snapshots and state transitions.
External mutations during a drag can invalidate rollback assumptions.

If you need custom behavior, use lifecycle events instead.

---

### Expecting MosaicJS to style elements

MosaicJS does not inject CSS.

Classes like `mosaic--active`, `mosaic--ghost`, and `mosaic--drop-target`
are **hooks**, not visual styles.

You are expected to define all visuals yourself.

---

### Treating events as callbacks

MosaicJS emits **global, descriptive events**, not inline callbacks.

These events are designed for:
- logging
- analytics
- validation
- orchestration

They are not intended to directly mutate DOM state.

---

### Initializing multiple times

Calling `initialize()` more than once on the same instance
will lead to duplicate listeners and undefined behavior.

Create one instance per root and initialize it once.

## When *Not* to Use MosaicJS

MosaicJS is intentionally low-level and opinionated about correctness.
It may not be the right tool in these situations:

- You want a **drop-in UI component** with prebuilt styles and animations  
  (MosaicJS provides behavior only, not visuals)

- Your drag state lives entirely inside a framework's virtual DOM  
  and you don't want DOM-level events

- You need **cross-window, cross-iframe, or OS-level dragging**

- You want automatic ID generation or implicit element tracking

- Your use case does not require rollback, constraints, or deterministic behavior

If you need a quick sortable list with minimal setup and no guarantees,
a higher-level UI library may be a better fit.

MosaicJS is designed for situations where **correctness matters more than convenience**.

## Next Steps

From here, you can explore MosaicJS in increasing depth:

- 👉 **[Interactive Demos](/demos/)**
- 👉 **[Core Concepts Demos](/demos/core/)**
- 👉 **[Drag Lifecycle Guide](/documentation/drag-lifecycle)**
- 👉 **[Constraints Design Guide](/documentation/constraints-design)**
- 👉 **[CSS Class Contract](/documentation/css-contract)**

These sections build on each other, but you can jump to any one depending on what you need.