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
    assert body["total_price"] == 9000
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
