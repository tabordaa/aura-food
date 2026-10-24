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
    customer.email = "test@aurafood.com"
    customer.password_hash = "fake_hash"
    db.commit()

    seed.seed(db)

    db.refresh(customer)
    assert utils.verify_password("Cliente123", customer.password_hash)


def test_seed_keeps_stock_of_existing_products(db, seed_passwords):
    seed.seed(db)
    product = db.get(models.Product, 1)
    product.stock = 3
    db.commit()

    seed.seed(db)

    db.refresh(product)
    assert product.stock == 3
