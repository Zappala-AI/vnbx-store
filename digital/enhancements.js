(() => {
  const animations = [
    ['none', 'Sin animación'], ['float', 'Flotar suavemente'], ['vertical', 'Movimiento vertical'],
    ['horizontal', 'Movimiento horizontal'], ['zoom', 'Zoom suave'], ['hover-zoom', 'Zoom al pasar el mouse'],
    ['slide', 'Desplazamiento suave'], ['enter', 'Efecto de entrada'], ['spin', 'Girar suavemente'], ['pulse', 'Pulso']
  ];
  const speeds = [['slow', 'Lenta'], ['normal', 'Normal'], ['fast', 'Rápida']];
  const directions = [['up', 'Arriba'], ['down', 'Abajo'], ['left', 'Izquierda'], ['right', 'Derecha']];
  const auth = () => { const token = sessionStorage.getItem('vnbx_store_admin_token'); return token ? { Authorization: 'Bearer ' + token } : {}; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const options = values => values.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

  function installStyles() {
    if (document.getElementById('vnbxEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'vnbxEnhancementStyles';
    style.textContent = `
      @keyframes vnbxFloat{50%{transform:translateY(-7px)}}
      @keyframes vnbxVertical{50%{transform:translateY(10px)}}
      @keyframes vnbxHorizontal{50%{transform:translateX(10px)}}
      @keyframes vnbxZoom{50%{transform:scale(1.035)}}
      @keyframes vnbxSlide{0%,100%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
      @keyframes vnbxEnter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      @keyframes vnbxSpin{to{transform:rotate(360deg)}}
      @keyframes vnbxPulse{50%{opacity:.72;transform:scale(.985)}}
      .vnbx-animated{animation-duration:var(--vnbx-duration,4s);animation-timing-function:ease-in-out;animation-iteration-count:infinite;will-change:transform,opacity}
      .vnbx-float{animation-name:vnbxFloat}.vnbx-vertical{animation-name:vnbxVertical}.vnbx-horizontal{animation-name:vnbxHorizontal}.vnbx-zoom{animation-name:vnbxZoom}.vnbx-slide{animation-name:vnbxSlide}.vnbx-enter{animation-name:vnbxEnter;animation-iteration-count:1}.vnbx-spin{animation-name:vnbxSpin;animation-timing-function:linear}.vnbx-pulse{animation-name:vnbxPulse}.vnbx-hover-zoom{transition:transform .35s ease}.vnbx-hover-zoom:hover{transform:scale(1.04)}
      .vnbx-managed-banner{max-width:1160px;margin:20px auto;padding:25px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#172b4d,#32145f);display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 14px 35px #172b4d25}.vnbx-managed-banner h2{margin:0 0 6px}.vnbx-managed-banner p{margin:0;color:#dce5ff}.vnbx-managed-banner a{display:inline-block;color:#fff;text-decoration:none;border:1px solid #ffffff66;padding:10px 14px;border-radius:9px;font-weight:700;white-space:nowrap}.vnbx-managed-banner img{width:110px;height:80px;object-fit:cover;border-radius:12px}.vnbx-banner-list{display:grid;gap:8px;margin-top:15px}.vnbx-banner-row{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid var(--line,#e6e9ef);border-radius:10px;padding:10px}.vnbx-banner-row small{display:block;color:var(--muted,#667085)}.vnbx-badge{display:inline-block;margin:2px 4px 4px 0;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;background:#32145f;color:#fff}.vnbx-badge.offer{background:#b42318}.vnbx-old-price{text-decoration:line-through;color:#8a93a5;font-size:13px;margin-right:6px}
      @media(max-width:600px){.vnbx-managed-banner{display:block;margin:14px 16px}.vnbx-managed-banner a{margin-top:15px}.vnbx-banner-row{align-items:flex-start;flex-direction:column}}
      @media(prefers-reduced-motion:reduce){.vnbx-animated{animation:none!important;transition:none!important}.vnbx-managed-banner{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function addField(form, label, name, type, values) {
    if (form.elements[name]) return;
    const wrapper = document.createElement('label');
    wrapper.innerHTML = `${label}${type === 'select' ? `<select name="${name}">${options(values)}</select>` : `<input name="${name}" type="${type}" value="${type === 'checkbox' ? '' : '0'}">`}`;
    if (type === 'checkbox') wrapper.className = 'check'; wrapper.querySelector('input').checked = name === 'animationEnabled' ? true : false;
    form.querySelector('.form').appendChild(wrapper);
  }

  async function installAdmin() {
    const form = document.getElementById('productForm');
    if (!form) return;
    addField(form, 'Animación de imagen', 'imageAnimation', 'select', animations);
    addField(form, 'Velocidad', 'animationSpeed', 'select', speeds);
    addField(form, 'Dirección', 'animationDirection', 'select', directions);
    addField(form, 'Activar animación', 'animationEnabled', 'checkbox');
    addField(form, 'Precio anterior', 'previousPrice', 'number');
    addField(form, 'Stock mínimo', 'minStock', 'number');
    addField(form, 'Subcategoría', 'subcategory', 'text');
    addField(form, 'Producto WOW', 'isWow', 'checkbox');
    addField(form, 'Producto en oferta', 'isOffer', 'checkbox');
    addField(form, 'Producto nuevo', 'isNew', 'checkbox');
    const nav = document.querySelector('.nav');
    if (!nav || document.querySelector('[data-view="banners"]')) return;
    const button = document.createElement('button'); button.dataset.view = 'banners'; button.textContent = 'Banners'; nav.appendChild(button);
    const section = document.createElement('section'); section.className = 'view'; section.id = 'banners'; section.innerHTML = `<div class="panel"><div class="toolbar"><h2>Banners</h2><span class="hint">Se muestran en la tienda cuando están activos.</span></div><form id="vnbxBannerForm" class="form"><label>Título<input name="title" required></label><label>Descripción<input name="description"></label><label>Texto del botón<input name="button" value="Ver más"></label><label>Enlace<input name="link" placeholder="#catalogo"></label><label>Imagen (URL)<input name="image"></label><label>Animación<select name="animation">${options(animations)}</select></label><label>Duración (segundos)<input name="duration" type="number" min="2" max="30" value="6"></label><label class="check"><input name="active" type="checkbox" checked> Banner activo</label><div class="wide form-footer"><button class="btn">Guardar banner</button></div></form><div id="vnbxBannerList" class="vnbx-banner-list"></div></div>`;
    document.querySelector('main.layout').appendChild(section);
    const activate = view => { document.querySelectorAll('.nav button,.view').forEach(item => item.classList.remove('active')); button.classList.add('active'); document.getElementById(view).classList.add('active'); };
    button.onclick = () => activate('banners');
    const load = async () => { const response = await fetch('/api/store', { headers: auth() }); return response.ok ? response.json() : null; };
    const render = store => { const list = document.getElementById('vnbxBannerList'); const banners = store?.content?.banners || []; list.innerHTML = banners.length ? banners.map((banner, index) => `<div class="vnbx-banner-row"><span><b>${esc(banner.title)}</b><small>${banner.active === false ? 'Inactivo' : 'Activo'} · ${esc(banner.animation || 'none')}</small></span><button class="btn danger small" data-delete-banner="${index}">Eliminar</button></div>`).join('') : '<div class="empty">Todavía no hay banners.</div>'; list.querySelectorAll('[data-delete-banner]').forEach(deleteButton => deleteButton.onclick = async () => { if (!confirm('¿Eliminar este banner?')) return; const current = await load(); current.content = current.content || {}; current.content.banners = (current.content.banners || []).filter((_, itemIndex) => itemIndex !== Number(deleteButton.dataset.deleteBanner)); await fetch('/api/store', { method:'PUT', headers:{'Content-Type':'application/json', ...auth()}, body:JSON.stringify(current) }); render(current); }); };
    document.getElementById('vnbxBannerForm').onsubmit = async event => { event.preventDefault(); const store = await load(); if (!store) return alert('No se pudo leer la configuración.'); const formData = Object.fromEntries(new FormData(event.target)); store.content = store.content || {}; store.content.banners = [...(store.content.banners || []), {...formData, active:event.target.active.checked, duration:Number(formData.duration)||6}]; const response = await fetch('/api/store', { method:'PUT', headers:{'Content-Type':'application/json', ...auth()}, body:JSON.stringify(store) }); if (!response.ok) return alert('No se pudo guardar el banner.'); event.target.reset(); event.target.active.checked = true; render(store); alert('Banner guardado.'); };
    const initial = await load(); if (initial) render(initial);
  }

  function duration(speed) { return speed === 'slow' ? '7s' : speed === 'fast' ? '2.5s' : '4s'; }
  async function installStore() {
    const response = await fetch('/api/store?public=1').catch(() => null); if (!response?.ok) return; const store = await response.json(); const products = new Map((store.products || []).map(product => [product.name, product]));
    const apply = () => document.querySelectorAll('#products article').forEach(card => { const name = card.querySelector('h3')?.textContent?.trim(); const product = products.get(name); const image = card.querySelector('img'); if (!image || !product || product.animationEnabled === false) return; const type = product.imageAnimation || 'none'; if (type !== 'none') { image.classList.add('vnbx-animated', `vnbx-${type}`); image.style.setProperty('--vnbx-duration', duration(product.animationSpeed)); } });
    const decorate = () => document.querySelectorAll('#products article').forEach(card => { const name = card.querySelector('h3')?.textContent?.trim(); const product = products.get(name); if (!product) return; const title = card.querySelector('h3'); card.querySelectorAll('.vnbx-badge,.vnbx-old-price').forEach(node => node.remove()); const badges=[]; if(product.isWow) badges.push('<span class="vnbx-badge">🔥 WOW</span>'); if(product.isOffer) badges.push('<span class="vnbx-badge offer">OFERTA</span>'); if(product.isNew) badges.push('<span class="vnbx-badge">NUEVO</span>'); if(badges.length) title.insertAdjacentHTML('afterend',badges.join('')); if(product.isOffer&&product.previousPrice!==undefined&&product.previousPrice!==''){const price=card.querySelector('.product-price');if(price)price.insertAdjacentHTML('afterbegin',`<span class="vnbx-old-price">$ ${Number(product.previousPrice).toLocaleString('es-AR')}</span>`)} });
    const observer = new MutationObserver(() => { apply(); decorate(); }); const productHost = document.getElementById('products'); if (productHost) observer.observe(productHost, { childList:true, subtree:true }); apply(); decorate();
    const banner = (store.content?.banners || []).find(item => item.active !== false); if (banner && document.querySelector('.hero') && !document.getElementById('vnbxManagedBanner')) { const node = document.createElement('section'); node.id = 'vnbxManagedBanner'; node.className = 'vnbx-managed-banner'; if (banner.animation && banner.animation !== 'none') { node.classList.add('vnbx-animated', `vnbx-${banner.animation}`); node.style.setProperty('--vnbx-duration', `${Number(banner.duration)||6}s`); } node.innerHTML = `<div><h2></h2><p></p><a></a></div>`; node.querySelector('h2').textContent = banner.title || ''; node.querySelector('p').textContent = banner.description || ''; const link = node.querySelector('a'); link.textContent = banner.button || 'Ver más'; link.href = /^(https?:|#|\/)/.test(banner.link || '') ? banner.link : '#catalogo'; if (banner.image) { const image = document.createElement('img'); image.src = banner.image; image.alt = banner.title || ''; node.appendChild(image); } document.querySelector('.hero').after(node); }
  }
  installStyles(); setTimeout(() => { installAdmin().catch(() => {}); installStore().catch(() => {}); }, 0);
})();
