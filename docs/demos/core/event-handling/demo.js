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
