import os

# Las variables se definen antes de importar la app: load_dotenv no sobrescribe las que ya existen,
# así los tests nunca tocan la base de datos compartida del .env.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "test-secret-key"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import models, utils  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

# StaticPool reutiliza una única conexión para que la BD en memoria sobreviva entre sesiones
engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

PASSWORD = "Password123"


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_user(db, email, role, name="Usuario"):
    user = models.User(
        name=name,
        email=email,
        password_hash=utils.hash_password(PASSWORD),
        role=role,
        address="Calle 1 # 2-3",
        phone="3001234567",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def customer(db):
    return _create_user(db, "cliente@test.com", models.RoleEnum.cliente, "Cliente Test")


@pytest.fixture()
def admin(db):
    return _create_user(db, "admin@test.com", models.RoleEnum.admin, "Admin Test")


@pytest.fixture()
def courier(db):
    return _create_user(db, "domiciliario@test.com", models.RoleEnum.domiciliario, "Domiciliario Test")


def auth_headers(client, user):
    response = client.post("/api/auth/login", data={"username": user.email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture()
def customer_headers(client, customer):
    return auth_headers(client, customer)


@pytest.fixture()
def admin_headers(client, admin):
    return auth_headers(client, admin)


@pytest.fixture()
def courier_headers(client, courier):
    return auth_headers(client, courier)


@pytest.fixture()
def products(db):
    items = [
        models.Product(name="Aguacate", price=4500, category="frutas", stock=10, unit="x 500g"),
        models.Product(name="Leche", price=3800, category="dairy", stock=5, unit="x 1000ml"),
    ]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)
    return items
