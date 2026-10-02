from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from .models import RoleEnum, OrderStatus

# --- Users ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleEnum = RoleEnum.cliente
    address: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Products ---
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    stock: int = 0

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
    phone: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class OrderResponse(OrderBase):
    id: int
    user_id: int
    total_price: float
    status: OrderStatus
    created_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

# --- Tokens ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None
