# Changelog

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
The drag lifecycle is not yet implemented; Mosaic currently offers a complete validated substrate for drag-and-drop behavior, but **no actual pointer-driven movement**.  
Feature development for 0.1.0 will begin immediately.