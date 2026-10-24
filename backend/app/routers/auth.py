from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import database, models, oauth2, schemas, utils

router = APIRouter(tags=['Authentication'])

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # Validar si el email ya existe
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado")

    # Encriptar la contraseña
    hashed_password = utils.hash_password(user.password)

    # Crear y guardar el nuevo usuario
    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        role=models.RoleEnum.cliente,
        address=user.address,
        phone=user.phone
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=schemas.Token)
def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # OAuth2PasswordRequestForm recibe 'username' y 'password' desde form-data
    # En nuestro caso, el 'username' es el email.
    user = db.query(models.User).filter(models.User.email == user_credentials.username).first()

    # Se verifica siempre una contraseña (la real o la de referencia) para que el tiempo de respuesta
    # no delate si el email está registrado
    password_hash = user.password_hash if user else utils.DUMMY_HASH
    password_ok = utils.verify_password(user_credentials.password, password_hash)

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear token JWT
    access_token = oauth2.create_access_token(data={"user_id": str(user.id)})

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user(current_user: models.User = Depends(oauth2.get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.UserResponse)
def update_current_user(
    changes: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    # Solo se tocan los campos que vinieron en la petición; el esquema no tiene email, rol ni contraseña,
    # así que aunque el cliente los envíe se ignoran (evita mass assignment)
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
