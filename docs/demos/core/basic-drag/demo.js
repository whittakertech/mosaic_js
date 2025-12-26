// Import Mosaic from the module.
import { Mosaic } from '/demos/_shared/mosaic.js';

// Set up the configuration of Mosaic.
const mosaic = new Mosaic({
  root: document.getElementById('source'),
  selectors: {
    node: '.item'
  }
});

// Initialize to get it working for you.
mosaic.initialize();
