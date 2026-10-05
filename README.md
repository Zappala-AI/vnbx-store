# VNBX STORE

Tienda estática y mobile-first sin dependencias externas de JavaScript. La tienda funciona en `tienda.html` y el panel protegido en `admin.html`.

## Acceso inicial

- Panel: `admin.html`
- Contraseña inicial: `vnbx1234`

La configuración, catálogo y categorías se guardan mediante `/api/store` en el servidor. El panel usa `/api/auth` con sesión mediante cookie, por lo que podés administrar desde el teléfono y la computadora. Para Render, definí `ADMIN_PASSWORD`; si no existe una cuenta, el primer acceso crea la contraseña elegida. Para persistencia garantizada entre reinicios/deploys, configurá `VNBX_DATA_DIR` a un disco persistente o conectá el servidor a Supabase.
