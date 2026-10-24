from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import database, models, oauth2, schemas

router = APIRouter(tags=['Products'])

require_admin = oauth2.require_roles(models.RoleEnum.admin)


def get_product_or_404(product_id: int, db: Session) -> models.Product:
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"No existe el producto con id {product_id}")
    return product


# Pedidos que no cuentan como venta
CLOSED_STATUSES = (models.OrderStatus.rechazado, models.OrderStatus.cancelado)


@router.get("", response_model=list[schemas.ProductResponse])
def get_products(
    sort: Literal["default", "best_sellers"] = Query("default", description="best_sellers: los más vendidos primero"),
    db: Session = Depends(database.get_db),
):
    """Catálogo público: solo productos activos, con las unidades vendidas de cada uno."""
    # Unidades vendidas por producto en una sola consulta agregada (sin contar pedidos rechazados ni cancelados)
    sold = (
        db.query(models.OrderItem.product_id.label("product_id"), func.sum(models.OrderItem.quantity).label("units"))
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.status.notin_(CLOSED_STATUSES))
        .group_by(models.OrderItem.product_id)
        .subquery()
    )
    units_sold = func.coalesce(sold.c.units, 0)
    query = (
        db.query(models.Product, units_sold)
        .outerjoin(sold, sold.c.product_id == models.Product.id)
        .filter(models.Product.is_active.is_(True))
    )
    order = (units_sold.desc(), models.Product.id) if sort == "best_sellers" else (models.Product.id,)
    return [
        schemas.ProductResponse.model_validate(product).model_copy(update={"units_sold": units})
        for product, units in query.order_by(*order).all()
    ]


@router.get("/manage", response_model=list[schemas.ProductResponse])
def get_all_products(db: Session = Depends(database.get_db), _: models.User = Depends(require_admin)):
    """Listado para el panel admin, incluidos los productos desactivados."""
    return db.query(models.Product).order_by(models.Product.id).all()


@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(require_admin),
):
    product = models.Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(require_admin),
):
    product = get_product_or_404(product_id, db)
    for field, value in product_in.model_dump().items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_product(
    product_id: int,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(require_admin),
):
    """Borrado lógico: el producto sale del catálogo pero se conserva para los pedidos históricos."""
    product = get_product_or_404(product_id, db)
    product.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
