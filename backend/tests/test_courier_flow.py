import pytest

from app import models
from tests.conftest import _create_user, auth_headers


@pytest.fixture()
def ready_order(db, customer, products):
    order = models.Order(
        user_id=customer.id, total_price=9500, delivery_address="Calle 1", status=models.OrderStatus.preparado
    )
    order.items.append(models.OrderItem(product_id=products[0].id, quantity=1, price_at_purchase=4500))
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture()
def other_courier_headers(client, db):
    return auth_headers(client, _create_user(db, "otro-domi@test.com", models.RoleEnum.domiciliario))


def test_courier_takes_ready_order(client, ready_order, courier, courier_headers):
    response = client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "asignado"
    assert body["courier"] == {"id": courier.id, "name": courier.name}


def test_second_courier_cannot_take_taken_order(client, ready_order, courier_headers, other_courier_headers):
    client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)

    response = client.post(f"/api/orders/{ready_order.id}/take", headers=other_courier_headers)

    assert response.status_code == 409
    assert "Otro domiciliario" in response.json()["detail"]


def test_cannot_take_pending_order(client, db, ready_order, courier_headers):
    ready_order.status = models.OrderStatus.pendiente
    db.commit()

    assert client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers).status_code == 409


@pytest.mark.parametrize("headers_fixture", ["customer_headers", "admin_headers"])
def test_only_couriers_take_orders(client, ready_order, headers_fixture, request):
    response = client.post(f"/api/orders/{ready_order.id}/take", headers=request.getfixturevalue(headers_fixture))

    assert response.status_code == 403


def test_courier_delivers_own_order(client, ready_order, courier_headers):
    client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)

    response = client.post(f"/api/orders/{ready_order.id}/deliver", headers=courier_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "entregado"
    assert body["delivered_at"] is not None


def test_cannot_deliver_without_taking(client, ready_order, courier_headers):
    assert client.post(f"/api/orders/{ready_order.id}/deliver", headers=courier_headers).status_code == 403


def test_cannot_deliver_another_couriers_order(client, ready_order, courier_headers, other_courier_headers):
    client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)

    response = client.post(f"/api/orders/{ready_order.id}/deliver", headers=other_courier_headers)

    assert response.status_code == 403


def test_cannot_deliver_twice(client, ready_order, courier_headers):
    client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)
    client.post(f"/api/orders/{ready_order.id}/deliver", headers=courier_headers)

    assert client.post(f"/api/orders/{ready_order.id}/deliver", headers=courier_headers).status_code == 409


def test_courier_dashboard_groups_orders(client, ready_order, courier_headers, other_courier_headers):
    empty = client.get("/api/orders/courier/me", headers=courier_headers).json()
    assert [o["id"] for o in empty["available"]] == [ready_order.id]
    assert empty["active"] == [] and empty["history"] == []

    client.post(f"/api/orders/{ready_order.id}/take", headers=courier_headers)
    taken = client.get("/api/orders/courier/me", headers=courier_headers).json()
    assert taken["available"] == [] and [o["id"] for o in taken["active"]] == [ready_order.id]
    # El otro domiciliario no ve como suyo un pedido ajeno
    other = client.get("/api/orders/courier/me", headers=other_courier_headers).json()
    assert other == {"available": [], "active": [], "history": []}

    client.post(f"/api/orders/{ready_order.id}/deliver", headers=courier_headers)
    done = client.get("/api/orders/courier/me", headers=courier_headers).json()
    assert done["active"] == [] and [o["id"] for o in done["history"]] == [ready_order.id]


@pytest.mark.parametrize("headers_fixture", ["customer_headers", "admin_headers"])
def test_courier_dashboard_only_for_couriers(client, headers_fixture, request):
    response = client.get("/api/orders/courier/me", headers=request.getfixturevalue(headers_fixture))

    assert response.status_code == 403


@pytest.mark.parametrize("target", ["asignado", "entregado"])
def test_admin_patch_only_accepts(client, ready_order, admin_headers, target):
    response = client.patch(f"/api/orders/{ready_order.id}/status", json={"status": target}, headers=admin_headers)

    assert response.status_code == 400
