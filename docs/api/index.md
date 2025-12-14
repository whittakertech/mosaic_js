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
1. Instantiate Mosaic with a root element
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

&hyphen;

</td>
</tr>
<tr>
<td>

[MosaicOptions](interfaces/MosaicOptions.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[MosaicSnapshot](interfaces/MosaicSnapshot.md)

</td>
<td>

&hyphen;

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

[MOSAIC\_TRANSITIONS](variables/MOSAIC_TRANSITIONS.md)

</td>
<td>

&hyphen;

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

[canTransition](functions/canTransition.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[checkConstraints](functions/checkConstraints.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[createSnapshot](functions/createSnapshot.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[emit](functions/emit.md)

</td>
<td>

&hyphen;

</td>
</tr>
<tr>
<td>

[restoreSnapshot](functions/restoreSnapshot.md)

</td>
<td>

&hyphen;

</td>
</tr>
</tbody>
</table>
