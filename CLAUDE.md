# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MosaicJS (`@whittakertech/mosaic`) is a framework-agnostic TypeScript drag-and-drop engine for the browser. It prioritizes correctness, determinism, and reversibility over implicit DOM mutation. Every drag captures a DOM snapshot, every drop is validated by constraints, and invalid operations automatically roll back.

Published as an npm package. Currently at v0.2.

## Commands

```bash
npm run build                  # Build ESM + CJS + .d.ts via tsup
npm run dev                    # Watch mode (ESM only)
npm run test                   # Run vitest in watch mode
npx vitest run                 # Single test run (no watch)
npx vitest run test/state.test.ts           # Single file
npx vitest run test/state.test.ts -t "name" # Single test by name
npm run coverage               # Coverage report (v8)
npm run typecheck               # Typecheck both lib and test tsconfigs
npm run lint                   # ESLint
npm run docs:prepare && npm run docs:dev  # Local VitePress docs site on :5173
npm run docs:api               # Generate TypeDoc API docs
```

## Architecture

### Deterministic State Machine

The drag lifecycle is governed by a finite state machine (`src/state.ts`). All transitions are validated at runtime — invalid transitions emit `mosaic:error` and are rejected.

```
idle → pointerdown → dragging → dropping → mutated → idle
                                        ↘ rollback → idle
idle → destroyed (terminal)
```

The transition map is defined in `MOSAIC_TRANSITIONS` and enforced by `canTransition()`.

### Core Data Flow

1. **Pointer down** → `DragController.pointerDown` captures a DOM snapshot, creates a ghost clone, transitions to `PointerDown`
2. **Pointer move** → resolves hover target via `elementFromPoint`, reorders DOM nodes by insertion position (above/below midpoint), transitions to `Dragging`
3. **Pointer up** → transitions to `Dropping`, runs `checkConstraints()`, then either:
   - **Allowed**: transitions to `Mutated`, calls `mosaic.confirm()` (clears snapshot)
   - **Rejected**: transitions to `RollingBack`, calls `mosaic.reject()` (restores snapshot)
4. **Reset** → removes ghost, clears active node, returns to `Idle`

### Key Components

- **`Mosaic`** (`src/mosaic.ts`) — Public controller. Owns root element, selectors, state, snapshot. Exposes `initialize()`, `confirm()`, `reject()`, `destroy()`, `setState()`.
- **`DragController`** (`src/drag/controller.ts`) — Internal pointer event handler. Orchestrates snapshot, constraints, ghost, hover detection, and DOM reordering. Not exported publicly.
- **`Ghost`** (`src/ghost.ts`) — Clones the dragged element as a fixed-position overlay, positioned via `translate3d`. Uses RAF loop for smooth movement in real browsers, with synchronous fallback for jsdom tests.
- **Snapshot** (`src/snapshot.ts`) — Captures `data-mosaic-id` node positions (parent + order). `restoreSnapshot` reorders existing nodes — never creates or removes DOM elements.
- **Constraints** (`src/constraints.ts`) — Synchronous, pure validation. Returns `{ allowed, reason? }`. Currently: self-drop is allowed, non-matching selector targets are rejected.
- **Events** (`src/events.ts`) — Thin wrapper dispatching `CustomEvent` on `window`. Events: `mosaic:init`, `mosaic:destroy`, `mosaic:state`, `mosaic:mutation:confirmed`, `mosaic:mutation:rejected`, `mosaic:rollback`, `mosaic:error`, `mosaic:hover:enter`, `mosaic:hover:leave`.
- **CSS Contract** (`src/css/`) — Semantic class names (`mosaic--active`, `mosaic--ghost`, etc.) applied/removed during drag. Overridable via `MosaicOptions.cssClasses`. MosaicJS ships no visual styles.
- **Drag Lifecycle Hooks** (`src/drag/lifecycle.ts`) — Optional callbacks (`onDragStart`, `onDragMove`, `onPreDrop`, `onDropConfirmed`, `onDropRejected`, `onDragEnd`) invoked with a frozen `DragContext`. Each hook has a required state invariant enforced at runtime.

### Design Invariants

- State transitions are the single source of truth — all behavior flows from the state machine
- Snapshots track node identity and ordering, not cloned DOM trees
- Constraint evaluation is synchronous, pure, and side-effect free
- `DragContext` objects are frozen at creation — hooks receive snapshots, not live references
- Ghost positioning applies transforms synchronously (for testability) and via RAF loop (for smoothness)
- Hover events (`mosaic:hover:enter`/`leave`) are dispatched on the root element, not `window`

## Testing

- **Framework**: Vitest with jsdom environment
- **Tests live in**: `test/` (flat directory, not mirroring `src/` structure)
- **Naming**: `<module>.test.ts`, with additional focused files like `drag.hooks.test.ts`, `drag.hover.test.ts`, `css.apply.test.ts`
- **Coverage target**: 100% (enforced via `@vitest/coverage-v8`)
- **Coverage exclusions**: Lines marked `/* v8 ignore next -- @preserve */` are defensive guards for branches unreachable in jsdom

## Code Conventions

- ESM-first (`"type": "module"` in package.json)
- Strict TypeScript (`strict: true`, target ES2020)
- `consistent-type-imports` enforced by ESLint — use `import type` for type-only imports
- Prettier via eslint-plugin-prettier
- Build via tsup (outputs ESM + CJS + declarations)
