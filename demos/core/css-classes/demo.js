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
