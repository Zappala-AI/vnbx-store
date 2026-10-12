(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#productForm');
    const input = document.querySelector('#galleryPicker input[type=file]');
    const hint = document.querySelector('#galleryPicker .hint');
    const save = form?.querySelector('.primary-btn');
    if (!form || !input || !hint || !save) return;
    const finish = () => { form.dataset.imageProcessing = ''; save.disabled = false; };
    input.addEventListener('change', () => {
      if (!input.files?.length) return;
      form.dataset.imageProcessing = '1';
      save.disabled = true;
      const observer = new MutationObserver(() => {
        if (/lista para guardar|de .* imagen\(es\) lista|No se pudo|No se seleccionó/.test(hint.textContent || '')) {
          observer.disconnect();
          finish();
        }
      });
      observer.observe(hint, { childList: true, characterData: true, subtree: true });
      setTimeout(() => { observer.disconnect(); finish(); }, 60000);
    });
    form.addEventListener('submit', event => {
      if (form.dataset.imageProcessing === '1') {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert('Esperá a que la imagen termine de procesarse.');
      }
    }, true);
  });
})();
