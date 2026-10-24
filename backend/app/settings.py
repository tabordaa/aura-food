import os
from datetime import timedelta, timezone
from decimal import Decimal

from dotenv import load_dotenv

load_dotenv()


def get_delivery_fee() -> Decimal:
    """Costo de domicilio que se suma a cada pedido (DELIVERY_FEE, por defecto 5000)."""
    return Decimal(os.getenv("DELIVERY_FEE", "5000"))


def get_delivery_minutes() -> int:
    """Tiempo estimado de entrega que se muestra al cliente (DELIVERY_MINUTES, por defecto 45)."""
    return int(os.getenv("DELIVERY_MINUTES", "45"))


def get_store_location() -> dict:
    """Punto de recogida de la tienda que se muestra en los mapas (STORE_LAT, STORE_LNG, STORE_ADDRESS)."""
    return {
        "lat": float(os.getenv("STORE_LAT", "4.6486")),
        "lng": float(os.getenv("STORE_LNG", "-74.0628")),
        "address": os.getenv("STORE_ADDRESS", "Calle 63 # 13-30, Bogotá"),
    }


def get_store_timezone() -> timezone:
    """Zona horaria de la tienda para saber qué es "hoy" (STORE_UTC_OFFSET en horas, por defecto -5: Colombia).

    Se usa un desfase fijo porque Colombia no tiene horario de verano y así no se depende del paquete tzdata en Windows.
    """
    return timezone(timedelta(hours=int(os.getenv("STORE_UTC_OFFSET", "-5"))))
