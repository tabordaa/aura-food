from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pwdlib.hashers.bcrypt import BcryptHasher

# bcrypt sigue siendo el algoritmo para no invalidar las contraseñas ya guardadas
password_hasher = PasswordHash((BcryptHasher(),))

def hash_password(password: str):
    return password_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    try:
        return password_hasher.verify(plain_password, hashed_password)
    except (UnknownHashError, ValueError):
        # Hash corrupto/desconocido o contraseña de más de 72 bytes: es una contraseña incorrecta, no un error 500
        return False

def is_valid_hash(hashed_password: str | None) -> bool:
    return bool(hashed_password) and any(hasher.identify(hashed_password) for hasher in password_hasher.hashers)

# Hash de referencia para gastar el mismo tiempo cuando el email no existe y no revelar qué cuentas existen
DUMMY_HASH = hash_password("aura-food-dummy-password")
