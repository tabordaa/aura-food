import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


def get_google_client_id() -> str:
    """ID de cliente OAuth de Google (GOOGLE_CLIENT_ID). Vacío = inicio de sesión con Google desactivado."""
    return os.getenv("GOOGLE_CLIENT_ID", "").strip()


def verify_google_credential(credential: str, client_id: str) -> dict:
    """Verifica el ID token que entrega el botón de Google y devuelve sus datos (email, name…).

    Comprueba la firma con las llaves públicas de Google, la expiración y que el token se emitió para nuestra app
    (audience = client_id). Lanza ValueError si algo no cuadra.
    """
    return id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
