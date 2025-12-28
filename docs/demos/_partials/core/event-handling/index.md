---
title: Event Handling
description: Demonstrates listening to MosaicJS lifecycle events.
---


## Event Handling


MosaicJS is event-driven. This example shows how to listen for
lifecycle events emitted during drag, mutation, and rollback.

Try dragging and dropping the items. Watch the event log on the right.



<iframe
  src="/demos/_iframes/core/event-handling/index.html"
  style="
    width:100%;
    height:480px;
    border:1px solid #ddd;
    border-radius:8px;
  "
></iframe>

### What This Demonstrates

- Mosaic emits global events such as:
  - `mosaic:init`
  - `mosaic:state`
  - `mosaic:mutation:confirmed`
  - `mosaic:mutation:rejected`
  - `mosaic:rollback`

- You can respond without framework bindings.
- Events are informative and predictable.



```js
import { Mosaic } from '/demos/_shared/mosaic.js';

const logList = document.getElementById('events');

function log(name, detail = null) {
  const li = document.createElement('li');
  li.innerHTML =
    `<strong>${name}</strong>` +
    (detail ? ` <span>${JSON.stringify(detail)}</span>` : '');
  logList.prepend(li);

  while (logList.children.length > 12)
    logList.removeChild(logList.lastChild);
}

const mosaic = new Mosaic({
  root: document.getElementById('source'),
  selectors: { node: '.item' }
});

mosaic.initialize();

/* Event listeners */

window.addEventListener('mosaic:init', () => {
  log('mosaic:init');
});

window.addEventListener('mosaic:state', e => {
  log('mosaic:state', e.detail);
});

window.addEventListener('mosaic:mutation:confirmed', () => {
  log('mosaic:mutation:confirmed');
});

window.addEventListener('mosaic:mutation:rejected', () => {
  log('mosaic:mutation:rejected');
});

window.addEventListener('mosaic:rollback', () => {
  log('mosaic:rollback');
});

```

