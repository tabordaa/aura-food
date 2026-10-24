"""Ubicación de entrega del pedido (latitud y longitud que el cliente marca en el mapa).

Columnas opcionales: los pedidos anteriores quedan sin ubicación y simplemente no muestran el mapa.

Revision ID: 0003_order_location
Revises: 0002_schema_hardening
Create Date: 2026-10-24
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_order_location"
down_revision: str | None = "0002_schema_hardening"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COORDINATE = sa.Numeric(9, 6)


def upgrade() -> None:
    op.add_column("orders", sa.Column("delivery_lat", COORDINATE, nullable=True))
    op.add_column("orders", sa.Column("delivery_lng", COORDINATE, nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "delivery_lng")
    op.drop_column("orders", "delivery_lat")
