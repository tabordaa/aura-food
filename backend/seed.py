"""Pobla la base de datos con usuarios por rol y el catálogo inicial.

Es idempotente: se puede ejecutar varias veces sin duplicar datos ni pisar contraseñas existentes.
Las contraseñas se leen de variables de entorno (ver .env.example); si falta una, ese usuario no se crea.

Uso (con el esquema al día): alembic upgrade head && python seed.py
"""
import os
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models, utils
from app.database import SessionLocal

USERS = [
    {
        "email": "admin@aurafood.com",
        "name": "Administrador Principal",
        "role": models.RoleEnum.admin,
        "address": "Oficina Central",
        "phone": "3000000001",
        "password_env": "SEED_ADMIN_PASSWORD",
    },
    {
        "email": "domicilio@aurafood.com",
        "name": "Repartidor Express",
        "role": models.RoleEnum.domiciliario,
        "address": "Punto de Despacho",
        "phone": "3000000002",
        "password_env": "SEED_COURIER_PASSWORD",
    },
    {
        "email": "test@aurafood.com",
        "name": "Cliente de Prueba",
        "role": models.RoleEnum.cliente,
        "address": "Av. Siempre Viva 123",
        "phone": "3001234567",
        "password_env": "SEED_CUSTOMER_PASSWORD",
    },
]

PRODUCTS = [
    {"id": 1, "name": "Aguacate Hass Maduro", "price": 4500, "old_price": None, "tag": "Fresco", "origin": "🌿 Cosecha Nacional", "unit": "x 500g", "category": "frutas", "stock": 50, "image_url": "https://images.unsplash.com/photo-1669143017427-26801de9bcc6?q=80&w=1114&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
    {"id": 2, "name": "Manzanas Rojas Frescas", "price": 5200, "old_price": None, "tag": "Popular", "origin": "✈️ Importada Premium", "unit": "x 1 kg", "category": "frutas", "stock": 30, "image_url": "https://plus.unsplash.com/premium_photo-1667049292983-d2524dd0ef08?q=80&w=1149&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
    {"id": 3, "name": "Leche Entera Orgánica", "price": 3800, "old_price": None, "tag": "Orgánico", "origin": "🔬 100% Pasteurizada", "unit": "x 1000ml", "category": "dairy", "stock": 40, "image_url": "https://images.unsplash.com/photo-1635436338433-89747d0ca0ef?q=80&w=943&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
    {"id": 4, "name": "Brócoli Fresco Criollo", "price": 2900, "old_price": 3600, "tag": "-20% Hoy", "origin": "🌱 Huerta Directa", "unit": "x 500g", "category": "frutas", "stock": 25, "image_url": "https://images.unsplash.com/photo-1685504445355-0e7bdf90d415?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
    {"id": 5, "name": "Pechuga de Pollo Campero", "price": 12400, "old_price": None, "tag": "Popular", "origin": "🌿 Libre de Antibióticos", "unit": "x 800g", "category": "meat", "stock": 20, "image_url": "https://images.unsplash.com/photo-1682991136736-a2b44623eeba?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
    {"id": 6, "name": "Croissant de Mantequilla", "price": 6500, "old_price": None, "tag": "Horneado Hoy", "origin": "🏠 Masa Madre 24h", "unit": "x 4 uds", "category": "bakery", "stock": 60, "image_url": ""},
    {"id": 7, "name": "Tomate Chonto Seleccionado", "price": 3400, "old_price": None, "tag": "Fresco", "origin": "⭐ Calidad Superior", "unit": "x 1 kg", "category": "frutas", "stock": 15, "image_url": ""},
    {"id": 8, "name": "Detergente Ecológico", "price": 14900, "old_price": None, "tag": "Biodegradable", "origin": "🌿 Aroma Eucalipto", "unit": "x 1.5 L", "category": "cleaning", "stock": 100, "image_url": ""},
]

# El stock no se pisa en productos existentes: es inventario real que cambia con los pedidos
PRODUCT_FIELDS_TO_SYNC = ("name", "price", "old_price", "tag", "origin", "unit", "category", "image_url")


def seed_users(db: Session) -> None:
    for data in USERS:
        password = os.getenv(data["password_env"])
        user = db.query(models.User).filter(models.User.email == data["email"]).first()

        if user:
            # Nunca se sobrescribe una contraseña válida; solo se repara un hash corrupto
            if password and not utils.is_valid_hash(user.password_hash):
                user.password_hash = utils.hash_password(password)
                print(f"Contraseña reparada para {data['email']}")
            continue

        if not password:
            print(f"Omitido {data['email']}: define {data['password_env']} para crearlo")
            continue

        fields = {k: v for k, v in data.items() if k != "password_env"}
        db.add(models.User(**fields, password_hash=utils.hash_password(password)))
        print(f"Usuario creado: {data['email']} ({data['role'].value})")


def seed_products(db: Session) -> None:
    for data in PRODUCTS:
        product = db.get(models.Product, data["id"])
        if product:
            for field in PRODUCT_FIELDS_TO_SYNC:
                setattr(product, field, data[field])
        else:
            db.add(models.Product(**data))
    print(f"{len(PRODUCTS)} productos sincronizados")


def sync_id_sequences(db: Session) -> None:
    """Ajusta las secuencias de PostgreSQL después de insertar filas con id explícito.

    Si no se ajustan, el siguiente INSERT sin id reutiliza un id existente y falla por clave duplicada.
    """
    if db.bind.dialect.name != "postgresql":
        return
    for table in ("users", "products"):
        db.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
        ))


def seed(db: Session) -> None:
    seed_users(db)
    seed_products(db)
    db.flush()
    sync_id_sequences(db)
    db.commit()


def main() -> int:
    db = SessionLocal()
    try:
        seed(db)
    except Exception as error:
        db.rollback()
        print(f"Error al poblar la base de datos: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()
    print("Proceso terminado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
