import pytest


@pytest.fixture()
def placed_order(client, customer_headers, products):
    payload = {"delivery_address": "Calle 1 # 2-3", "items": [{"product_id": products[0].id, "quantity": 4}]}
    return client.post("/api/orders", json=payload, headers=customer_headers).json()


def reject(client, order_id, headers, reason="Sin stock de aguacate"):
    return client.post(f"/api/orders/{order_id}/reject", json={"reason": reason}, headers=headers)


def test_admin_rejects_order_with_reason_and_stock_returns(client, db, products, admin_headers, placed_order):
    db.refresh(products[0])
    assert products[0].stock == 6

    response = reject(client, placed_order["id"], admin_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "rechazado"
    assert response.json()["rejection_reason"] == "Sin stock de aguacate"
    db.refresh(products[0])
    assert products[0].stock == 10


def test_customer_sees_rejection_reason(client, customer_headers, admin_headers, placed_order):
    reject(client, placed_order["id"], admin_headers)

    body = client.get(f"/api/orders/{placed_order['id']}", headers=customer_headers).json()

    assert body["rejection_reason"] == "Sin stock de aguacate"


@pytest.mark.parametrize("headers_fixture", ["customer_headers", "courier_headers"])
def test_only_admin_can_reject(client, request, placed_order, headers_fixture):
    response = reject(client, placed_order["id"], request.getfixturevalue(headers_fixture))

    assert response.status_code == 403


@pytest.mark.parametrize("reason", ["", "  ", "no", "x" * 301])
def test_reject_requires_a_valid_reason(client, admin_headers, placed_order, reason):
    assert reject(client, placed_order["id"], admin_headers, reason).status_code == 422


def test_cannot_reject_accepted_order(client, admin_headers, placed_order):
    client.patch(f"/api/orders/{placed_order['id']}/status", json={"status": "preparado"}, headers=admin_headers)

    assert reject(client, placed_order["id"], admin_headers).status_code == 409


def test_cannot_reject_cancelled_order_twice_restocking(client, db, products, customer_headers, admin_headers,
                                                        placed_order):
    client.post(f"/api/orders/{placed_order['id']}/cancel", headers=customer_headers)

    assert reject(client, placed_order["id"], admin_headers).status_code == 409
    db.refresh(products[0])
    assert products[0].stock == 10
