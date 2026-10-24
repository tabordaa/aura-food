import os
from decimal import Decimal

from dotenv import load_dotenv

load_dotenv()


def get_delivery_fee() -> Decimal:
    """Costo de domicilio que se suma a cada pedido (DELIVERY_FEE, por defecto 5000)."""
    return Decimal(os.getenv("DELIVERY_FEE", "5000"))


def get_delivery_minutes() -> int:
    """Tiempo estimado de entrega que se muestra al cliente (DELIVERY_MINUTES, por defecto 45)."""
    return int(os.getenv("DELIVERY_MINUTES", "45"))
