from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from .. import models, oauth2, schemas, settings
from ..database import get_db

router = APIRouter(tags=["Admin"], dependencies=[Depends(oauth2.require_roles(models.RoleEnum.admin))])

# Pedidos que no generan ingreso: no cuentan en ventas ni en lo gastado por un cliente
CLOSED_STATUSES = (models.OrderStatus.rechazado, models.OrderStatus.cancelado)
LOW_STOCK = 10


def start_of_today_utc() -> datetime:
    """Medianoche de hoy en la hora de la tienda, expresada en UTC (así se guardan las fechas)."""
    store_tz = settings.get_store_timezone()
    midnight = datetime.combine(datetime.now(store_tz).date(), time.min, tzinfo=store_tz)
    return midnight.astimezone(timezone.utc)


@router.get("/stats", response_model=schemas.AdminStats)
def get_stats(db: Session = Depends(get_db)):
    """Indicadores del panel calculados en la base de datos (no dependen de cuántos pedidos cargue la tabla)."""
    by_status = dict(db.query(models.Order.status, func.count(models.Order.id)).group_by(models.Order.status).all())

    today_count, today_revenue = (
        db.query(func.count(models.Order.id), func.coalesce(func.sum(models.Order.total_price), 0))
        .filter(models.Order.created_at >= start_of_today_utc(), models.Order.status.notin_(CLOSED_STATUSES))
        .one()
    )
    active_products, low_stock, out_of_stock = (
        db.query(
            func.count(models.Product.id),
            func.count(case((models.Product.stock.between(1, LOW_STOCK), 1))),
            func.count(case((models.Product.stock == 0, 1))),
        )
        .filter(models.Product.is_active.is_(True))
        .one()
    )
    clients = db.query(func.count(models.User.id)).filter(models.User.role == models.RoleEnum.cliente).scalar()

    return {
        "orders_by_status": {s.value: by_status.get(s, 0) for s in models.OrderStatus},
        "total_orders": sum(by_status.values()),
        "today_orders": today_count,
        "today_revenue": today_revenue,
        "active_products": active_products,
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock,
        "clients": clients,
    }


@router.get("/clients", response_model=list[schemas.ClientSummary])
def list_clients(db: Session = Depends(get_db)):
    """Clientes con su número de pedidos, lo que han gastado y la fecha de su último pedido."""
    # Una sola consulta agregada por usuario en lugar de cargar los pedidos de cada cliente
    totals = (
        db.query(
            models.Order.user_id.label("user_id"),
            func.count(models.Order.id).label("orders_count"),
            func.sum(case((models.Order.status.notin_(CLOSED_STATUSES), models.Order.total_price), else_=0))
            .label("total_spent"),
            func.max(models.Order.created_at).label("last_order_at"),
        )
        .group_by(models.Order.user_id)
        .subquery()
    )
    rows = (
        db.query(
            models.User,
            func.coalesce(totals.c.orders_count, 0),
            func.coalesce(totals.c.total_spent, 0),
            totals.c.last_order_at,
        )
        .outerjoin(totals, totals.c.user_id == models.User.id)
        .filter(models.User.role == models.RoleEnum.cliente)
        .order_by(func.coalesce(totals.c.total_spent, 0).desc(), models.User.name)
        .all()
    )
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
            "created_at": user.created_at,
            "orders_count": orders_count,
            "total_spent": total_spent,
            "last_order_at": last_order_at,
        }
        for user, orders_count, total_spent, last_order_at in rows
    ]
