[@whittakertech/mosaic](../index.md) / emit

# Function: emit()

```ts
function emit(name, detail?): void;
```

Defined in: [events.ts:14](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/events.ts#L14)

Emits a MosaicJS lifecycle event.

Events are dispatched on the global `window` object and are intended
for observation by external systems.

## Parameters

### name

`string`

The event name

### detail?

`unknown`

Optional event payload

## Returns

`void`

## Remarks

Event emission is synchronous.
MosaicJS does not catch or suppress listener errors.
