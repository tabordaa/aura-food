import pytest

from app import models


@pytest.fixture()
def order(db, customer, products):
    order = models.Order(
        user_id=customer.id, total_price=4500, delivery_address="Calle 1", status=models.OrderStatus.pendiente
    )
    order.items.append(models.OrderItem(product_id=products[0].id, quantity=1, price_at_purchase=4500))
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture()
def other_customer_headers(client, db):
    from tests.conftest import _create_user, auth_headers

    return auth_headers(client, _create_user(db, "otro@test.com", models.RoleEnum.cliente))


def test_list_orders_requires_authentication(client, order):
    assert client.get("/api/orders").status_code == 401


def test_customer_cannot_list_all_orders(client, order, customer_headers):
    assert client.get("/api/orders", headers=customer_headers).status_code == 403


@pytest.mark.parametrize("headers_fixture", ["admin_headers", "courier_headers"])
def test_staff_can_list_orders(client, order, headers_fixture, request):
    response = client.get("/api/orders", headers=request.getfixturevalue(headers_fixture))

    assert response.status_code == 200
    assert [o["id"] for o in response.json()] == [order.id]


def test_get_order_requires_authentication(client, order):
    assert client.get(f"/api/orders/{order.id}").status_code == 401


def test_owner_can_get_own_order(client, order, customer_headers):
    assert client.get(f"/api/orders/{order.id}", headers=customer_headers).status_code == 200


def test_customer_cannot_see_other_customer_order(client, order, other_customer_headers):
    # 404 y no 403: no se revela que el pedido existe
    assert client.get(f"/api/orders/{order.id}", headers=other_customer_headers).status_code == 404


def test_admin_can_get_any_order(client, order, admin_headers):
    assert client.get(f"/api/orders/{order.id}", headers=admin_headers).status_code == 200


def test_update_status_requires_authentication(client, order):
    response = client.patch(f"/api/orders/{order.id}/status", json={"status": "preparado"})

    assert response.status_code == 401


def test_customer_cannot_update_status(client, order, customer_headers):
    response = client.patch(f"/api/orders/{order.id}/status", json={"status": "preparado"}, headers=customer_headers)

    assert response.status_code == 403


def test_admin_accepts_order(client, order, admin_headers):
    response = client.patch(f"/api/orders/{order.id}/status", json={"status": "preparado"}, headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "preparado"


def test_courier_cannot_accept_pending_order(client, order, courier_headers):
    response = client.patch(f"/api/orders/{order.id}/status", json={"status": "preparado"}, headers=courier_headers)

    assert response.status_code == 403


def test_courier_delivers_prepared_order(client, db, order, courier_headers):
    order.status = models.OrderStatus.preparado
    db.commit()

    response = client.patch(f"/api/orders/{order.id}/status", json={"status": "entregado"}, headers=courier_headers)

    assert response.status_code == 200
    assert response.json()["status"] == "entregado"


def test_list_orders_supports_pagination(client, order, admin_headers):
    assert client.get("/api/orders?limit=1&offset=0", headers=admin_headers).json()[0]["id"] == order.id
    assert client.get("/api/orders?limit=1&offset=1", headers=admin_headers).json() == []
    assert client.get("/api/orders?limit=1000", headers=admin_headers).status_code == 422


def test_my_orders_requires_authentication(client):
    assert client.get("/api/orders/me").status_code == 401


def test_my_orders_returns_only_own_orders(client, order, customer_headers, other_customer_headers):
    mine = client.get("/api/orders/me", headers=customer_headers).json()
    others = client.get("/api/orders/me", headers=other_customer_headers).json()

    assert [o["id"] for o in mine] == [order.id]
    assert others == []


def test_order_response_includes_product_details(client, order, customer_headers, products):
    item = client.get("/api/orders/me", headers=customer_headers).json()[0]["items"][0]

    assert item["product_name"] == products[0].name
    assert item["product_unit"] == products[0].unit


def test_order_response_includes_delivery_details(client, db, order, courier, customer_headers):
    order.courier_id = courier.id
    order.rejection_reason = None
    db.commit()

    body = client.get(f"/api/orders/{order.id}", headers=customer_headers).json()

    assert body["courier"] == {"id": courier.id, "name": courier.name}
    assert body["delivery_fee"] == 0
