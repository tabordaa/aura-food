"""Ensaya las migraciones sobre una base con el esquema viejo y datos, como la compartida de Supabase.

Usa MIGRATION_TEST_URL (PostgreSQL en el CI) o, si no existe, una SQLite temporal.
Nunca debe apuntar a la base compartida: crea y borra tablas.
"""
import os
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from alembic import command
from app.database import normalize_database_url

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))


@pytest.fixture()
def migration_url(tmp_path, monkeypatch):
    url = normalize_database_url(os.getenv("MIGRATION_TEST_URL") or f"sqlite:///{tmp_path / 'migrations.db'}")
    # env.py usa DIRECT_URL primero: se fija explícitamente para no tocar nunca la BD del .env
    monkeypatch.setenv("DIRECT_URL", url)
    yield url
    engine = create_engine(url)
    with engine.begin() as conn:
        for table in ("alembic_version", "order_items", "orders", "products", "users"):
            conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
        if engine.dialect.name == "postgresql":
            conn.execute(text("DROP TYPE IF EXISTS orderstatus"))
            conn.execute(text("DROP TYPE IF EXISTS roleenum"))
    engine.dispose()


def alembic_config():
    config = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    config.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    return config


def test_upgrade_converts_existing_data(migration_url):
    config = alembic_config()
    command.upgrade(config, "0001_baseline")

    engine = create_engine(migration_url)
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'Ana', 'ana@test.com', 'x', 'cliente')"
        ))
        conn.execute(text(
            "INSERT INTO products (id, name, price, old_price, category, stock) "
            "VALUES (1, 'Brócoli', 2900.0, 3600.0, 'frutas', 25)"
        ))
        conn.execute(text(
            "INSERT INTO orders (id, user_id, total_price, status, delivery_address, created_at) "
            "VALUES (1, 1, 5800.0, 'pendiente', 'Calle 1', '2026-10-24 06:47:40')"
        ))
        conn.execute(text(
            "INSERT INTO order_items (id, order_id, product_id, quantity, price_at_purchase) "
            "VALUES (1, 1, 1, 2, 2900.0)"
        ))

    command.upgrade(config, "head")

    with engine.connect() as conn:
        product = conn.execute(text("SELECT price, old_price, stock, is_active FROM products")).one()
        order = conn.execute(text("SELECT total_price, delivery_fee, status, created_at, courier_id FROM orders")).one()
        conn.execute(text("UPDATE orders SET status = 'rechazado' WHERE id = 1"))

    assert Decimal(str(product.price)) == Decimal("2900.00")
    assert Decimal(str(product.old_price)) == Decimal("3600.00")
    assert product.stock == 25 and bool(product.is_active) is True
    assert Decimal(str(order.total_price)) == Decimal("5800.00")
    assert Decimal(str(order.delivery_fee)) == 0
    assert order.status == "pendiente" and order.courier_id is None
    created_at = order.created_at
    if not isinstance(created_at, datetime):  # SQLite devuelve texto
        created_at = datetime.fromisoformat(created_at)
    if created_at.tzinfo:  # PostgreSQL: el valor viejo se interpretó como UTC
        created_at = created_at.astimezone(timezone.utc)
    assert created_at.replace(tzinfo=None) == datetime(2026, 10, 24, 6, 47, 40)

    columns = {c["name"] for c in inspect(engine).get_columns("orders")}
    assert {"courier_id", "delivery_fee", "rejection_reason", "updated_at", "delivered_at"} <= columns
    engine.dispose()


def test_models_match_migrations(migration_url):
    config = alembic_config()
    command.upgrade(config, "head")

    # Falla si alguien cambia models.py sin crear la migración correspondiente
    command.check(config)
