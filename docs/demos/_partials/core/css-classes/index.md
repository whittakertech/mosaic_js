---
title: CSS Class Customization
description: Demonstrates replacing Mosaic’s internal CSS classes with your own.
---


## CSS Class Customization


MosaicJS attaches CSS classes to elements while dragging.

But you're **not locked** to the default:

- `mosaic--active`
- `mosaic--ghost`
- `mosaic--drop-target`

You can rename them to match your design system.

This example replaces them with **custom names**.



<iframe
  src="/demos/_iframes/core/css-classes/index.html"
  style="
    width:100%;
    height:480px;
    border:1px solid #ddd;
    border-radius:8px;
  "
></iframe>

### HTML


```html
<div class="wrap">
  <div id="list">
    <div class="item" data-mosaic-id="1">One</div>
    <div class="item" data-mosaic-id="2">Two</div>
    <div class="item" data-mosaic-id="3">Three</div>
  </div>
</div>

```


### CSS (custom class names, not Mosaic defaults)


```css
body {
  background: #0d1117;
  color: #e6edf3;
  padding: 32px;
  font-family: system-ui, -apple-system, sans-serif;
}

.wrap { display: flex; justify-content: center; }

#list {
  width: 340px;
  padding: 16px;
  background: #111826;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
}

.item {
  background: #161b28;
  border: 1px solid rgba(255,255,255,.12);
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 6px;
  user-select: none;
}

/* -------------------------
   Custom drag class contract
-------------------------- */

.drag-active:not(.drag-ghost) {
  border: 2px dashed #ffd166;
  background: rgba(255,209,102,.12);
}

.drag-ghost {
  cursor: grabbing;
  transform: scale(1.02);
  opacity: 1;
  box-shadow:
      0 14px 40px rgba(0,0,0,.45),
      0 0 0 2px rgba(255,209,102,.6);
}

.drag-target {
  outline: 2px dashed rgba(255,255,255,.3);
}
```


### JavaScript (overriding Mosaic's class contract)


```js
import { Mosaic } from '/demos/_shared/mosaic.js';

const mosaic = new Mosaic({
  root: document.getElementById('list'),

  selectors: {
    node: '.item'
  },

  cssClasses: {
    active: 'drag-active',
    ghost: 'drag-ghost',
    dropTarget: 'drag-target'
  }
});

mosaic.initialize();

```

