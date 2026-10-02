from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()

# Orden en que avanza un pedido. Solo se permite pasar al siguiente estado.
STATUS_FLOW = [
    models.OrderStatus.pendiente,
    models.OrderStatus.preparado,
    models.OrderStatus.asignado,
    models.OrderStatus.entregado,
]

@router.post("", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    user_id: int = Query(..., description="ID del cliente que hace el pedido (temporal hasta tener login)"),
    db: Session = Depends(get_db),
):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos un producto")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No existe el usuario con id {user_id}")

    order = models.Order(
        user_id=user_id,
        delivery_address=order_in.delivery_address,
        status=models.OrderStatus.pendiente,
        total_price=0,
    )

    total = 0.0
    for item in order_in.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"La cantidad del producto {item.product_id} debe ser mayor a 0")

        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"No existe el producto con id {item.product_id}")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para '{product.name}' (disponible: {product.stock})")

        # El precio se toma de la base de datos, no del cliente, para que no lo puedan alterar
        product.stock -= item.quantity
        total += product.price * item.quantity
        order.items.append(models.OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            price_at_purchase=product.price,
        ))

    order.total_price = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[schemas.OrderResponse])
def list_orders(
    status_filter: Optional[models.OrderStatus] = Query(None, alias="status", description="Filtrar por estado (opcional)"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Order)
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")
    return order


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_in: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")

    current = STATUS_FLOW.index(order.status)
    new = STATUS_FLOW.index(status_in.status)
    is_delivery_completion = (
        status_in.status == models.OrderStatus.entregado
        and order.status in (models.OrderStatus.preparado, models.OrderStatus.asignado)
    )
    if new != current + 1 and not is_delivery_completion:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede pasar de '{order.status.value}' a '{status_in.status.value}'",
        )

    order.status = status_in.status
    db.commit()
    db.refresh(order)
    return order
