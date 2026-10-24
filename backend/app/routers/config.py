from fastapi import APIRouter

from .. import settings

router = APIRouter(tags=["Config"])


@router.get("")
def get_public_config():
    """Valores de negocio que el frontend necesita mostrar (no incluye nada sensible)."""
    return {
        "delivery_fee": float(settings.get_delivery_fee()),
        "delivery_minutes": settings.get_delivery_minutes(),
        "store": settings.get_store_location(),
    }
