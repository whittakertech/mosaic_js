[@whittakertech/mosaic](../index.md) / Mosaic

# Class: Mosaic

Defined in: [mosaic.ts:47](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L47)

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

## Example

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

## Constructors

### Constructor

```ts
new Mosaic(options): Mosaic;
```

Defined in: [mosaic.ts:54](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L54)

#### Parameters

##### options

[`MosaicOptions`](../interfaces/MosaicOptions.md)

#### Returns

`Mosaic`

## Properties

### root

```ts
root: HTMLElement;
```

Defined in: [mosaic.ts:48](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L48)

***

### selectors

```ts
selectors: object;
```

Defined in: [mosaic.ts:49](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L49)

#### children?

```ts
optional children: string;
```

#### group?

```ts
optional group: string;
```

#### handle?

```ts
optional handle: string;
```

#### node

```ts
node: string;
```

***

### snapshot

```ts
snapshot: MosaicSnapshot | null = null;
```

Defined in: [mosaic.ts:51](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L51)

## Methods

### confirm()

```ts
confirm(): void;
```

Defined in: [mosaic.ts:86](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L86)

Confirms the current mutation.

This clears the active snapshot and finalizes the drag operation.
Called automatically after constraints allow a drop.

Emits `mosaic:mutation:confirmed`.

#### Returns

`void`

***

### destroy()

```ts
destroy(): void;
```

Defined in: [mosaic.ts:113](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L113)

Tears down the Mosaic instance and removes all event listeners.

After calling destroy(), the instance is inert and should be discarded.
Emits `mosaic:destroy`.

#### Returns

`void`

***

### initialize()

```ts
initialize(): void;
```

Defined in: [mosaic.ts:68](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L68)

Initializes the Mosaic instance.

This attaches all required pointer event listeners and enables
drag-and-drop behavior on the root element.

Must be called exactly once before user interaction.
Emits the `mosaic:init` event.

#### Returns

`void`

***

### reject()

```ts
reject(): void;
```

Defined in: [mosaic.ts:97](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L97)

Rejects the current mutation and restores the previous DOM state.

If no snapshot exists, this method is a no-op.
Emits `mosaic:mutation:rejected` and `mosaic:rollback`.

#### Returns

`void`

***

### setState()

```ts
setState(next, meta?): boolean;
```

Defined in: [mosaic.ts:140](https://github.com/whittakertech/mosaic_js/blob/e0e7c26a87608c5b9c3aa6dde0292c1b0fac627f/src/mosaic.ts#L140)

Attempts to transition the Mosaic instance to a new lifecycle state.

State transitions are validated against the internal deterministic
state machine. Invalid transitions are rejected.

#### Parameters

##### next

[`MosaicState`](../enums/MosaicState.md)

The target state

##### meta?

`unknown`

Optional metadata forwarded with the state event

#### Returns

`boolean`

`true` if the transition was applied, `false` otherwise

Emits:
- `mosaic:state` on success
- `mosaic:error` on invalid transition
