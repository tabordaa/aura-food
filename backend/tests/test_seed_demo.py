import pytest

import seed_demo
from app import models


@pytest.fixture()
def demo_password(monkeypatch):
    monkeypatch.setenv("SEED_DEMO_PASSWORD", "DemoSegura123")


def test_seed_demo_creates_catalog_customers_and_orders(db, demo_password, courier):
    seed_demo.seed_demo(db)

    assert db.query(models.Product).count() == len(seed_demo.DEMO_PRODUCTS)
    categories = {p.category for p in db.query(models.Product).all()}
    assert categories == {"frutas", "dairy", "meat", "cleaning", "bakery"}
    assert db.query(models.User).filter(models.User.email.like("%@demo.aurafood.com")).count() == 3
    statuses = {o.status for o in db.query(models.Order).all()}
    assert statuses == set(models.OrderStatus)


def test_seed_demo_orders_are_consistent(db, demo_password, courier):
    seed_demo.seed_demo(db)

    for order in db.query(models.Order).all():
        subtotal = sum(item.price_at_purchase * item.quantity for item in order.items)
        assert order.total_price == subtotal + order.delivery_fee
        on_the_way_or_done = order.status in (models.OrderStatus.asignado, models.OrderStatus.entregado)
        assert (order.courier_id is not None) == on_the_way_or_done
        assert (order.delivered_at is not None) == (order.status == models.OrderStatus.entregado)
        assert (order.rejection_reason is not None) == (order.status == models.OrderStatus.rechazado)


def test_seed_demo_is_idempotent(db, demo_password, courier):
    seed_demo.seed_demo(db)
    seed_demo.seed_demo(db)

    assert db.query(models.Product).count() == len(seed_demo.DEMO_PRODUCTS)
    assert db.query(models.User).filter(models.User.email.like("%@demo.aurafood.com")).count() == 3
    assert db.query(models.Order).count() == sum(len(orders) for orders in seed_demo.DEMO_ORDERS.values())


def test_seed_demo_keeps_stock_of_existing_products(db, demo_password):
    db.add(models.Product(name="Banano Criollo", price=1000, category="frutas", stock=3))
    db.commit()

    seed_demo.seed_demo(db)

    banano = db.query(models.Product).filter(models.Product.name == "Banano Criollo").one()
    assert banano.stock == 3
    assert banano.price == 2800


def test_seed_demo_without_password_skips_customers(db, monkeypatch):
    monkeypatch.delenv("SEED_DEMO_PASSWORD", raising=False)

    seed_demo.seed_demo(db)

    assert db.query(models.User).count() == 0
    assert db.query(models.Order).count() == 0
