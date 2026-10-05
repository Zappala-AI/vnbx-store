(() => {
  let products = [], settings = {};
  const storeKey = 'vnbx-store-data-v1';
  const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
  function readStore() { try { const data = JSON.parse(localStorage.getItem(storeKey) || '{}'); products = data.products || []; settings = data.settings || {}; } catch { products = []; settings = {}; } }
  function contacts() {
    let list = settings.whatsappContacts;
    if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = null; } }
    if (Array.isArray(list)) list = list.filter(item => item?.phone);
    if (!list?.length) list = [{ name: settings.whatsapp1Name || 'Ventas', phone: settings.whatsapp1Phone || settings.whatsapp || '' }, { name: settings.whatsapp2Name || 'Consultas', phone: settings.whatsapp2Phone || '' }].filter(item => item.phone);
    return list.map((item, index) => ({ name: item.name || `Contacto ${index + 1}`, phone: String(item.phone || '').replace(/\D/g, '') })).filter(item => item.phone);
  }
  function paymentMethods() {
    let methods = settings.paymentMethods;
    if (typeof methods === 'string') methods = methods.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    if (!Array.isArray(methods) || !methods.length) methods = ['Transferencia bancaria', 'Mercado Pago', 'Efectivo al retirar'];
    return methods;
  }
  function effectivePrice(product, quantity) {
    if (!product) return 0;
    const wholesale = quantity >= Number(product.wholesaleMinUnits || 0) && Number(product.wholesaleMinUnits) > 0 && Number(product.wholesalePrice) >= 0 ? Number(product.wholesalePrice) : Number(product.price) || 0;
    return product.promotionalPrice !== undefined && product.promotionalPrice !== '' ? Math.min(wholesale, Number(product.promotionalPrice)) : wholesale;
  }
  function cartTotals() {
    const cart = JSON.parse(localStorage.getItem('vnbx-cart-v1') || '[]');
    let units = 0, total = 0, regular = 0;
    cart.forEach(line => { const product = products.find(item => item.id === line.id); if (!product) return; units += line.qty; total += effectivePrice(product, line.qty) * line.qty; regular += (Number(product.oldPrice) > Number(product.price) ? Number(product.oldPrice) : Number(product.price)) * line.qty; });
    return { cart, units, total, discount: Math.max(0, regular - total) };
  }
  function ensureCheckoutOptions() {
    const form = document.querySelector('#checkoutForm'), grid = form?.querySelector('.form-grid');
    if (!form || !grid || form.elements.whatsappTarget) return;
    const contact = document.createElement('label'); contact.className = 'wide'; contact.innerHTML = 'Enviar pedido a<select name="whatsappTarget" required></select>';
    const payment = document.createElement('label'); payment.className = 'wide'; payment.innerHTML = 'Método de pago<select name="paymentMethod" required></select>';
    grid.append(contact, payment); populateCheckoutOptions();
  }
  function populateCheckoutOptions() {
    const form = document.querySelector('#checkoutForm'); if (!form) return;
    const contact = form.elements.whatsappTarget, payment = form.elements.paymentMethod;
    const contactHtml = contacts().map((item, index) => `<option value="${index}">${item.name}</option>`).join('');
    const paymentHtml = paymentMethods().map(method => `<option>${method}</option>`).join('');
    if (contact && contact.innerHTML !== contactHtml) contact.innerHTML = contactHtml;
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
    const { cart, total, discount } = cartTotals();
    document.querySelectorAll('#cartBody .cart-item').forEach((row, index) => {
      const line = cart[index], product = products.find(item => item.id === line?.id);
      const priceText = row.querySelector('small');
      if (priceText && product && line) priceText.textContent = `${money(effectivePrice(product, line.qty))} · ${money(effectivePrice(product, line.qty) * line.qty)}`;
    });
    const discountEl = document.querySelector('#cartDiscount'), totalEl = document.querySelector('#cartTotal');
    if (discountEl) discountEl.textContent = discount ? `- ${money(discount)}` : money(0);
    if (totalEl) totalEl.textContent = money(total);
  }
  function checkout(event) {
    const { cart, units, total, discount } = cartTotals(); if (!cart.length) return; readStore();
    const form = new FormData(event.target), list = contacts(), selected = list[Number(form.get('whatsappTarget'))] || list[0];
    const lines = cart.map(line => { const product = products.find(item => item.id === line.id); return `• ${product?.name || line.id} x${line.qty} — ${money(effectivePrice(product, line.qty) * line.qty)}`; }).join('\n');
    const free = units >= Number(settings.freeShippingUnits || 3) || total >= Number(settings.freeShippingAmount || 50000);
    const message = `Hola VNBX STORE, quiero realizar este pedido:\n\n${lines}\n\nTotal: ${money(total)}\nDescuentos: ${discount ? money(discount) : money(0)}\n${free ? 'Envío: GRATIS' : 'Envío: A coordinar'}\nMétodo de pago: ${form.get('paymentMethod')}\n\nCliente: ${form.get('name')}\nTeléfono: ${form.get('phone')}\nEntrega: ${form.get('delivery')}\nDirección/localidad: ${form.get('address') || 'A coordinar'}\nObservaciones: ${form.get('notes') || 'Sin observaciones'}`;
    if (!selected?.phone) return; event.preventDefault(); event.stopImmediatePropagation(); window.open(`https://wa.me/${selected.phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }
  document.addEventListener('DOMContentLoaded', () => { readStore(); ensureCheckoutOptions(); let scheduled = false; const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; syncShippingNote(); }); }); observer.observe(document.body, { childList: true, subtree: true }); document.querySelector('#checkoutForm')?.addEventListener('submit', checkout, true); });
})();
