import pytest

from app import google_auth, models

CREDENTIAL = "x" * 40


@pytest.fixture()
def google_enabled(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com")


def fake_google(monkeypatch, **claims):
    def verify(credential, client_id):
        assert client_id == "test-client.apps.googleusercontent.com"
        if claims.get("invalid"):
            raise ValueError("Token used too late")
        return {"email_verified": True, **claims}
    monkeypatch.setattr(google_auth, "verify_google_credential", verify)


def test_google_login_disabled_without_client_id(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)

    response = client.post("/api/auth/google", json={"credential": CREDENTIAL})

    assert response.status_code == 503


def test_google_login_creates_customer(client, db, google_enabled, monkeypatch):
    fake_google(monkeypatch, email="Nueva.Persona@gmail.com", name="Nueva Persona")

    response = client.post("/api/auth/google", json={"credential": CREDENTIAL})

    assert response.status_code == 200
    token = response.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "nueva.persona@gmail.com"
    assert me["name"] == "Nueva Persona"
    assert me["role"] == "cliente"


def test_google_login_reuses_existing_account(client, db, customer, google_enabled, monkeypatch):
    fake_google(monkeypatch, email=customer.email.upper(), name="Otro Nombre")

    token = client.post("/api/auth/google", json={"credential": CREDENTIAL}).json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["id"] == customer.id
    assert db.query(models.User).count() == 1


def test_google_login_rejects_invalid_token(client, google_enabled, monkeypatch):
    fake_google(monkeypatch, invalid=True)

    assert client.post("/api/auth/google", json={"credential": CREDENTIAL}).status_code == 401


def test_google_login_requires_verified_email(client, google_enabled, monkeypatch):
    fake_google(monkeypatch, email="sin.verificar@gmail.com", email_verified=False)

    assert client.post("/api/auth/google", json={"credential": CREDENTIAL}).status_code == 401
