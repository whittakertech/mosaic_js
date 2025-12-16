# CSS Class Contract

MosaicJS exposes a **canonical CSS class contract** to communicate drag-and-drop
interaction state to the DOM without enforcing any visual styling.

This contract exists to make MosaicJS:

- Deterministic
- Framework-agnostic
- Utility-CSS friendly (e.g., Tailwind)
- Safe to integrate into existing design systems

MosaicJS **never injects CSS rules**.  
It only applies and removes semantic class names.

---

## Design Principles

The CSS contract follows four rules:

1. **Deterministic**  
   Classes are applied and removed exclusively as a function of MosaicJS state transitions.

2. **Semantic**  
   Class names describe *interaction state*, not appearance.

3. **Framework-agnostic**  
   The same contract works in:
    - Vanilla DOM
    - React
    - Vue
    - Web Components

4. **Configurable**  
   All class names are overrideable at instantiation time.

---

## The Contract

```ts
export interface CSSClassContract {
  active: string;
  ghost: string;
  dropTarget: string;
  dropAllowed: string;
  dropRejected: string;
}
```

Each property may contain **one or more space-separated class names**.

This allows full compatibility with utility-first CSS frameworks.

---

## Default Contract

```ts
import { DEFAULT_CSS_CLASS_CONTRACT } from "@whittakertech/mosaic";

{
  active: "mosaic--active"
  ghost: "mosaic--ghost"
  dropTarget: "mosaic--drop-target"
  dropAllowed: "mosaic--drop-allowed"
  dropRejected: "mosaic--drop-rejected"
}
```

The default contract is frozen and immutable.

---

## Customizing CSS Classes

You can override any subset of the contract when creating a `Mosaic` instance:

```ts
const mosaic = new Mosaic({
  root,
  selectors: { node: ".item" },
  cssClasses: {
    active: "ring-2 ring-blue-500",
    ghost: "opacity-50 pointer-events-none shadow-lg",
  }
});
```

Unspecified properties fall back to the default contract.

---

## Class Application Helpers

MosaicJS uses internal helpers to apply and remove classes safely:

```ts
applyClasses(element, "foo bar baz");
removeClasses(element, "foo bar");
```

These helpers:

- Support space-separated class lists
- Ignore extra whitespace
- Perform no-ops for empty strings

They are exported for advanced integrations but are not required for normal use.

---

## Ghost Elements

The ghost (drag preview) element:

- Is a deep clone of the active node
- Receives only the classes defined by `cssClasses.ghost`
- Is removed automatically when the interaction ends

MosaicJS does not style the ghost visually — only positional behavior is enforced.

---

## Error Handling

Calling `Ghost.create` with a non-HTMLElement will throw:

```text
TypeError: Ghost.create expected HTMLElement; received <type>
```

This ensures misuse fails loudly and predictably, without leaving side effects.

---

## Summary

The CSS Class Contract is the **only** styling surface exposed by MosaicJS.

If MosaicJS affects the DOM visually, it does so by:

> applying or removing semantic class names — and nothing else.

This makes MosaicJS safe to embed inside any design system or framework.