# VNBX_STORE — ecommerce y gestión del emprendimiento

VNBX_STORE es una tienda online de venta mayorista y minorista para emprendedores. La tienda pública y el panel privado comparten la misma configuración online.

## Enlaces de producción

- [Tienda pública](https://vnbx-store.onrender.com/tienda.html)
- [Panel de administración](https://vnbx-store.onrender.com/admin.html)
- [Gestión del emprendimiento](https://vnbx-store.onrender.com/gestion.html)

## Arquitectura

- `server.mjs` sirve la tienda, protege el panel y expone las rutas de autenticación, configuración y pedidos.
- La configuración se guarda en Supabase cuando Render tiene configuradas sus variables de entorno; el archivo local se usa como respaldo de desarrollo.
- El panel usa sesión del servidor y no publica costos, proveedores, ganancias ni datos internos.
- Los clientes consultan únicamente la configuración pública y pueden buscar productos, abrir su ficha, armar el carrito y enviar el pedido al WhatsApp elegido.

Para ejecutar localmente: `node server.mjs`. No abrir los HTML directamente como archivos, porque las funciones online necesitan el servidor.

## Carpetas

- `PROVEEDORES`: datos y condiciones de negocios.
- `CATALOGOS`: productos que pueden evaluarse.
- `PRODUCTOS`: información de productos.
- `PRECIOS`: referencias de compra y venta.
- `CLIENTES`: registro para completar.
- `VENTAS`: operación de ventas.
- `GANANCIAS`: seguimiento de resultados.
- `PUBLICACIONES`: textos para redes y WhatsApp.
- `CONTACTOS`: mensajes, enlaces y seguimiento.
- `INVESTIGACION`: informes, oportunidades y auditoría.

## Regla operativa

No publicar un producto con precio, stock, material, autenticidad o condición que no esté confirmado. No comprar sin verificar precio vigente y disponibilidad. No pagar ni asumir compromisos económicos sin autorización.
