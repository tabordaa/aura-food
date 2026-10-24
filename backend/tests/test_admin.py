from datetime import timedelta

import pytest

from app import models
from app.routers.admin import start_of_today_utc


def _order(db, user, total, status=models.OrderStatus.pendiente, created_at=None):
    order = models.Order(user_id=user.id, total_price=total, delivery_address="Calle 1", status=status)
    if created_at:
        order.created_at = created_at
    db.add(order)
    db.commit()
    return order


@pytest.mark.parametrize("path", ["/api/admin/stats", "/api/admin/clients"])
@pytest.mark.parametrize("headers_fixture", ["customer_headers", "courier_headers"])
def test_admin_endpoints_forbidden_for_other_roles(client, path, headers_fixture, request):
    assert client.get(path, headers=request.getfixturevalue(headers_fixture)).status_code == 403


@pytest.mark.parametrize("path", ["/api/admin/stats", "/api/admin/clients"])
def test_admin_endpoints_require_authentication(client, path):
    assert client.get(path).status_code == 401


def test_stats_count_orders_and_today_revenue(client, db, customer, products, admin_headers):
    _order(db, customer, 10000)
    _order(db, customer, 20000, models.OrderStatus.entregado)
    _order(db, customer, 5000, models.OrderStatus.cancelado)  # no suma ingresos
    _order(db, customer, 7000, created_at=start_of_today_utc() - timedelta(minutes=1))  # ayer

    body = client.get("/api/admin/stats", headers=admin_headers).json()

    assert body["orders_by_status"]["pendiente"] == 2
    assert body["orders_by_status"]["entregado"] == 1
    assert body["orders_by_status"]["asignado"] == 0
    assert body["total_orders"] == 4
    assert body["today_orders"] == 2
    assert body["today_revenue"] == 30000
    assert body["clients"] == 1


def test_stats_count_product_stock(client, db, products, admin_headers):
    products[0].stock = 0
    products[1].stock = 3
    db.add(models.Product(name="Oculto", price=1000, category="frutas", stock=0, is_active=False))
    db.commit()

    body = client.get("/api/admin/stats", headers=admin_headers).json()

    assert body["active_products"] == 2
    assert body["out_of_stock_products"] == 1
    assert body["low_stock_products"] == 1


def test_clients_include_order_totals(client, db, customer, admin, admin_headers):
    from tests.conftest import _create_user

    newcomer = _create_user(db, "nuevo@test.com", models.RoleEnum.cliente, "Nuevo")
    _order(db, customer, 10000, models.OrderStatus.entregado)
    _order(db, customer, 4000, models.OrderStatus.rechazado)

    body = client.get("/api/admin/clients", headers=admin_headers).json()

    # Solo clientes (no el admin), ordenados por lo gastado
    assert [c["id"] for c in body] == [customer.id, newcomer.id]
    assert body[0]["orders_count"] == 2
    assert body[0]["total_spent"] == 10000
    assert body[0]["last_order_at"] is not None
    assert body[1]["orders_count"] == 0 and body[1]["total_spent"] == 0 and body[1]["last_order_at"] is None
    assert "password_hash" not in body[0]


def test_order_response_includes_customer_name(client, db, customer, admin_headers):
    _order(db, customer, 10000)

    body = client.get("/api/orders", headers=admin_headers).json()

    assert body[0]["customer"] == {"id": customer.id, "name": customer.name}
