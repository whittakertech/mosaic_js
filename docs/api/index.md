# @whittakertech/mosaic

## Enumerations

<table>
<thead>
<tr>
<th>Enumeration</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[MosaicState](enums/MosaicState.md)

</td>
<td>

Represents the current interaction lifecycle state of a MosaicJS instance.
States are mutually exclusive and transition deterministically.

</td>
</tr>
</tbody>
</table>

## Classes

<table>
<thead>
<tr>
<th>Class</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[Mosaic](classes/Mosaic.md)

</td>
<td>

Mosaic is the public controller for an event-driven drag-and-drop system.

It manages:
- Pointer lifecycle
- DOM snapshotting and rollback
- Deterministic state transitions
- Event emission for external observers

Consumers should:
1. Instantiate Mosaic with root element
2. Call `initialize()`
3. Listen for `mosaic:*` events

Direct state manipulation is intentionally restricted.

**Example**

```ts
const mosaic = new Mosaic({
  root: document.querySelector("#list"),
  selectors: { node: ".item" }
});

mosaic.initialize();

window.addEventListener("mosaic:mutation:confirmed", () => {
  console.log("Order updated");
});
```

</td>
</tr>
</tbody>
</table>

## Interfaces

<table>
<thead>
<tr>
<th>Interface</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[ConstraintResult](interfaces/ConstraintResult.md)

</td>
<td>

The result of evaluating a drag-and-drop constraint.

A `ConstraintResult` represents a deterministic decision about whether
a proposed drop operation is allowed.

**Remarks**

Constraint evaluation in MosaicJS is synchronous, pure, and side-effect free.
A rejected result will trigger rollback behavior if a snapshot is present.

Consumers should treat `reason` as diagnostic metadata only.

</td>
</tr>
<tr>
<td>

[CSSClassContract](interfaces/CSSClassContract.md)

</td>
<td>

Defines the semantic CSS class contract used by MosaicJS.

Each property represents a stable, meaning-based styling hook
that may be applied during the drag lifecycle.

**Remarks**

MosaicJS does not impose visual styles.
These class names are intended to integrate with external
design systems or utility frameworks.

</td>
</tr>
<tr>
<td>

[DragContext](interfaces/DragContext.md)

</td>
<td>

Immutable context object describing the current drag operation.

A `DragContext` provides a stable, serializable view of MosaicJS’s
internal drag state at a specific moment in time.

It is passed to lifecycle hooks and emitted with relevant events
to allow external systems to observe drag behavior safely.

**Remarks**

- A DragContext is **read-only** and **frozen** at creation time.
- It represents a snapshot of state, not a live reference.
- Consumers must not attempt to mutate or persist this object.

The shape of DragContext is considered part of MosaicJS’s
stable public API.

</td>
</tr>
<tr>
<td>

[DragLifecycleHooks](interfaces/DragLifecycleHooks.md)

</td>
<td>

Lifecycle hooks for observing MosaicJS drag behavior.

Each hook is invoked at a specific point in the drag lifecycle
and receives an immutable drag context.

**Remarks**

Hooks are invoked in strict alignment with the internal
deterministic state machine.

Invoking a hook in an unexpected state will throw an error.

</td>
</tr>
<tr>
<td>

[MosaicOptions](interfaces/MosaicOptions.md)

</td>
<td>

Configuration options used to construct a Mosaic instance.

MosaicOptions define the DOM scope, selector semantics, styling hooks,
and lifecycle observation points for a Mosaic drag session.

**Remarks**

Options are read once at construction time.
Changing values after initialization has no effect.

</td>
</tr>
<tr>
<td>

[MosaicSnapshot](interfaces/MosaicSnapshot.md)

</td>
<td>

A structural snapshot of the DOM captured at drag start.

Snapshots allow MosaicJS to restore the DOM to a known-good state
when a drop operation is rejected.

**Remarks**

Snapshots capture node identity, parent relationships, and ordering.
They do not clone DOM nodes or capture visual state.

