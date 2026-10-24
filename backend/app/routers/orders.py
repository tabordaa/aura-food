
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from .. import models, oauth2, schemas, settings
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
        if not product.is_active:
            raise HTTPException(status_code=400, detail=f"'{product.name}' ya no está disponible")
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

    # El domicilio se calcula en el servidor: el total guardado es exactamente lo que paga el cliente
    order.delivery_fee = settings.get_delivery_fee()
    order.total_price = total + order.delivery_fee
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# Qué estados puede asignar cada rol del personal con PATCH /status (solo los del flujo normal;
# rechazar y cancelar tienen sus propios endpoints porque además devuelven el stock)
STATUS_PERMISSIONS = {
    models.RoleEnum.admin: set(STATUS_FLOW),
    models.RoleEnum.domiciliario: {models.OrderStatus.asignado, models.OrderStatus.entregado},
}

STAFF_ROLES = (models.RoleEnum.admin, models.RoleEnum.domiciliario)


# Carga en lote los productos de cada item y el domiciliario (evita una consulta por fila)
ORDER_LOAD_OPTIONS = (
    selectinload(models.Order.items).selectinload(models.OrderItem.product),
    selectinload(models.Order.courier),
)


def get_order_or_404(order_id: int, db: Session, lock: bool = False) -> models.Order:
    query = db.query(models.Order).options(*ORDER_LOAD_OPTIONS).filter(models.Order.id == order_id)
    if lock:
        # Bloquea el pedido hasta el commit para que dos cambios de estado simultáneos no se pisen
        query = query.with_for_update(of=models.Order)
    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")
    return order


def restock_order_items(order: models.Order, db: Session) -> None:
    """Devuelve al inventario las unidades de un pedido que no se va a entregar."""
    product_ids = sorted({item.product_id for item in order.items})
    # Mismo orden de bloqueo que al crear pedidos (por id) para evitar interbloqueos
    products = {
        p.id: p
        for p in db.query(models.Product).filter(models.Product.id.in_(product_ids)).order_by(models.Product.id)
        .with_for_update()
        .all()
    }
    for item in order.items:
        products[item.product_id].stock += item.quantity


@router.get("", response_model=list[schemas.OrderResponse])
def list_orders(
    status_filter: models.OrderStatus | None = Query(None, alias="status", description="Filtrar por estado (opcional)"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(oauth2.require_roles(*STAFF_ROLES)),
):
    # selectinload trae los items de todos los pedidos en una sola consulta extra (evita N+1)
    query = db.query(models.Order).options(*ORDER_LOAD_OPTIONS)
    if status_filter:
        query = query.filter(models.Order.status == status_filter)
    return query.order_by(models.Order.created_at.desc(), models.Order.id.desc()).offset(offset).limit(limit).all()


@router.get("/me", response_model=list[schemas.OrderResponse])
def list_my_orders(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Pedidos del usuario autenticado, del más reciente al más antiguo."""
    return (
        db.query(models.Order)
        .options(*ORDER_LOAD_OPTIONS)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc(), models.Order.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# Debe ir después de /me: si no, FastAPI intentaría leer "me" como order_id
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
    if status_in.status not in STATUS_FLOW:
        raise HTTPException(status_code=400, detail="Para rechazar o cancelar un pedido usa su acción específica")
    if status_in.status not in STATUS_PERMISSIONS[current_user.role]:
        raise HTTPException(status_code=403, detail="No tienes permisos para asignar ese estado")

    order = get_order_or_404(order_id, db, lock=True)
    if order.status not in STATUS_FLOW:
        raise HTTPException(status_code=400, detail=f"El pedido ya está {order.status.value}")

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


@router.post("/{order_id}/cancel", response_model=schemas.OrderResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """El cliente cancela su pedido mientras la tienda no lo haya aceptado; el stock vuelve al inventario."""
    order = get_order_or_404(order_id, db, lock=True)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail=f"No existe el pedido con id {order_id}")
    if order.status != models.OrderStatus.pendiente:
        raise HTTPException(
            status_code=409,
            detail=(
                "Solo puedes cancelar un pedido mientras está pendiente. "
                "Si ya fue aceptado, comunícate con la tienda."
            ),
        )

    restock_order_items(order, db)
    order.status = models.OrderStatus.cancelado
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/reject", response_model=schemas.OrderResponse)
def reject_order(
    order_id: int,
    reject_in: schemas.OrderReject,
    db: Session = Depends(get_db),
    _: models.User = Depends(oauth2.require_roles(models.RoleEnum.admin)),
):
    """La tienda rechaza un pedido pendiente indicando el motivo; el stock vuelve al inventario."""
    order = get_order_or_404(order_id, db, lock=True)
    if order.status != models.OrderStatus.pendiente:
        raise HTTPException(status_code=409, detail="Solo se pueden rechazar pedidos pendientes")

    restock_order_items(order, db)
    order.status = models.OrderStatus.rechazado
    order.rejection_reason = reject_in.reason
    db.commit()
    db.refresh(order)
    return order
