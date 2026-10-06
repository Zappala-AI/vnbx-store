(() => {
  let products = [], settings = {};
  const storeKey = 'vnbx-store-data-v1';
  const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
  function readStore() { try { const data = JSON.parse(localStorage.getItem(storeKey) || '{}'); products = data.products || []; settings = data.settings || {}; if (!settings.whatsapp1Phone && !settings.whatsapp) settings = { ...settings, whatsapp: '2644118290', whatsapp1Phone: '2644118290' }; } catch { products = []; settings = { whatsapp: '2644118290', whatsapp1Phone: '2644118290' }; } }
  function contacts() {
    let list = settings.whatsappContacts;
    if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = null; } }
    if (Array.isArray(list)) list = list.filter(item => item?.phone);
    if (!list?.length) list = [{ name: settings.whatsapp1Name || 'Ventas', description: settings.whatsapp1Description || '', phone: settings.whatsapp1Phone || settings.whatsapp || '' }, { name: settings.whatsapp2Name || 'Consultas', description: settings.whatsapp2Description || '', phone: settings.whatsapp2Phone || '' }].filter(item => item.phone);
    return list.map((item, index) => ({ name: item.name || `Contacto ${index + 1}`, description: item.description || item.note || '', phone: String(item.phone || '').replace(/\D/g, '') })).filter(item => item.phone);
  }
  function paymentMethods() {
    let methods = settings.paymentMethods;
    if (typeof methods === 'string') methods = methods.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    if (!Array.isArray(methods) || !methods.length) methods = ['Transferencia bancaria', 'Mercado Pago', 'Efectivo al retirar'];
    return methods;
  }
  function effectivePrice(product, quantity) {
    if (!product) return 0;
    const base = Number(product.price) || 0;
    const tiers = [['wholesaleMinUnits', 'wholesalePrice'], ['tier2MinUnits', 'tier2Price'], ['tier3MinUnits', 'tier3Price']].map(([minKey, priceKey]) => ({ min: Number(product[minKey] || 0), price: Number(product[priceKey]) })).filter(tier => tier.min > 0 && Number.isFinite(tier.price) && tier.price >= 0).sort((a, b) => a.min - b.min);
    let price = base;
    tiers.forEach(tier => { if (quantity >= tier.min) price = tier.price; });
    return product.promotionalPrice !== undefined && product.promotionalPrice !== '' ? Math.min(price, Number(product.promotionalPrice)) : price;
  }
  function cartTotals() {
    const cart = JSON.parse(localStorage.getItem('vnbx-cart-v1') || '[]');
    let units = 0, total = 0, regular = 0;
    cart.forEach(line => { const product = products.find(item => String(item.id) === String(line.id)); if (!product) return; units += line.qty; total += effectivePrice(product, line.qty) * line.qty; regular += (Number(product.oldPrice) > Number(product.price) ? Number(product.oldPrice) : Number(product.price)) * line.qty; });
    return { cart, units, total, regular, discount: Math.max(0, regular - total) };
  }
  function ensureCheckoutOptions() {
    const form = document.querySelector('#checkoutForm'), grid = form?.querySelector('.form-grid');
    if (!form || !grid || form.elements.whatsappTarget) return;
    const contact = document.createElement('div'); contact.className = 'wide checkout-contact-field'; contact.innerHTML = '<span class="field-label">Elegí el WhatsApp de destino</span><small class="field-help">Seleccioná uno de los botones. La dirección se completa en el campo “Dirección / localidad”.</small><div class="whatsapp-choices"></div><input type="hidden" name="whatsappTarget" value="0" required>';
    const payment = document.createElement('label'); payment.className = 'wide'; payment.innerHTML = 'Método de pago<select name="paymentMethod" required></select>';
    grid.append(contact, payment); populateCheckoutOptions();
  }
  function populateCheckoutOptions() {
    const form = document.querySelector('#checkoutForm'); if (!form) return;
    const contact = form.elements.whatsappTarget, choices = form.querySelector('.whatsapp-choices'), payment = form.elements.paymentMethod;
    const contactHtml = contacts().map((item, index) => `<button type="button" class="whatsapp-choice${index === 0 ? ' active' : ''}" data-wa-index="${index}">⌁ ${item.name}${item.description ? ` · ${item.description}` : ''}</button>`).join('');
    const paymentHtml = paymentMethods().map(method => `<option>${method}</option>`).join('');
    if (choices && choices.innerHTML !== contactHtml) { choices.innerHTML = contactHtml; choices.querySelectorAll('[data-wa-index]').forEach(button => button.addEventListener('click', () => { contact.value = button.dataset.waIndex; choices.querySelectorAll('[data-wa-index]').forEach(item => item.classList.toggle('active', item === button)); })); }
    if (payment && payment.innerHTML !== paymentHtml) payment.innerHTML = paymentHtml;
  }
  function syncShippingNote() {
    readStore(); const { units, total } = cartTotals();
    const free = units >= Number(settings.freeShippingUnits || 3) || total >= Number(settings.freeShippingAmount || 50000);
    const summary = document.querySelector('#cartPanel .cart-summary');
    if (summary) { const note = summary.querySelector('.shipping-note') || document.createElement('div'); note.className = 'shipping-note'; const text = free ? '🚚 Envío gratis aplicado' : '🚚 Envío a coordinar'; if (note.textContent !== text) note.textContent = text; if (!note.isConnected) summary.prepend(note); }
    updateCartDisplay();
    ensureCheckoutOptions(); populateCheckoutOptions();
  }
  function updateCartDisplay() {
    const { cart, total, regular, discount } = cartTotals();
    const matched = cart.filter(line => products.some(item => String(item.id) === String(line.id))).length;
    if (matched !== cart.length) return;
    document.querySelectorAll('#cartBody .cart-item').forEach((row, index) => {
      const line = cart[index], product = products.find(item => String(item.id) === String(line?.id));
      const priceText = row.querySelector('small');
      if (priceText && product && line) { const text = `${money(effectivePrice(product, line.qty))} · ${money(effectivePrice(product, line.qty) * line.qty)}`; if (priceText.textContent !== text) priceText.textContent = text; }
    });
    const subtotalEl = document.querySelector('#cartSubtotal'), discountEl = document.querySelector('#cartDiscount'), totalEl = document.querySelector('#cartTotal');
    if (subtotalEl) subtotalEl.textContent = money(regular);
    if (discountEl) discountEl.textContent = discount ? `- ${money(discount)}` : money(0);
    if (totalEl) totalEl.textContent = money(total);
  }
  async function nextOrderNumber() {
    try {
      const response = await fetch('/api/order-number', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('order-number');
      const body = await response.json();
      if (body.number) return String(body.number).padStart(6, '0');
      throw new Error('missing-number');
    } catch {
      const key = 'vnbx-order-sequence-local';
      const next = Number(localStorage.getItem(key) || 0) + 1;
      localStorage.setItem(key, String(next));
      return String(next).padStart(6, '0');
    }
  }
  async function checkout(event) {
    const { cart, units, total, discount } = cartTotals(); if (!cart.length) return; event.preventDefault(); event.stopImmediatePropagation(); readStore();
    const form = new FormData(event.target), list = contacts(), selected = list[Number(form.get('whatsappTarget'))] || list[0];
    if (!selected?.phone) { alert('Configurá el número de WhatsApp 1 desde Administración antes de recibir pedidos.'); return; }
    const orderNumber = await nextOrderNumber();
    const lines = cart.map(line => { const product = products.find(item => String(item.id) === String(line.id)); return `• ${product?.name || line.id} x${line.qty} — ${money(effectivePrice(product, line.qty) * line.qty)}`; }).join('\n');
    const free = units >= Number(settings.freeShippingUnits || 3) || total >= Number(settings.freeShippingAmount || 50000);
    const message = `Pedido Nº ${orderNumber}\nHola VNBX STORE, quiero realizar este pedido:\n\n${lines}\n\nTotal: ${money(total)}\nDescuentos: ${discount ? money(discount) : money(0)}\n${free ? 'Envío: GRATIS' : 'Envío: A coordinar'}\nMétodo de pago: ${form.get('paymentMethod')}\nWhatsApp destino: ${selected.name}${selected.description ? ` — ${selected.description}` : ''}\n\nCliente: ${form.get('name')}\nTeléfono: ${form.get('phone')}\nEntrega: ${form.get('delivery')}\nDirección/localidad: ${form.get('address') || 'A coordinar'}\nObservaciones: ${form.get('notes') || 'Sin observaciones'}`;
    window.open(`https://wa.me/${selected.phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }
  document.addEventListener('DOMContentLoaded', () => { readStore(); ensureCheckoutOptions(); document.querySelector('#checkoutButton')?.addEventListener('click', () => { readStore(); ensureCheckoutOptions(); populateCheckoutOptions(); }); let scheduled = false; const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; syncShippingNote(); }); }); const cartPanel = document.querySelector('#cartPanel'); if (cartPanel) observer.observe(cartPanel, { childList: true, subtree: true }); document.querySelector('#checkoutForm')?.addEventListener('submit', checkout, true); });
})();
