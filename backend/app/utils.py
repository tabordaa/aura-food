from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Hash corrupto o en un formato desconocido: se trata como contraseña incorrecta, no como error 500
        return False

# Hash de referencia para gastar el mismo tiempo cuando el email no existe y no revelar qué cuentas existen
DUMMY_HASH = hash_password("aura-food-dummy-password")
