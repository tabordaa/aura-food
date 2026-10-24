from tests.conftest import PASSWORD


def test_register_creates_customer(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Nuevo", "email": "nuevo@test.com", "password": PASSWORD, "address": "Calle 9"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "nuevo@test.com"
    assert body["role"] == "cliente"
    assert "password" not in body and "password_hash" not in body


def test_register_rejects_duplicated_email(client, customer):
    response = client.post(
        "/api/auth/register",
        json={"name": "Otro", "email": customer.email, "password": PASSWORD},
    )

    assert response.status_code == 400


def test_login_returns_token(client, customer):
    response = client.post("/api/auth/login", data={"username": customer.email, "password": PASSWORD})

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_login_rejects_wrong_password(client, customer):
    response = client.post("/api/auth/login", data={"username": customer.email, "password": "incorrecta"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_unknown_email_gives_same_error(client):
    response = client.post("/api/auth/login", data={"username": "nadie@test.com", "password": PASSWORD})

    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_with_corrupted_hash_is_401_not_500(client, db, customer):
    customer.password_hash = "no-es-un-hash-bcrypt"
    db.commit()

    response = client.post("/api/auth/login", data={"username": customer.email, "password": PASSWORD})

    assert response.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, customer, customer_headers):
    response = client.get("/api/auth/me", headers=customer_headers)

    assert response.status_code == 200
    assert response.json()["email"] == customer.email


def test_register_ignores_role_from_client(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Atacante", "email": "atacante@test.com", "password": PASSWORD, "role": "admin"},
    )

    assert response.status_code == 201
    assert response.json()["role"] == "cliente"


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Corta", "email": "corta@test.com", "password": "1234567"},
    )

    assert response.status_code == 422


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Correo", "email": "no-es-un-correo", "password": PASSWORD},
    )

    assert response.status_code == 422


def test_register_rejects_password_longer_than_72_bytes(client):
    # 40 caracteres pero 80 bytes en UTF-8: bcrypt no lo admite
    response = client.post(
        "/api/auth/register",
        json={"name": "Tildes", "email": "tildes@test.com", "password": "ñ" * 40},
    )

    assert response.status_code == 422


def test_login_with_very_long_password_is_401_not_500(client, customer):
    response = client.post("/api/auth/login", data={"username": customer.email, "password": "x" * 200})

    assert response.status_code == 401


def test_existing_bcrypt_hashes_still_verify():
    import bcrypt

    from app import utils

    # Hash con el mismo formato que generaba passlib
    legacy_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()

    assert utils.verify_password("admin123", legacy_hash)
    assert not utils.verify_password("otra", legacy_hash)
