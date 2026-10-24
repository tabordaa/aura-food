"""Endurece el esquema y agrega lo necesario para el flujo completo de pedidos.

- Dinero en NUMERIC(12,2) en lugar de FLOAT.
- Fechas con zona horaria (TIMESTAMPTZ); los valores existentes se interpretan como UTC.
- Columnas obligatorias que nunca deberían ser nulas (se verificó que no hay nulos).
- Estados de pedido nuevos: rechazado y cancelado.
- Pedidos: domiciliario asignado, costo de domicilio, motivo de rechazo, fechas de actualización y entrega.
- Productos: borrado lógico (is_active). Usuarios: fecha de registro.
- Índices para las consultas frecuentes.

Ninguna operación borra datos.

Revision ID: 0002_schema_hardening
Revises: 0001_baseline
Create Date: 2026-10-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_schema_hardening"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MONEY = sa.Numeric(12, 2)
TIMESTAMPTZ = sa.DateTime(timezone=True)


def upgrade() -> None:
    is_postgres = op.get_bind().dialect.name == "postgresql"

    if is_postgres:
        # ADD VALUE no puede usarse en la misma transacción en que se crea, por eso va en su propio commit
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'rechazado'")
            op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'cancelado'")

    with op.batch_alter_table("users") as batch:
        batch.alter_column("role", nullable=False, server_default="cliente")
        batch.add_column(sa.Column("created_at", TIMESTAMPTZ, nullable=False, server_default=sa.func.now()))

    with op.batch_alter_table("products") as batch:
        batch.alter_column("price", type_=MONEY, postgresql_using="price::numeric(12,2)")
        batch.alter_column("old_price", type_=MONEY, postgresql_using="old_price::numeric(12,2)")
        batch.alter_column("stock", nullable=False, server_default="0")
        batch.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))

    with op.batch_alter_table("orders") as batch:
        batch.alter_column("user_id", nullable=False)
        batch.alter_column("total_price", type_=MONEY, postgresql_using="total_price::numeric(12,2)")
        batch.alter_column("status", nullable=False, server_default="pendiente")
        batch.alter_column(
            "created_at",
            type_=TIMESTAMPTZ,
            nullable=False,
            server_default=sa.func.now(),
            postgresql_using="created_at AT TIME ZONE 'UTC'",
        )
        batch.add_column(sa.Column("delivery_fee", MONEY, nullable=False, server_default="0"))
        batch.add_column(sa.Column("courier_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("rejection_reason", sa.Text(), nullable=True))
        batch.add_column(sa.Column("updated_at", TIMESTAMPTZ, nullable=True))
        batch.add_column(sa.Column("delivered_at", TIMESTAMPTZ, nullable=True))
        batch.create_foreign_key("orders_courier_id_fkey", "users", ["courier_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_orders_user_id", ["user_id"])
        batch.create_index("ix_orders_courier_id", ["courier_id"])
        batch.create_index("ix_orders_status", ["status"])
        batch.create_index("ix_orders_created_at", ["created_at"])

    with op.batch_alter_table("order_items") as batch:
        batch.alter_column("order_id", nullable=False)
        batch.alter_column("product_id", nullable=False)
        batch.alter_column("price_at_purchase", type_=MONEY, postgresql_using="price_at_purchase::numeric(12,2)")
        batch.create_index("ix_order_items_order_id", ["order_id"])


def downgrade() -> None:
    # Se documenta para entornos locales; en la BD compartida nunca se ejecuta downgrade.
    # Los valores 'rechazado' y 'cancelado' del enum no se pueden quitar en PostgreSQL sin recrear el tipo.
    with op.batch_alter_table("order_items") as batch:
        batch.drop_index("ix_order_items_order_id")
        batch.alter_column("price_at_purchase", type_=sa.Float())
        batch.alter_column("product_id", nullable=True)
        batch.alter_column("order_id", nullable=True)

    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_created_at")
        batch.drop_index("ix_orders_status")
        batch.drop_index("ix_orders_courier_id")
        batch.drop_index("ix_orders_user_id")
        batch.drop_constraint("orders_courier_id_fkey", type_="foreignkey")
        for column in ("delivered_at", "updated_at", "rejection_reason", "courier_id", "delivery_fee"):
            batch.drop_column(column)
        batch.alter_column("created_at", type_=sa.DateTime(), nullable=True, server_default=None)
        batch.alter_column("status", nullable=True, server_default=None)
        batch.alter_column("total_price", type_=sa.Float())
        batch.alter_column("user_id", nullable=True)

    with op.batch_alter_table("products") as batch:
        batch.drop_column("is_active")
        batch.alter_column("stock", nullable=True, server_default=None)
        batch.alter_column("old_price", type_=sa.Float())
        batch.alter_column("price", type_=sa.Float())

    with op.batch_alter_table("users") as batch:
        batch.drop_column("created_at")
        batch.alter_column("role", nullable=True, server_default=None)
