from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .models import OrderStatus, RoleEnum


# --- Users ---
class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    address: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=20)

class UserCreate(UserBase):
    # Sin campo "role": el registro público siempre crea clientes (cualquier "role" enviado se ignora).
    # bcrypt solo usa los primeros 72 bytes, por eso se limita la longitud.
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        # El límite de bcrypt es en bytes: con tildes o emojis se puede pasar de 72 bytes con menos caracteres
        if len(value.encode("utf-8")) > 72:
            raise ValueError("La contraseña es demasiado larga")
        return value

class UserResponse(BaseModel):
    # Sin restricciones de longitud: describe datos ya guardados, no entrada del usuario
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    address: str | None = None
    phone: str | None = None

    model_config = ConfigDict(from_attributes=True)

# --- Products ---
class ProductBase(BaseModel):
    name: str
    description: str | None = None
    price: float
    old_price: float | None = None
    category: str
    image_url: str | None = None
    stock: int = 0
    tag: str | None = None
    origin: str | None = None
    unit: str | None = None

# Categorías que muestra el catálogo (frontend: CatalogPage.CATEGORIES)
ProductCategory = Literal["frutas", "dairy", "meat", "cleaning", "bakery"]

class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    price: float = Field(gt=0, le=10_000_000)
    old_price: float | None = Field(default=None, gt=0, le=10_000_000)
    category: ProductCategory
    # Solo enlaces http(s): evita esquemas como javascript: o data: en la imagen
    image_url: str | None = Field(default=None, max_length=500, pattern=r"^https?://\S+$")
    stock: int = Field(default=0, ge=0, le=100_000)
    tag: str | None = Field(default=None, max_length=40)
    origin: str | None = Field(default=None, max_length=60)
    unit: str | None = Field(default=None, max_length=40)

    @field_validator("name", "description", "image_url", "tag", "origin", "unit", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        # Los formularios envían "" en los campos opcionales vacíos
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @model_validator(mode="after")
    def old_price_above_price(self):
        if self.old_price is not None and self.old_price <= self.price:
            raise ValueError("El precio anterior debe ser mayor que el precio actual para mostrarse como oferta")
        return self

class ProductUpdate(ProductCreate):
    is_active: bool = True

class ProductResponse(ProductBase):
    id: int
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

# --- Orders ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int

class OrderItemCreate(OrderItemBase):
    quantity: int = Field(gt=0, le=99)

class OrderItemResponse(OrderItemBase):
    id: int
    price_at_purchase: float
    # Datos del producto para mostrar el pedido sin pedir el catálogo completo
    product_name: str | None = None
    product_image_url: str | None = None
    product_unit: str | None = None

    model_config = ConfigDict(from_attributes=True)

class OrderBase(BaseModel):
    delivery_address: str
    phone: str | None = None
    notes: str | None = None
    payment_method: str | None = None

class OrderCreate(OrderBase):
    # Restricciones solo en la entrada; OrderResponse hereda los tipos simples para no fallar con pedidos antiguos
    delivery_address: str = Field(min_length=5, max_length=200)
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9 -]{7,20}$")
    notes: str | None = Field(default=None, max_length=300)
    payment_method: Literal["card", "cash"] | None = None
    items: list[OrderItemCreate] = Field(min_length=1, max_length=50)

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderReject(BaseModel):
    # El cliente ve este motivo en el seguimiento de su pedido
    reason: str = Field(min_length=3, max_length=300)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Escribe el motivo del rechazo")
        return value

class UserSummary(BaseModel):
    id: int
    name: str | None = None

    model_config = ConfigDict(from_attributes=True)

class OrderResponse(OrderBase):
    id: int
    user_id: int
    total_price: float
    delivery_fee: float = 0
    status: OrderStatus
    rejection_reason: str | None = None
    courier: UserSummary | None = None
    created_at: datetime
    updated_at: datetime | None = None
    delivered_at: datetime | None = None
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)

# --- Tokens ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: str | None = None
