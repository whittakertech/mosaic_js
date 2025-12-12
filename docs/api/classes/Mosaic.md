[@whittakertech/mosaic](../index.md) / Mosaic

# Class: Mosaic

Defined in: [mosaic.ts:17](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L17)

## Constructors

### Constructor

```ts
new Mosaic(options): Mosaic;
```

Defined in: [mosaic.ts:24](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L24)

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

Defined in: [mosaic.ts:18](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L18)

***

### selectors

```ts
selectors: object;
```

Defined in: [mosaic.ts:19](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L19)

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

Defined in: [mosaic.ts:21](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L21)

## Methods

### confirm()

```ts
confirm(): void;
```

Defined in: [mosaic.ts:40](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L40)

#### Returns

`void`

***

### destroy()

```ts
destroy(): void;
```

Defined in: [mosaic.ts:55](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L55)

#### Returns

`void`

***

### initialize()

```ts
initialize(): void;
```

Defined in: [mosaic.ts:30](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L30)

#### Returns

`void`

***

### reject()

```ts
reject(): void;
```

Defined in: [mosaic.ts:45](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L45)

#### Returns

`void`

***

### setState()

```ts
setState(s): void;
```

Defined in: [mosaic.ts:67](https://github.com/whittakertech/mosaic_js/blob/928987df98a79ac2751bd91fee20975b1e81e571/src/mosaic.ts#L67)

#### Parameters

##### s

[`MosaicState`](../enums/MosaicState.md)

#### Returns

`void`
