// Keeps quantity controls reliable when an older cached app.js is still open.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-minus]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (typeof changeQty === 'function') changeQty(button.dataset.minus, -1);
}, true);
