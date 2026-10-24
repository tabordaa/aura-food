
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from .. import models, oauth2, schemas
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    # Si el mismo producto viene repetido se suman las cantidades
    quantities: dict[int, int] = {}
    for item in order_in.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    order = models.Order(
        user_id=current_user.id,
        delivery_address=order_in.delivery_address,
        phone=order_in.phone,
        notes=order_in.notes,
        payment_method=order_in.payment_method,
        status=models.OrderStatus.pendiente,
        total_price=0,
    )

    total = Decimal(0)
    # Se bloquean las filas de los productos (SELECT ... FOR UPDATE) hasta el commit para que dos pedidos
    # simultáneos no vendan el mismo stock. Se recorren por id para que todos bloqueen en el mismo orden
    # y no se produzcan interbloqueos.
    for product_id in sorted(quantities):
        quantity = quantities[product_id]
        product = (
            db.query(models.Product)
            .filter(models.Product.id == product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail=f"No existe el producto con id {product_id}")
        if product.stock < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}' (disponible: {product.stock})",
            )

        # El precio se toma de la base de datos, no del cliente, para que no lo puedan alterar
        product.stock -= quantity
        total += product.price * quantity
        order.items.append(models.OrderItem(
            product_id=product.id,
            quantity=quantity,
            price_at_purchase=product.price,
        ))

    order.total_price = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# Qué estados puede asignar cada rol del personal
STATUS_PERMISSIONS = {
    models.RoleEnum.admin: set(models.OrderStatus),
    models.RoleEnum.domiciliario: {models.OrderStatus.asignado, models.OrderStatus.entregado},
}

STAFF_ROLES = (models.RoleEnum.admin, models.RoleEnum.domiciliario)


def get_order_or_404(order_id: int, db: Session) -> models.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")
    return order


@router.get("", response_model=list[schemas.OrderResponse])
def list_orders(
    status_filter: models.OrderStatus | None = Query(None, alias="status", description="Filtrar por estado (opcional)"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(oauth2.require_roles(*STAFF_ROLES)),
):
    # selectinload trae los items de todos los pedidos en una sola consulta extra (evita N+1)
    query = db.query(models.Order).options(selectinload(models.Order.items))
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.created_at.desc(), models.Order.id.desc()).offset(offset).limit(limit).all()


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    order = get_order_or_404(order_id, db)
    # Un cliente solo ve sus pedidos; para los ajenos se responde 404 para no revelar que existen
    if current_user.role not in STAFF_ROLES and order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")
    return order


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_in: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.require_roles(*STAFF_ROLES)),
):
    if status_in.status not in STATUS_PERMISSIONS[current_user.role]:
        raise HTTPException(status_code=403, detail="No tienes permisos para asignar ese estado")

    order = get_order_or_404(order_id, db)

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
