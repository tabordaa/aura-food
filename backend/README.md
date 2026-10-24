# Aura Food — Backend

API REST con **FastAPI**, **SQLAlchemy 2** y **PostgreSQL**. Todas las rutas cuelgan de `/api`; la documentación
interactiva está en http://localhost:8000/docs (se desactiva con `ENV=production`).

## Puesta en marcha

Requisito: **Python 3.11** (ver `.python-version`).

```bash
python -m venv venv
venv\Scripts\activate             # Mac/Linux: source venv/bin/activate
pip install -r requirements-dev.txt   # incluye pytest y ruff; en producción basta requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Variables de entorno (`.env`)

Todas están documentadas en [`.env.example`](.env.example). Las importantes:

| Variable | Obligatoria | Para qué |
|----------|-------------|----------|
| `DATABASE_URL` | Sí | Conexión de la app (pooler de Supabase). Sin ella se usa SQLite local (`sql_app.db`). |
| `DIRECT_URL` | Para migrar | Conexión directa que usa Alembic para cambiar el esquema. |
| `SECRET_KEY` | En producción | Firma de los JWT. Si está vacía en desarrollo se usa una temporal (las sesiones se cierran al reiniciar). Con `ENV=production` la API no arranca sin ella. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (480) | Duración de la sesión. |
| `CORS_ORIGINS` | No | Orígenes del frontend, separados por coma. |
| `DELIVERY_FEE` / `DELIVERY_MINUTES` | No (5000 / 45) | Costo de domicilio que suma el servidor y tiempo estimado que ve el cliente. |
| `STORE_UTC_OFFSET` | No (-5) | Zona horaria de la tienda para los indicadores "de hoy". |
| `SEED_*_PASSWORD` | Para los seeds | Contraseñas de los usuarios que crean `seed.py` y `seed_demo.py`. |

Nunca subas `.env` al repositorio: tiene la cadena de conexión real de la BD compartida.

## Login con Google (opcional)

Está desactivado mientras `GOOGLE_CLIENT_ID` (backend) y `VITE_GOOGLE_CLIENT_ID` (frontend) estén vacíos: el botón no
aparece y `POST /api/auth/google` responde 503. Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto (o usa uno existente).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre "Aura Food" y tu correo de
   soporte. Mientras esté en modo *Prueba*, agrega como *usuarios de prueba* las cuentas que van a entrar.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo *Aplicación web*.
   En *Orígenes autorizados de JavaScript* agrega `http://localhost:5173` (y la URL donde se publique el frontend).
   No hace falta ningún URI de redirección.
4. Copia el *ID de cliente* (termina en `.apps.googleusercontent.com`) en `GOOGLE_CLIENT_ID` del `backend/.env` y en
   `VITE_GOOGLE_CLIENT_ID` del `frontend/.env`, y reinicia ambos servidores.

El backend verifica la firma del token con las llaves públicas de Google, que fue emitido para este ID de cliente y que
el correo esté verificado. Si el correo ya existe, inicia sesión en esa cuenta; si no, crea un cliente nuevo. El ID de
cliente no es secreto (va en el navegador); el *secreto de cliente* no se usa.

## Base de datos y migraciones (Alembic)

El esquema se gestiona solo con migraciones en `alembic/versions/`:

```bash
alembic upgrade head                       # aplicar migraciones pendientes
alembic revision -m "add products.brand"   # crear una nueva (edítala a mano)
alembic current                            # ver en qué versión está la BD
```

- **Todo cambio en `app/models.py` necesita su migración.** El test `test_models_match_migrations` y el job
  `migrations` del CI fallan si no coinciden.
- La BD de Supabase es **compartida**: nunca ejecutes `alembic downgrade`, `DROP` ni `TRUNCATE` contra ella.

## Datos de prueba

```bash
python seed.py        # admin, domiciliario, cliente de prueba y catálogo base
python seed_demo.py   # catálogo completo con fotos, 3 clientes demo y pedidos en todos los estados
```

Ambos son **idempotentes** (se pueden correr varias veces), no cambian contraseñas existentes y no tocan el stock de
productos que ya existen.

## Tests y linter

```bash
pytest           # usa SQLite en memoria: no necesita la BD real
ruff check .
```

`tests/test_migrations.py` también se puede ensayar contra un PostgreSQL limpio definiendo `MIGRATION_TEST_URL`
(así lo hace el CI).

## Endpoints

| Método | Ruta | Quién |
|--------|------|-------|
| POST | `/auth/register`, `/auth/login` | Público (el registro siempre crea clientes) |
| POST | `/auth/google` | Público (si `GOOGLE_CLIENT_ID` está definido) |
| GET / PATCH | `/auth/me` | Usuario autenticado (solo nombre, dirección y celular) |
| GET | `/products` | Público (`?sort=best_sellers`; incluye `units_sold`) |
| GET | `/products/manage` · POST `/products` · PUT/DELETE `/products/{id}` | Admin (DELETE = desactivar) |
| POST | `/orders` · GET `/orders/me` | Usuario autenticado (sus propios pedidos) |
| GET | `/orders/{id}` | Dueño del pedido, admin o domiciliario |
| GET | `/orders` | Admin y domiciliario |
| PATCH | `/orders/{id}/status` | Admin (aceptar: pendiente → preparado) |
| POST | `/orders/{id}/reject` | Admin, con motivo (devuelve el stock) |
| POST | `/orders/{id}/cancel` | Dueño, mientras esté pendiente (devuelve el stock) |
| GET | `/orders/courier/me` · POST `/orders/{id}/take` · `/orders/{id}/deliver` | Domiciliario |
| GET | `/admin/stats` · `/admin/clients` | Admin |
| GET | `/config` | Público (domicilio y tiempo estimado) |
