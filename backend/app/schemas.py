from datetime import datetime

from pydantic import BaseModel, EmailStr

from .models import OrderStatus, RoleEnum


# --- Users ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleEnum = RoleEnum.cliente
    address: str | None = None
    phone: str | None = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

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
