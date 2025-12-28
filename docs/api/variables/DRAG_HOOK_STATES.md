[@whittakertech/mosaic](../index.md) / DRAG\_HOOK\_STATES

# Variable: DRAG\_HOOK\_STATES

```ts
const DRAG_HOOK_STATES: Readonly<{
  onDragEnd: Idle;
  onDragMove: Dragging;
  onDragStart: PointerDown;
  onDropConfirmed: Mutated;
  onDropRejected: RollingBack;
  onPreDrop: Dropping;
}>;
```

Defined in: [drag/lifecycle.ts:40](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/drag/lifecycle.ts#L40)

Mapping of drag lifecycle hooks to their required Mosaic state.

This object defines the invariant relationship between each
lifecycle hook and the internal drag state in which it may fire.

## Remarks

This mapping is used to validate hook invocation at runtime.
If a hook is invoked while the Mosaic instance is in an unexpected
state, an error will be thrown.

This object is intentionally static and non-extensible.
