# CSS Class Contract

MosaicJS exposes a **canonical CSS class contract** to communicate drag-and-drop
interaction state to the DOM without enforcing any visual styling.

This contract exists to make MosaicJS:

- Deterministic
- Framework-agnostic
- Utility-CSS friendly (e.g. Tailwind)
- Safe to integrate into existing design systems

MosaicJS **never injects CSS rules**.  
It only applies and removes semantic class names.

## Design Principles

The CSS class contract follows four core rules:

### 1. Deterministic
CSS classes are applied and removed exclusively as a function of MosaicJS
state transitions. No class is ever applied opportunistically or implicitly.

### 2. Semantic
Class names describe **interaction state**, not visual appearance.
MosaicJS does not encode styling intent.

### 3. Framework-agnostic
The same contract works across:

- Vanilla DOM
- React
- Vue
- Web Components

No framework integration is required or assumed.

### 4. Configurable
All class names are overrideable at instantiation time.
Consumers may replace any subset of the contract while preserving behavior.

## The CSS Class Contract

MosaicJS exposes a fixed set of semantic CSS class hooks representing
drag-and-drop interaction states.

Each hook corresponds to a specific point in the drag lifecycle
(e.g. active drag, ghost element, drop allowed or rejected).

The **exact class names** are defined by the active CSS class contract
and are treated as implementation-level configuration rather than API surface.

## Default CSS Class Reference

The default CSS class names provided by MosaicJS are **automatically generated**
from the canonical CSS class contract.

The stylesheet below contains **all public CSS class hooks** exposed by MosaicJS
and is provided as a **copy-pasteable, non-opinionated reference**.

This file:

- Contains no visual styling
- Encodes affordance only
- Is optional and illustrative
- May be freely modified or replaced

```css
<!--@include: ./_generated/default-css.css-->
```

## Customizing CSS Classes

You may override any subset of the CSS class contract when creating a `Mosaic`
instance.

Unspecified properties automatically fall back to the default contract.

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

Each contract value may contain **one or more space-separated class names**,
enabling full compatibility with utility-first CSS frameworks.

## Class Application Helpers

MosaicJS applies and removes CSS classes using internal helper utilities:

```ts
applyClasses(element, "foo bar baz");
removeClasses(element, "foo bar");
```

These helpers:

- Support space-separated class lists
- Ignore excess whitespace
- Perform no-ops for empty strings

They are exported for advanced integrations but are **not required**
for standard usage. They do not perform validation and are 
intentionally minimal.

## Ghost Elements

The ghost (drag preview) element:

- Is a deep clone of the active node
- Receives only the classes defined by the active CSS class contract
- Is removed automatically when the interaction ends

MosaicJS does not apply visual styling to the ghost element.
Only positional behavior is enforced.

## Error Handling

Calling `Ghost.create` with a non-HTMLElement will throw:

```text
TypeError: Ghost.create expected HTMLElement; received <type>
```

This ensures misuse fails loudly and predictably without leaving side effects.

## Summary

The CSS class contract is the **only styling surface** exposed by MosaicJS.

If MosaicJS affects the DOM visually, it does so exclusively by:

> applying or removing semantic class names — and nothing else.

This guarantees MosaicJS remains safe, predictable, and compatible with
any design system or framework.
