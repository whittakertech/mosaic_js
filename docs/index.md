<h1 style="text-align: center;">MosaicJS</h1>

<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; padding: 1rem 0; justify-content: center;">
  <img src="https://img.shields.io/npm/v/@whittakertech/mosaic" alt="npm version" />
  <img src="https://github.com/whittakertech/mosaic_js/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://github.com/whittakertech/mosaic_js/actions/workflows/docs.yml/badge.svg" alt="Docs" />
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage" />
  <img src="https://img.shields.io/npm/l/@whittakertech/mosaic" alt="License" />
</div>

<picture style="display: flex; justify-content: center;">
  <source media="(prefers-color-scheme: dark)" srcset="/mosaic-js-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="/mosaic-js-logo.svg">
  <img alt="MosaicJS Logo" src="/mosaic-js-logo.svg" width="200" role="img" aria-label="MosaicJS Logo">
</picture>

**MosaicJS** is a lightweight, deterministic, event-driven drag-and-drop engine designed for the WhittakerTech ecosystem.

It focuses on **correctness, predictability, and integration safety**, rather than styling or framework coupling.

MosaicJS provides:

- Snapshot-based DOM mutation with guaranteed rollback
- Constraint-driven drop validation
- A stable, observable drag lifecycle with explicit state transitions
- A small, semantic CSS class contract for framework-agnostic styling
- A simple, typed event and hook surface
- Predictable behavior backed by exhaustive test coverage

MosaicJS does **not** impose styling, frameworks, or layout assumptions.  
It exists to be embedded safely inside long-lived systems and design ecosystems.

This documentation describes **MosaicJS v1.0**, where the drag lifecycle, CSS contract, and public extension points are considered **stable**.

---

## Documentation Overview

Use the sections below to understand MosaicJS from first principles through advanced customization.

### Getting Started
- **Introduction** — What MosaicJS is (and is not)
- **Installation** — Adding MosaicJS to your project
- **Basic Usage** — Creating and initializing a Mosaic instance

### Core Concepts
- **Architecture Overview** — How MosaicJS is structured internally
- **Drag Lifecycle** — States, transitions, and guarantees
- **Snapshots & Rollback** — How DOM safety is enforced
- **Constraints System** — Validating drops deterministically

### Styling & Customization
- **CSS Class Contract** — Semantic, framework-agnostic styling hooks
- **Default CSS Reference** — Generated, non-opinionated class reference
- **Customizing CSS Classes** — Integrating with design systems and utility CSS

### Events & Extension Points
- **Lifecycle Hooks** — Observing drag behavior safely
- **Events Layer** — Typed events for external systems
- **Hook Invariants** — Guarantees and restrictions

### Advanced Topics
- **Ghost Elements** — Drag previews and behavior
- **Error Handling** — Fail-fast guarantees
- **Testing Guarantees** — What MosaicJS explicitly covers (and why)

---

## Design Philosophy

MosaicJS is built around a small set of non-negotiable principles:

- **Determinism over heuristics**
- **Explicit state over implicit behavior**
- **Contracts over conventions**
- **Generated documentation over hand-maintained truth**

If MosaicJS changes the DOM, it does so deliberately, observably, and reversibly.

---

## Where to go next

If you’re new to MosaicJS, start with **Architecture Overview** and **Basic Usage**.  
If you’re integrating into an existing system, see **CSS Class Contract** and **Constraints System**.