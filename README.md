# Aura Food 🛒

Supermercado en línea sin intermediarios: los clientes piden desde casa, la tienda acepta y prepara los pedidos, y
un domiciliario los entrega. La tienda gestiona su catálogo y su inventario sin pagar comisiones a una plataforma.

Proyecto universitario de Herramientas III (2026-2).

## Qué puede hacer cada rol

| Rol | Pantallas | Qué hace |
|-----|-----------|----------|
| **Cliente** | `/catalog`, `/pedidos`, `/pedidos/:id`, `/perfil` | Busca y filtra productos (más vendidos, ofertas, orgánicos), arma su carrito (se guarda en el navegador y respeta el stock), paga con tarjeta simulada o en efectivo, sigue su pedido en tiempo real, lo cancela mientras está pendiente y edita su dirección y celular. |
| **Admin** (tienda) | `/admin`, `/admin/productos`, `/admin/clientes` | Acepta o rechaza pedidos (con motivo; el stock vuelve al inventario), ve quién los entrega, crea/edita/desactiva productos y su stock, y consulta clientes e indicadores del día. |
| **Domiciliario** | `/delivery` | Toma pedidos preparados, los marca como entregados y consulta su historial. |

### Flujo de un pedido

```
pendiente ──(admin acepta)──► preparado ──(domiciliario lo toma)──► asignado ──(lo entrega)──► entregado
    ├──(admin rechaza con motivo)──► rechazado     ┐
    └──(cliente cancela)───────────► cancelado     ┘ el stock vuelve al inventario
```

El backend valida cada transición: quién puede hacerla y desde qué estado.

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Python 3.11 · FastAPI · SQLAlchemy 2 · Pydantic 2 · Alembic · JWT (PyJWT) · bcrypt (pwdlib) |
| Base de datos | PostgreSQL 17 (Supabase, compartida por el equipo) |
| Frontend | React 19 · Vite 8 · React Router 7 · CSS Modules (sin librerías de UI) |
| Calidad | pytest (BD SQLite en memoria) · ruff · ESLint 9 · GitHub Actions |

## Cómo correrlo

Requisitos: **Python 3.11** y **Node.js 20.19 o superior** (recomendado 22/24 LTS).

### 1. Backend (API en http://localhost:8000)

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # completa DATABASE_URL, DIRECT_URL y SECRET_KEY (pídeselos al Tech Lead)
alembic upgrade head              # deja el esquema de la BD al día
uvicorn app.main:app --reload
```

La documentación interactiva de la API queda en http://localhost:8000/docs.
Más detalles (variables, migraciones, datos de prueba y tests) en [backend/README.md](backend/README.md).

### 2. Frontend (http://localhost:5173)

```bash
cd frontend
npm ci
cp .env.example .env              # opcional: VITE_API_URL si la API no está en localhost:8000
npm run dev
```

### 3. Usuarios

- `python seed.py` crea el admin, el domiciliario y un cliente de prueba con las contraseñas de `SEED_*_PASSWORD`
  (ver `backend/.env.example`).
- `python seed_demo.py` agrega el catálogo completo (33 productos con foto), tres clientes demo
  (`ana.gomez@`, `carlos.rios@` y `valentina.mora@demo.aurafood.com`, contraseña `SEED_DEMO_PASSWORD`) y pedidos en
  todos los estados.
- Cualquiera puede registrarse en `/register`; las cuentas nuevas siempre son de cliente.

Las credenciales de la BD compartida y de los usuarios de prueba **no** están en el repositorio: pídeselas al
Tech Lead.

## Scripts útiles

| Dónde | Comando | Para qué |
|-------|---------|----------|
| `backend/` | `pytest` | Tests de la API (no necesitan base de datos) |
| `backend/` | `ruff check .` | Linter |
| `backend/` | `alembic revision -m "..."` | Nueva migración (todo cambio en `models.py` necesita una) |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run build` | Build de producción en `dist/` |

## Integración continua

Cada PR y cada push a `main`/`develop` corren en GitHub Actions ([ci.yml](.github/workflows/ci.yml)):

- **backend**: `ruff check` + `pytest`.
- **migrations**: aplica todas las migraciones de Alembic sobre un PostgreSQL 17 limpio y verifica que coincidan con
  los modelos.
- **frontend**: `npm run lint` + `npm run build`.

Un PR solo se une cuando los tres pasan.

## Seguridad (resumen)

- Los permisos se validan **en el backend** por rol y por dueño del recurso; las rutas protegidas del frontend son solo
  para la experiencia de uso.
- Precios, domicilio y totales se calculan en el servidor con los datos de la BD.
- El pago con tarjeta es **simulado**: los datos de la tarjeta nunca salen del navegador.
- Contraseñas con bcrypt; sesiones con JWT de 8 horas (`ACCESS_TOKEN_EXPIRE_MINUTES`).

## Estructura

```
backend/
  app/            # main.py, models.py, schemas.py, oauth2.py, settings.py y routers/ (auth, orders, products, admin, config)
  alembic/        # migraciones de la base de datos
  tests/          # pytest
  seed.py         # usuarios por rol y catálogo base
  seed_demo.py    # datos de demostración
frontend/src/
  pages/          # auth, catalog, orders, profile, admin, delivery
  components/     # Navbar, ProductCard, CartDrawer, CheckoutModal…
  services/       # llamadas a la API (fetchWithAuth)
  hooks/ utils/ context/
```

## Cómo contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md): ramas, formato de commits y Pull Requests.
