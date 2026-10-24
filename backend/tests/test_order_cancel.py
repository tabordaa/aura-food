import pytest

from app import models


@pytest.fixture()
def placed_order(client, customer_headers, products):
    payload = {"delivery_address": "Calle 1 # 2-3", "items": [{"product_id": products[0].id, "quantity": 3}]}
    response = client.post("/api/orders", json=payload, headers=customer_headers)
    assert response.status_code == 201
    return response.json()


def test_customer_cancels_pending_order_and_stock_returns(client, db, customer_headers, products, placed_order):
    db.refresh(products[0])
    assert products[0].stock == 7

    response = client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "cancelado"
    db.refresh(products[0])
    assert products[0].stock == 10


def test_cannot_cancel_twice(client, db, customer_headers, products, placed_order):
    client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    response = client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    assert response.status_code == 409
    db.refresh(products[0])
    assert products[0].stock == 10  # el stock no se devuelve dos veces


def test_cannot_cancel_accepted_order(client, customer_headers, admin_headers, placed_order):
    client.patch(f"/api/orders/{placed_order['id']}/status", json={"status": "preparado"}, headers=admin_headers)

    response = client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    assert response.status_code == 409


def test_cannot_cancel_other_customer_order(client, db, placed_order):
    from tests.conftest import _create_user, auth_headers

    intruder = auth_headers(client, _create_user(db, "intruso@test.com", models.RoleEnum.cliente))

    assert client.post(f"/api/orders/{placed_order['id']}/cancel", headers=intruder).status_code == 404


def test_cancel_requires_authentication(client, placed_order):
    assert client.post(f"/api/orders/{placed_order['id']}/cancel").status_code == 401


@pytest.mark.parametrize("closing_status", ["rechazado", "cancelado"])
def test_patch_status_cannot_close_orders(client, admin_headers, placed_order, closing_status):
    # Regresión: antes respondía 500 porque esos estados no están en el flujo normal
    response = client.patch(
        f"/api/orders/{placed_order['id']}/status", json={"status": closing_status}, headers=admin_headers
    )

    assert response.status_code == 400


def test_patch_status_cannot_reopen_cancelled_order(client, customer_headers, admin_headers, placed_order):
    client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    response = client.patch(
        f"/api/orders/{placed_order['id']}/status", json={"status": "preparado"}, headers=admin_headers
    )

    assert response.status_code == 400
