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
    extra.innerHTML = `<h3>WhatsApp, redes y métodos de pago</h3><p class="settings-help">El cliente podrá elegir el WhatsApp para su pedido o abrir tus redes desde el pie de la tienda.</p><div class="form-grid"><label>Nombre de WhatsApp 1<input name="whatsapp1Name" placeholder="Ventas"></label><label>Número de WhatsApp 1<input name="whatsapp1Phone" placeholder="54911..."></label><label>Qué atiende WhatsApp 1<input name="whatsapp1Description" placeholder="Ventas y pedidos"></label><label>Nombre de WhatsApp 2<input name="whatsapp2Name" placeholder="Consultas"></label><label>Número de WhatsApp 2<input name="whatsapp2Phone" placeholder="54911..."></label><label>Qué atiende WhatsApp 2<input name="whatsapp2Description" placeholder="Consultas y soporte"></label><label>TikTok (URL)<input name="tiktok" placeholder="https://tiktok.com/@..."></label><label>X / Twitter (URL)<input name="twitter" placeholder="https://x.com/..."></label><label class="wide">Métodos de pago (uno por línea)<textarea name="paymentMethods" rows="4" placeholder="Transferencia bancaria\nMercado Pago\nEfectivo al retirar"></textarea></label></div>`;
    form.append(extra);
  }
  function addGeneralStoreSettings() {
    const form = settingsForm();
    if (!form || form.querySelector('[data-general-store-settings]')) return;
    const card = document.createElement('div');
    card.className = 'settings-card';
    card.dataset.generalStoreSettings = '1';
    card.innerHTML = '<h3>Diseño y textos generales</h3><p class="settings-help">La imagen principal es opcional. Podés dejarla vacía y mantener el diseño actual.</p><div class="form-grid"><label class="check wide"><input name="heroImageEnabled" type="checkbox"> Usar imagen principal en la portada</label><label class="wide">Imagen principal (URL, opcional)<input name="heroImage" placeholder="Dejar vacío para mantener el diseño actual" autocomplete="off"></label><label class="wide">Imagen principal desde el celular (opcional)<input type="file" accept="image/*,.heic,.heif,.avif,.webp,.gif,.bmp"><small class="settings-help image-setting-hint">Si no activás la casilla, no cambia la apariencia actual.</small></label><label class="wide">Título principal<input name="heroTitle"></label><label class="wide">Texto principal<textarea name="heroText" rows="2"></textarea></label><label>Texto superior<input name="heroEyebrow"></label><label>Título de promoción<input name="promoTitle"></label><label class="wide">Texto de promoción<textarea name="promoText" rows="2"></textarea></label><label class="wide">Texto del pie de página<textarea name="footerText" rows="2"></textarea></label><label class="wide">Texto de entrega<input name="deliveryText"></label></div>';
    form.append(card);
    const saved = JSON.parse(localStorage.getItem('vnbx-store-data-v1') || '{}').settings || {};
    for (const field of card.querySelectorAll('[name]')) { if (field.type === 'checkbox') field.checked = saved[field.name] === true || saved[field.name] === 'true' || saved[field.name] === 'on'; else field.value = saved[field.name] ?? ''; }
    const input = card.querySelector('input[type=file]');
    input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; const image = await compressImage(file); card.querySelector('[name=heroImage]').value = image; card.querySelector('.image-setting-hint').textContent = image ? 'Imagen lista para guardar.' : 'No se pudo leer la imagen.'; });
  }
  function fillWholesale() {
    const form = productForm();
    const id = form?.elements.id?.value;
    const products = JSON.parse(localStorage.getItem('vnbx-store-data-v1') || '{}').products || [];
    const product = products.find(item => item.id === id) || {};
    for (const name of ['wholesaleMinUnits', 'wholesalePrice', 'tier2MinUnits', 'tier2Price', 'tier3MinUnits', 'tier3Price']) if (form?.elements[name]) form.elements[name].value = product[name] ?? '';
  }
  function wireProductSave() {
    const button = document.querySelector('#productForm .primary-btn');
    if (!button || button.dataset.directSave) return;
    button.type = 'button';
    button.dataset.directSave = '1';
    button.addEventListener('click', () => {
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Guardando…';
      const form = productForm();
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const restore = () => { button.disabled = false; button.textContent = 'Guardar producto'; };
      const watcher = setInterval(() => { if (!document.querySelector('#productDialog[open]')) { clearInterval(watcher); restore(); } }, 500);
      setTimeout(() => { clearInterval(watcher); restore(); }, 60000);
    });
  }
  function enhance() { addProductField('wholesaleMinUnits', 'Promo 1: unidades mínimas'); addProductField('wholesalePrice', 'Promo 1: precio unitario'); addProductField('tier2MinUnits', 'Promo 2: unidades mínimas'); addProductField('tier2Price', 'Promo 2: precio unitario'); addProductField('tier3MinUnits', 'Promo 3: unidades mínimas'); addProductField('tier3Price', 'Promo 3: precio unitario'); addAdvancedSettings(); addGeneralStoreSettings(); fillWholesale(); wireProductSave(); }
  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    document.addEventListener('click', event => { if (event.target.closest('#newProduct, [data-edit]')) setTimeout(enhance, 80); });
  });
})();