</td>
</tr>
</tbody>
</table>

## Variables

<table>
<thead>
<tr>
<th>Variable</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[DEFAULT\_CSS\_CLASS\_CONTRACT](variables/DEFAULT_CSS_CLASS_CONTRACT.md)

</td>
<td>

The default semantic CSS class contract used by MosaicJS.

This object defines the canonical set of CSS class names applied
during the drag lifecycle when no user overrides are provided.

**Remarks**

MosaicJS does not ship with visual styles.
These class names are intended to be consumed by external
design systems, utility frameworks, or application stylesheets.

Consumers may override individual entries via [MosaicOptions.cssClasses](interfaces/MosaicOptions.md#cssclasses).

</td>
</tr>
<tr>
<td>

[DRAG\_HOOK\_STATES](variables/DRAG_HOOK_STATES.md)

</td>
<td>

Mapping of drag lifecycle hooks to their required Mosaic state.

This object defines the invariant relationship between each
lifecycle hook and the internal drag state in which it may fire.

**Remarks**

This mapping is used to validate hook invocation at runtime.
If a hook is invoked while the Mosaic instance is in an unexpected
state, an error will be thrown.

This object is intentionally static and non-extensible.

</td>
</tr>
<tr>
<td>

[MOSAIC\_TRANSITIONS](variables/MOSAIC_TRANSITIONS.md)

</td>
<td>

The complete set of valid state transitions for MosaicJS.

This object defines the deterministic finite state machine
governing the drag lifecycle.

**Remarks**

This map is intentionally static and non-extensible.
All state transitions must be explicit, observable, and testable.

</td>
</tr>
</tbody>
</table>

## Functions

<table>
<thead>
<tr>
<th>Function</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[buildDragContext](functions/buildDragContext.md)

</td>
<td>

Constructs an immutable [DragContext](interfaces/DragContext.md) from internal drag state.

This function is used by MosaicJS to create the context object
passed to lifecycle hooks and emitted with drag-related events.

**Remarks**

- The returned object is frozen and must not be mutated.
- The context represents a snapshot in time, not a live reference.

While exported as part of the public API, this function is primarily
intended for internal use and advanced tooling.

</td>
</tr>
<tr>
<td>

[canTransition](functions/canTransition.md)

</td>
<td>

Determines whether a transition between two lifecycle states is valid.

This function enforces MosaicJS’s deterministic state machine.

**Remarks**

Invalid transitions are rejected by `Mosaic.setState` and emit
a `mosaic:error` event.

</td>
</tr>
<tr>
<td>

[checkConstraints](functions/checkConstraints.md)

</td>
<td>

Evaluates whether a drop operation is permitted.

This function applies MosaicJS’s built-in, deterministic constraints
to a proposed drag-and-drop interaction.

**Remarks**

Constraint evaluation is synchronous and side-effect free.
Custom or user-defined constraints are not supported in v0.2.

</td>
</tr>
<tr>
<td>

[createSnapshot](functions/createSnapshot.md)

</td>
<td>

Captures a structural snapshot of the current DOM state.

The snapshot is used to guarantee rollback safety if a drop
operation is rejected.

**Remarks**

Snapshots are captured automatically by MosaicJS at drag start.
Manual usage is intended for advanced or diagnostic scenarios.

</td>
</tr>
<tr>
<td>

[emit](functions/emit.md)

</td>
<td>

Emits a MosaicJS lifecycle event.

Events are dispatched on the global `window` object and are intended
for observation by external systems.

**Remarks**

Event emission is synchronous.
MosaicJS does not catch or suppress listener errors.

</td>
</tr>
<tr>
<td>

[restoreSnapshot](functions/restoreSnapshot.md)

</td>
<td>

Restores the DOM to a previously captured snapshot state.

This function reorders existing DOM nodes to match the snapshot.

**Remarks**

If the snapshot is invalid or incomplete, restoration is a no-op.
This function does not recreate or remove DOM nodes.

</td>
</tr>
</tbody>
</table>
