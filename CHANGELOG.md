# Changelog

## v0.2.0 — Interactive Docs + Demonster Engine

### New
- Introduced **Demonster**, a structured documentation demo engine
  - Category model with labels, descriptions, and ordering
  - YAML-driven demo metadata + layout composition
  - Markdown page generation for each demo
  - Category index pages generated automatically
  - Deterministic iframe rendering using a shared HTML template
  - Automatic sidebar generation with nested navigation:
    Demos → Category → Demo
  - Runnable iframe output located at:
    /docs/public/demos/_iframes/<category>/<slug>/index.html

- Added **shared Mosaic runtime bundle**
  /docs/public/demos/_shared/mosaic.js  
  Ensures all demos run against the latest library build without per-demo asset injection.

- Added **Core Demo Suite**
  - Basic Drag — minimal working drag example
  - Event Handling — event lifecycle logging + observability
  - CSS Class Customization — overriding default CSS class contract

---

### Documentation Infrastructure
- Created reusable iframe template:
  /docs/demos/_templates/iframe.html  
  (Demonster is intentionally agnostic; template behavior is controlled externally)

- Deterministic documentation build pipeline
  - Pre-creates sidebar placeholder to prevent VitePress startup failures
  - Automatically syncs Mosaic runtime bundle prior to docs generation
  - Fully idempotent doc builds
  - Category and demo index pages are generated automatically

---

### Stability
- Fixed `package.json` exports to correctly point `types` → `dist/index.d.ts`
- Improved Ghost pointer offset correctness
- Added RAF lifecycle safety protections
- Expanded test coverage — all tests passing

---

### Non-Goals (Intentional)
- No framework-specific demos
- No visual design system
- No demo logic outside documented public APIs

## 0.1.0 — 2025-12-14

First stable release of **MosaicJS**, delivering a complete, production-ready drag-and-drop engine core.

### Added
- Fully implemented pointer-driven drag lifecycle via `DragController`.
- Deterministic state machine with enforced transitions (`MosaicState`, `canTransition`).
- Snapshot + rollback guarantees for all drag operations.
- Constraint evaluation on drop with automatic rejection and restoration.
- Structured event emission for all lifecycle changes:
  - `mosaic:init`
  - `mosaic:state`
  - `mosaic:mutation:confirmed`
  - `mosaic:mutation:rejected`
  - `mosaic:rollback`
  - `mosaic:destroy`
- Visual ghost element for drag feedback.
- Public `Mosaic` controller API with strict lifecycle boundaries.
- Comprehensive TypeDoc-generated API documentation.
- VitePress documentation site with guides and architecture notes.
- 100% test coverage across all modules (Vitest + jsdom).
- Deterministic behavior validated through exhaustive unit tests.

### Changed
- Promoted project from alpha substrate to a complete drag-and-drop engine.
- Replaced implicit DOM mutation patterns with explicit, reversible operations.
- Clarified drag lifecycle semantics (`Dropping` → `Mutated`).

### Notes
This release establishes MosaicJS as a **correctness-first drag-and-drop engine**.

Advanced features such as hover visualization, grouping, nested drag, and plugin APIs are intentionally deferred to 
future releases to preserve architectural clarity.

MosaicJS v0.1.0 is suitable for production use where **predictability, rollback safety, and state observability** are 
required.

## 0.0.0-alpha — 2025-12-11

Initial alpha release of **Mosaic**, the event-driven, snapshot-based drag-and-drop engine.

### Added
- Core `Mosaic` controller with state machine and event lifecycle.
- Snapshot system (`createSnapshot`, `restoreSnapshot`) with rollback guarantees.
- Constraint system (`checkConstraints`) for validating drop operations.
- Unified event layer (`emit`) for consistent state broadcasting.
- 100% test coverage across all modules.
- VitePress documentation scaffold and initial docs (API, guides, architecture).
- ESLint (Flat config), Prettier, and TypeScript setup.
- Docker environment for development and docs server.
- Full project README.

### Notes
This is an **alpha foundation**.  
The drag lifecycle is not yet implemented; Mosaic currently offers a complete validated substrate for drag-and-drop 
behavior, but **no actual pointer-driven movement**.  
Feature development for 0.1.0 will begin immediately.