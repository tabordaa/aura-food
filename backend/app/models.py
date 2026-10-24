import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func, true
from sqlalchemy.orm import relationship

from .database import Base

# Los cambios de esquema se hacen con migraciones de Alembic (backend/alembic/versions), no editando solo este archivo.

# Dinero con decimales exactos: FLOAT acumula errores de redondeo (0.1 + 0.2 != 0.3)
Money = Numeric(12, 2)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RoleEnum(str, enum.Enum):
    cliente = "cliente"
    admin = "admin"
    domiciliario = "domiciliario"

class OrderStatus(str, enum.Enum):
    pendiente = "pendiente"
    preparado = "preparado"
    asignado = "asignado" # Asignado a un domiciliario
    entregado = "entregado"
    rechazado = "rechazado" # La tienda no puede atenderlo
    cancelado = "cancelado" # El cliente lo canceló antes de que lo aceptaran

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.cliente, server_default=RoleEnum.cliente.value)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now())

    # Relación uno-a-muchos con Orders
    orders = relationship("Order", back_populates="customer", foreign_keys="Order.user_id")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Money, nullable=False)
    old_price = Column(Money, nullable=True)
    category = Column(String, index=True)
    image_url = Column(String, nullable=True)
    stock = Column(Integer, nullable=False, default=0, server_default="0")
    tag = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    # Borrado lógico: un producto con pedidos históricos no se puede eliminar de verdad
    is_active = Column(Boolean, nullable=False, default=True, server_default=true())

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    courier_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    total_price = Column(Money, nullable=False)
    delivery_fee = Column(Money, nullable=False, default=0, server_default="0")
    status = Column(
        Enum(OrderStatus),
        nullable=False,
        default=OrderStatus.pendiente,
        server_default=OrderStatus.pendiente.value,
        index=True,
    )
    delivery_address = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    payment_method = Column(String, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=utc_now)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("User", back_populates="orders", foreign_keys=[user_id])
    courier = relationship("User", foreign_keys=[courier_id])
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Money, nullable=False) # Guardamos el precio al momento de comprar por si cambia después

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
