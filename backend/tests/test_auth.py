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

    assert response.status_code in (401, 403)


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, customer, customer_headers):
    response = client.get("/api/auth/me", headers=customer_headers)

    assert response.status_code == 200
    assert response.json()["email"] == customer.email
