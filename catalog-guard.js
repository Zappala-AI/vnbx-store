(() => {
  const demoNames = new Set(['Perfume Ámbar Intenso', 'Gorra VNBX Classic', 'Cadena Minimal', 'Auriculares Wave', 'Body Mist Fresh', 'Remera Essential']);
  function clean() {
    document.querySelectorAll('#productsGrid .product-card').forEach(card => {
      const name = card.querySelector('.product-name')?.textContent?.trim();
      if (demoNames.has(name)) card.remove();
    });
    document.querySelectorAll('#categoryChips .chip, #categoryList .drawer-category').forEach(item => {
      if (['Perfumería', 'Ropa y gorras', 'Joyas y accesorios', 'Tecnología'].some(name => item.textContent?.includes(name))) item.remove();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    clean();
    const grid = document.querySelector('#productsGrid');
    if (grid) new MutationObserver(clean).observe(grid, { childList: true, subtree: true });
  });
})();
