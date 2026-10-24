"""Esquema inicial, idéntico al que existía antes de usar Alembic.

En una base de datos que ya tiene estas tablas (como la compartida de Supabase) NO se ejecuta:
se marca como aplicada con `alembic stamp 0001_baseline`. En una base vacía crea todo desde cero.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-10-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

role_enum = sa.Enum("cliente", "admin", "domiciliario", name="roleenum")
status_enum = sa.Enum("pendiente", "preparado", "asignado", "entregado", name="orderstatus")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", role_enum, nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_name", "users", ["name"])

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("stock", sa.Integer(), nullable=True),
        sa.Column("old_price", sa.Float(), nullable=True),
        sa.Column("tag", sa.String(), nullable=True),
        sa.Column("origin", sa.String(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
    )
    op.create_index("ix_products_id", "products", ["id"])
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_category", "products", ["category"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("status", status_enum, nullable=True),
        sa.Column("delivery_address", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_orders_id", "orders", ["id"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price_at_purchase", sa.Float(), nullable=False),
    )
    op.create_index("ix_order_items_id", "order_items", ["id"])


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("products")
    op.drop_table("users")
    status_enum.drop(op.get_bind(), checkfirst=True)
    role_enum.drop(op.get_bind(), checkfirst=True)
