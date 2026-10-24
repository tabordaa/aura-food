from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

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

class UserResponse(BaseModel):
    # Sin restricciones de longitud: describe datos ya guardados, no entrada del usuario
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    address: str | None = None
    phone: str | None = None

    class Config:
        from_attributes = True

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

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True

# --- Orders ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    price_at_purchase: float

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    delivery_address: str
    phone: str | None = None
    notes: str | None = None
    payment_method: str | None = None

class OrderCreate(OrderBase):
    items: list[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderResponse(OrderBase):
    id: int
    user_id: int
    total_price: float
    status: OrderStatus
    created_at: datetime
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True

# --- Tokens ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: str | None = None
