import os
import secrets
import warnings
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import database, models, schemas

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Nunca hay una clave fija en el código: cualquiera que la leyera podría firmar tokens de admin
    if os.getenv("ENV") == "production":
        raise RuntimeError("Falta la variable de entorno SECRET_KEY")
    SECRET_KEY = secrets.token_urlsafe(48)
    warnings.warn(
        "SECRET_KEY no está definida: se usa una clave temporal y las sesiones se cerrarán al reiniciar la API. "
        'Genera una con: python -c "import secrets; print(secrets.token_urlsafe(48))" y ponla en backend/.env',
        stacklevel=1,
    )

ALGORITHM = "HS256"
# Duración de la sesión: una jornada de trabajo por defecto (antes era una semana)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id: str = payload.get("user_id")

        if id is None:
            raise credentials_exception

        token_data = schemas.TokenData(id=id)
    except JWTError:
        raise credentials_exception from None

    return token_data

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == token.id).first()

    if not user:
        raise credentials_exception

    return user


def require_roles(*roles: models.RoleEnum):
    """Dependencia que exige que el usuario autenticado tenga alguno de los roles indicados."""
    def checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para esta acción")
        return current_user

    return checker
