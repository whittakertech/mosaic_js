[@whittakertech/mosaic](../index.md) / Mosaic

# Class: Mosaic

Defined in: [mosaic.ts:116](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L116)

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

Defined in: [mosaic.ts:126](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L126)

#### Parameters

##### options

[`MosaicOptions`](../interfaces/MosaicOptions.md)

#### Returns

`Mosaic`

## Properties

### cssClasses

```ts
cssClasses: CSSClassContract;
```

Defined in: [mosaic.ts:119](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L119)

***

### root

```ts
root: HTMLElement;
```

Defined in: [mosaic.ts:117](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L117)

***

### selectors

```ts
selectors: object;
```

Defined in: [mosaic.ts:118](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L118)

#### children?

```ts
optional children: string;
```

Optional selector identifying child elements within a draggable node.

##### Remarks

This selector is intended for structural clarity and future extensibility.
It is not required for basic drag-and-drop behavior.

#### group?

```ts
optional group: string;
```

Optional selector identifying logical grouping elements.

##### Remarks

Group selectors are reserved for future features such as
grouped or nested drag interactions.
They are not interpreted by MosaicJS in v0.2.

#### handle?

```ts
optional handle: string;
```

Optional selector identifying a drag handle within a node.

##### Remarks

When provided, drag initiation may be restricted to matching
handle elements in future versions.
This selector is currently advisory.

#### node

```ts
node: string;
```

Selector matching draggable nodes.

This selector defines which elements participate in drag operations.

***

### snapshot

```ts
snapshot: MosaicSnapshot | null = null;
```

Defined in: [mosaic.ts:120](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L120)

## Methods

### confirm()

```ts
confirm(): void;
```

Defined in: [mosaic.ts:163](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L163)

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

Defined in: [mosaic.ts:190](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L190)

Tears down the Mosaic instance and removes all event listeners.

After calling destroy(), the instance is inert and should be discarded.
Emits `mosaic:destroy`.

#### Returns

`void`

***

### getState()

```ts
getState(): MosaicState;
```

Defined in: [mosaic.ts:202](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L202)

#### Returns

[`MosaicState`](../enums/MosaicState.md)

***

### initialize()

```ts
initialize(): void;
```

Defined in: [mosaic.ts:145](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L145)

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

Defined in: [mosaic.ts:174](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L174)

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

Defined in: [mosaic.ts:221](https://github.com/whittakertech/mosaic_js/blob/e3b70b57c2a61ecd26a333f690edf446be523672/src/mosaic.ts#L221)

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
