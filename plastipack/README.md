# Plastipack

Sistema de gestión de manufactura de plásticos.
**Stack:** Node.js · Express · MongoDB (Mongoose) · EJS · Passport (Google OAuth 2.0).
**Arquitectura:** MVC.
**UI:** Mobile-first, dark mode con efecto glass (estilo iOS) y acentos neón azul.

---

## Requisitos

- Node.js ≥ 18
- MongoDB (local o Atlas)
- Credenciales de Google OAuth 2.0

---

## Instalación rápida

```bash
git clone <tu-repo>
cd plastipack
cp .env.example .env
# edita .env con tus credenciales
npm install
npm start
```

Abre: http://localhost:3000

---

## Configurar Google OAuth 2.0

**Para una guía paso a paso completa, ve a:** [`../GOOGLE_AUTH_SETUP.md`](../GOOGLE_AUTH_SETUP.md)

Resumen rápido:

1. Ve a https://console.cloud.google.com/apis/credentials
2. *Create credentials → OAuth client ID → Web application*
3. **Authorized JavaScript origins:** la URL pública (`http://localhost:3000` o tu URL de Codespaces).
4. **Authorized redirect URIs:** `${BASE_URL}/auth/google/callback`
5. Copia *Client ID* y *Client Secret* al `.env` en las variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

---

## GitHub Codespaces

1. Crea el codespace desde el repo.
2. En la pestaña **PORTS**, marca el puerto **3000** como **Public** (Codespaces te dará una URL `https://...-3000.app.github.dev`).
3. Pon esa URL en `.env` como `BASE_URL` y agrégala a las *Authorized redirect URIs* en Google Cloud (con sufijo `/auth/google/callback`).
4. Para MongoDB, lo más simple es crear un cluster gratuito en **MongoDB Atlas** y poner la URI en `MONGO_URI` (recuerda incluir `0.0.0.0/0` en *Network Access* del cluster mientras pruebas).
5. `npm install && npm start`.

---

## Roles

| Rol         | Permisos |
|-------------|----------|
| **Vendedor** | Crear y consultar pedidos. **No** crea referencias. |
| **Jefe de Producción** | Crear referencias, gestionar órdenes, asignar roles, ver reportes. **No** crea pedidos. |
| **Operario** | Registrar su producción diaria por selladora (1 a 5). |
| **Admin** | Acceso a todo lo anterior. |

### Asignación inicial de roles

Cuando un usuario inicia sesión por primera vez con Google:

- Si su email aparece en `ADMIN_EMAILS`, `JEFE_EMAILS`, `VENDEDOR_EMAILS` u `OPERARIO_EMAILS` (en `.env`), recibe ese rol automáticamente.
- Si no aparece, su rol es `pendiente` y debe ser asignado por un Jefe desde **Usuarios**.

> Para tu primer ingreso, agrega tu email a `ADMIN_EMAILS` antes de loguearte.

---

## Reglas de negocio implementadas

Todas tomadas del documento `requisitos.pdf`:

- ✅ Referencias con SKU único, tipo (bolsa / rollo / lámina), materia prima, dimensiones, impresión y destino (interno / externo).
- ✅ Pedidos creados por el vendedor con múltiples referencias y **fecha de entrega mínima de 15 días** (validada a nivel de modelo).
- ✅ **Estado individual por referencia** dentro de un pedido (en espera, en producción, completado, entregado). El estado general del pedido se recalcula automáticamente.
- ✅ Al crearse un pedido, sus items pasan automáticamente a producción.
- ✅ **5 selladoras** con control individual; el operario selecciona la suya.
- ✅ Registro por turno: número de rollo, hora inicio/fin, cantidad producida y desperdicio en kg.
- ✅ **Una misma referencia puede ser trabajada simultáneamente por varias selladoras** — los logs se acumulan en el item del pedido y este queda disponible mientras `producido < cantidad`.
- ✅ Reportes agregados por selladora y por operario, con filtro de fechas.

---

## Estructura del proyecto

```
plastipack/
├── app.js                  # Servidor Express
├── config/
│   ├── db.js               # Conexión Mongo
│   └── passport.js         # Google OAuth strategy
├── middleware/
│   ├── auth.js             # ensureAuth, ensureRoleAssigned
│   └── roles.js            # requireRole(...)
├── models/
│   ├── User.js             # Usuario + rol
│   ├── Reference.js        # Catálogo SKU (~150K refs)
│   ├── Order.js            # Pedido con items y estado por item
│   └── ProductionLog.js    # Turno por operario / selladora
├── controllers/
│   ├── authController.js
│   ├── orderController.js
│   ├── referenceController.js
│   ├── productionController.js
│   └── reportController.js
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── orders.js
│   ├── references.js
│   ├── production.js
│   └── reports.js
├── views/
│   ├── layout.ejs          # Estructura base + glass topbar
│   ├── login.ejs           # Sign in con Google
│   ├── dashboard.ejs       # Inicio del jefe
│   ├── operario/
│   │   └── index.ejs       # Pantalla móvil del operario
│   ├── vendedor/
│   │   ├── mis-pedidos.ejs
│   │   ├── nuevo-pedido.ejs
│   │   └── detalle-pedido.ejs
│   └── jefe/
│       ├── referencias/{index,nueva}.ejs
│       ├── ordenes/index.ejs
│       ├── reportes.ejs
│       └── usuarios.ejs
├── public/
│   └── css/style.css       # Tema dark + glass + neon blue
├── seed.js                 # Datos de prueba (opcional)
├── .env.example
├── .gitignore
└── package.json
```

---

## Datos de prueba

```bash
npm run seed
```

Crea algunas referencias y un pedido de demostración. Útil para ver la UI sin partir de cero.

---

## Scripts

| Comando | Acción |
|---------|--------|
| `npm start` | Producción |
| `npm run dev` | Desarrollo con nodemon |
| `npm run seed` | Carga datos de prueba |

---

## Licencia

MIT — uso libre para fines educativos y comerciales.
