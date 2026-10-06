(() => {
  const settingsForm = () => document.querySelector('#settingsForm');
  const productForm = () => document.querySelector('#productForm');
  function addProductField(name, label) {
    const form = productForm();
    if (!form || form.elements[name]) return;
    const field = document.createElement('label');
    field.dataset.advanced = name;
    field.innerHTML = `${label}<input name="${name}" type="number" min="0" step="1">`;
    form.querySelector('[name="image"]')?.closest('label')?.after(field);
  }
  function addAdvancedSettings() {
    const form = settingsForm();
    const card = form?.querySelector('.settings-card:nth-child(2) .form-grid');
    if (!card || form.elements.freeShippingUnits) return;
    [['freeShippingUnits', 'Unidades mínimas para envío gratis'], ['freeShippingAmount', 'Monto mínimo para envío gratis']].forEach(([name, label]) => {
      const field = document.createElement('label');
      field.innerHTML = `${label}<input name="${name}" type="number" min="0">`;
      card.append(field);
    });
    const extra = document.createElement('div');
    extra.className = 'settings-card';
    extra.innerHTML = `<h3>WhatsApp, redes y métodos de pago</h3><p class="settings-help">El cliente podrá elegir el WhatsApp para su pedido o abrir tus redes desde el pie de la tienda.</p><div class="form-grid"><label>Nombre de WhatsApp 1<input name="whatsapp1Name" placeholder="Ventas"></label><label>Número de WhatsApp 1<input name="whatsapp1Phone" placeholder="54911..."></label><label>Nombre de WhatsApp 2<input name="whatsapp2Name" placeholder="Consultas"></label><label>Número de WhatsApp 2<input name="whatsapp2Phone" placeholder="54911..."></label><label>TikTok (URL)<input name="tiktok" placeholder="https://tiktok.com/@..."></label><label>X / Twitter (URL)<input name="twitter" placeholder="https://x.com/..."></label><label class="wide">Métodos de pago (uno por línea)<textarea name="paymentMethods" rows="4" placeholder="Transferencia bancaria\nMercado Pago\nEfectivo al retirar"></textarea></label></div>`;
    form.append(extra);
  }
  function fillWholesale() {
    const form = productForm();
    const id = form?.elements.id?.value;
    const products = JSON.parse(localStorage.getItem('vnbx-store-data-v1') || '{}').products || [];
    const product = products.find(item => item.id === id) || {};
    for (const name of ['wholesaleMinUnits', 'wholesalePrice']) if (form?.elements[name]) form.elements[name].value = product[name] ?? '';
  }
  function enhance() { addProductField('wholesaleMinUnits', 'Cantidad mínima mayorista'); addProductField('wholesalePrice', 'Precio unitario mayorista'); addAdvancedSettings(); fillWholesale(); }
  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    document.addEventListener('click', event => { if (event.target.closest('#newProduct, [data-edit]')) setTimeout(enhance, 80); });
  });
})();
