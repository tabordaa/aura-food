import pytest


def _order_payload(products, quantity=2):
    return {
        "delivery_address": "Carrera 23 # 98-45",
        "phone": "3001234567",
        "payment_method": "cash",
        "items": [{"product_id": products[0].id, "quantity": quantity}],
    }


def test_create_order_requires_authentication(client, products):
    response = client.post("/api/orders", json=_order_payload(products))

    assert response.status_code == 401


def test_create_order_uses_database_prices_and_discounts_stock(client, db, customer, customer_headers, products):
    response = client.post("/api/orders", json=_order_payload(products), headers=customer_headers)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["delivery_fee"] == 5000
    assert body["total_price"] == 9000 + 5000
    assert body["status"] == "pendiente"
    assert body["user_id"] == customer.id
    assert body["phone"] == "3001234567"
    assert body["payment_method"] == "cash"
    db.refresh(products[0])
    assert products[0].stock == 8


def test_create_order_rejects_insufficient_stock(client, customer_headers, products):
    response = client.post("/api/orders", json=_order_payload(products, quantity=99), headers=customer_headers)

    assert response.status_code == 400


def test_create_order_merges_duplicated_products(client, customer_headers, products):
    payload = _order_payload(products, quantity=1)
    payload["items"].append({"product_id": products[0].id, "quantity": 2})

    response = client.post("/api/orders", json=payload, headers=customer_headers)

    assert response.status_code == 201
    assert [(i["product_id"], i["quantity"]) for i in response.json()["items"]] == [(products[0].id, 3)]


def test_failed_order_does_not_discount_stock(client, db, customer_headers, products):
    payload = _order_payload(products, quantity=1)
    payload["items"].append({"product_id": products[1].id, "quantity": 99})

    response = client.post("/api/orders", json=payload, headers=customer_headers)

    assert response.status_code == 400
    db.expire_all()
    assert db.get(type(products[0]), products[0].id).stock == 10


@pytest.mark.parametrize(
    "change",
    [
        {"items": []},
        {"items": [{"product_id": 1, "quantity": 0}]},
        {"items": [{"product_id": 1, "quantity": 100}]},
        {"payment_method": "bitcoin"},
        {"delivery_address": "x"},
        {"notes": "a" * 301},
        {"phone": "llámame"},
    ],
)
def test_create_order_validates_input(client, customer_headers, products, change):
    payload = {**_order_payload(products), **change}

    response = client.post("/api/orders", json=payload, headers=customer_headers)

    assert response.status_code == 422


def test_delivery_fee_is_configurable(client, customer_headers, products, monkeypatch):
    monkeypatch.setenv("DELIVERY_FEE", "7000")

    body = client.post("/api/orders", json=_order_payload(products, quantity=1), headers=customer_headers).json()

    assert body["delivery_fee"] == 7000
    assert body["total_price"] == 4500 + 7000


def test_public_config_exposes_delivery_values(client, monkeypatch):
    monkeypatch.setenv("DELIVERY_FEE", "6000")

    body = client.get("/api/config").json()
    assert body["delivery_fee"] == 6000
    assert body["delivery_minutes"] == 45
    assert set(body["store"]) == {"lat", "lng", "address"}


def test_create_order_saves_delivery_location(client, customer_headers, products):
    payload = {**_order_payload(products), "delivery_lat": 4.669712, "delivery_lng": -74.053021}

    body = client.post("/api/orders", json=payload, headers=customer_headers).json()

    assert body["delivery_lat"] == pytest.approx(4.669712)
    assert body["delivery_lng"] == pytest.approx(-74.053021)


def test_create_order_without_location_is_allowed(client, customer_headers, products):
    body = client.post("/api/orders", json=_order_payload(products), headers=customer_headers).json()

    assert body["delivery_lat"] is None and body["delivery_lng"] is None


@pytest.mark.parametrize(
    "location", [{"delivery_lat": 4.6}, {"delivery_lng": -74.0}, {"delivery_lat": 95, "delivery_lng": 0}]
)
def test_create_order_rejects_invalid_location(client, customer_headers, products, location):
    response = client.post("/api/orders", json={**_order_payload(products), **location}, headers=customer_headers)

    assert response.status_code == 422
