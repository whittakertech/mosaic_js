# `Mosaic` Class

The core controller of the Mosaic engine.

## Constructor

```ts
new Mosaic({
  root: HTMLElement,
  selectors: {
    node: string;
    group?: string;
    children?: string;
    handle?: string;
  }
})
```

## Methods

### `initialize()`
Binds event listeners and emits `mosaic:init`.

### `destroy()`
Cleans up event listeners and emits `mosaic:destroy`.

### `confirm()`
Clears the current snapshot and emits `mosaic:mutation:confirmed`.

### `reject()`
Restores the snapshot and emits:

- `mosaic:mutation:rejected`
- `mosaic:rollback`