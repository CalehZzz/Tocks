# Tocks

Panel multi-tenant de inventario, caja y ventas. Inspirado en PICOInventory, pensado para que cualquier persona cree su tienda y la gestione. Backend: **Supabase** (Auth + Postgres + RLS).

## Demo actual (sin suscripción)

Puedes correr la app ya mismo en **modo demo local** (localStorage): crear cuenta, crear tienda, sedes, productos, vender en caja y ver estadísticas.

Cuando configures Supabase, la misma UI pasa a datos reales multi-tenant.

### Qué incluye

- Auth (registro / login) y perfil de cuenta
- Crear / renombrar / borrar negocios y sedes (confirmación tipando `confirmar`)
- Inventario: editar productos, imágenes (Supabase Storage), papelera
- Categorías en apartado propio
- Caja POS en ruta aparte compartible (`/caja/:slug`) + invitaciones por correo
- Anular / restaurar ventas (stock y estadísticas se actualizan)
- Estadísticas mensuales (solo ventas activas)

### Aún no (próximas iteraciones)

- Suscripciones / billing
- Pedidos web, facturas PDF, sellos, créditos, calendario, grupos por color

## Arranque local

```bash
npm install
npm run dev
```

Sin variables de entorno → modo demo local.

Con Supabase:

```bash
cp .env.example .env.local
# llena SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Abre `http://localhost:5173/` (no el HTML crudo en GitHub).

## GitHub Pages (sitio público)

Tras cambiar a **GitHub Actions**, vuelve a correr el workflow (o haz un push a `main`) para publicar el build nuevo.

La URL del sitio: `https://calehzzz.github.io/Tocks/`

1. En el repo: **Settings → Secrets and variables → Actions**, crea:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
2. **Settings → Pages → Build and deployment → Source**: elige **GitHub Actions** (no “Deploy from a branch”).
3. Cada push a `main` construye y publica el `dist/`.

Si Pages sigue apuntando a la rama `main` en `/`, verás pantalla en blanco: eso sirve el `index.html` de desarrollo, no el build.

En Supabase → Authentication → URL configuration, agrega:
- Site URL: `https://calehzzz.github.io/Tocks/`
- Redirect URLs: `https://calehzzz.github.io/Tocks/**`


## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En **Authentication → Providers**, deja Email habilitado.
   - Para demo rápida: desactiva “Confirm email” si quieres entrar sin verificar.
3. Corre las migraciones en el SQL Editor (en orden):
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_fix_stores_returning.sql`
   - `supabase/migrations/003_ops_invites_void_sales.sql` (invites, anular ventas, Storage de imágenes)
   - `supabase/migrations/004_product_images_limits.sql` (límite 1 MB + solo MIME de imagen)
4. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **Publishable key** (`sb_publishable_...`) → `SUPABASE_PUBLISHABLE_KEY`
5. Reinicia `npm run dev`.

### Qué NO hace falta en el frontend

- **Direct connection string** / database password: solo para migraciones CLI o tools de servidor. No la pongas en el cliente.
- **Secret key / service_role**: nunca en el browser.

## Scripts

| Comando        | Uso                |
| -------------- | ------------------ |
| `npm run dev`  | Dev server         |
| `npm run build`| Build producción   |
| `npm run preview` | Preview del build |

## Modelo multi-tenant (resumen)

`stores` → `store_members` → `locations` / `categories` / `products` → `product_stock` → `sales` + `sale_items`

RLS: solo miembros de la tienda ven y escriben sus datos. El checkout POS usa la función `checkout_sale` (transacción atómica).
