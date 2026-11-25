import pytest

import seed
from app import models, utils


@pytest.fixture()
def seed_passwords(monkeypatch):
    monkeypatch.setenv("SEED_ADMIN_PASSWORD", "AdminSeguro123")
    monkeypatch.setenv("SEED_COURIER_PASSWORD", "Courier123")
    monkeypatch.setenv("SEED_CUSTOMER_PASSWORD", "Cliente123")


def test_seed_creates_users_and_products(db, seed_passwords):
    seed.seed(db)

    roles = {u.email: u.role for u in db.query(models.User).all()}
    assert roles["admin@aurafood.com"] == models.RoleEnum.admin
    assert roles["domicilio@aurafood.com"] == models.RoleEnum.domiciliario
    assert roles["client@aurafood.com"] == models.RoleEnum.cliente
    assert db.query(models.Product).count() == len(seed.PRODUCTS)


def test_seed_is_idempotent(db, seed_passwords):
    seed.seed(db)
    seed.seed(db)

    assert db.query(models.User).count() == len(seed.USERS)
    assert db.query(models.Product).count() == len(seed.PRODUCTS)


def test_seed_skips_users_without_password(db, monkeypatch):
    for name in ("SEED_ADMIN_PASSWORD", "SEED_COURIER_PASSWORD", "SEED_CUSTOMER_PASSWORD"):
        monkeypatch.delenv(name, raising=False)

    seed.seed(db)

    assert db.query(models.User).count() == 0


def test_seed_does_not_overwrite_existing_password(db, seed_passwords, admin):
    admin.email = "admin@aurafood.com"
    original_hash = admin.password_hash
    db.commit()

    seed.seed(db)

    db.refresh(admin)
    assert admin.password_hash == original_hash


def test_seed_repairs_corrupted_hash(db, seed_passwords, customer):
    customer.email = "client@aurafood.com"
    customer.password_hash = "fake_hash"
    db.commit()

    seed.seed(db)

    db.refresh(customer)
    assert utils.verify_password("Cliente123", customer.password_hash)


def test_seed_renames_legacy_customer_email(db, seed_passwords, customer, capsys):
    customer.email = "test@aurafood.com"
    order = models.Order(user_id=customer.id, total_price=10000, delivery_address=customer.address)
    db.add(order)
    db.commit()
    original_id = customer.id
    original_hash = customer.password_hash

    seed.seed(db)

    db.refresh(customer)
    db.refresh(order)
    assert customer.id == original_id
    assert customer.email == "client@aurafood.com"
    assert customer.password_hash == original_hash
    assert order.user_id == original_id
    assert db.query(models.User).filter(models.User.email == "test@aurafood.com").first() is None
    assert "Usuario renombrado: test@aurafood.com → client@aurafood.com" in capsys.readouterr().out


def test_seed_keeps_legacy_user_when_new_email_exists(db, seed_passwords, customer, capsys):
    customer.email = "client@aurafood.com"
    legacy = models.User(
        name="Cliente Antiguo",
        email="test@aurafood.com",
        password_hash=utils.hash_password("ClaveVieja123"),
        role=models.RoleEnum.cliente,
    )
    db.add(legacy)
    db.commit()
    original_client_id = customer.id
    original_client_hash = customer.password_hash
    original_legacy_id = legacy.id
    original_legacy_hash = legacy.password_hash

    seed.seed(db)

    db.refresh(customer)
    db.refresh(legacy)
    assert customer.id == original_client_id
    assert customer.email == "client@aurafood.com"
    assert customer.password_hash == original_client_hash
    assert legacy.id == original_legacy_id
    assert legacy.email == "test@aurafood.com"
    assert legacy.password_hash == original_legacy_hash
    assert "Usuario renombrado" not in capsys.readouterr().out


def test_seed_migration_is_idempotent(db, seed_passwords, customer, capsys):
    customer.email = "test@aurafood.com"
    db.commit()
    original_id = customer.id
    original_hash = customer.password_hash

    seed.seed(db)
    capsys.readouterr()
    seed.seed(db)

    db.refresh(customer)
    assert customer.id == original_id
    assert customer.email == "client@aurafood.com"
    assert customer.password_hash == original_hash
    assert db.query(models.User).count() == len(seed.USERS)
    assert "Usuario renombrado" not in capsys.readouterr().out


def test_seed_keeps_stock_of_existing_products(db, seed_passwords):
    seed.seed(db)
    product = db.get(models.Product, 1)
    product.stock = 3
    db.commit()

    seed.seed(db)

    db.refresh(product)
    assert product.stock == 3
