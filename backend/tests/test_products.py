import pytest

from app import models

NEW_PRODUCT = {
    "name": "Fresas Frescas",
    "price": 7900,
    "old_price": 9500,
    "category": "frutas",
    "stock": 12,
    "unit": "x 500g",
    "tag": "Temporada",
    "origin": "🌱 Finca local",
    "image_url": "https://images.unsplash.com/photo-fresas",
    "description": "",
}


def test_list_products_is_public(client, products):
    response = client.get("/api/products")

    assert response.status_code == 200
    names = {product["name"] for product in response.json()}
    assert names == {"Aguacate", "Leche"}


def test_admin_creates_product(client, admin_headers):
    response = client.post("/api/products", json=NEW_PRODUCT, headers=admin_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Fresas Frescas" and body["is_active"] is True
    assert body["description"] is None  # "" se guarda como vacío


@pytest.mark.parametrize("headers_fixture", ["customer_headers", "courier_headers"])
def test_only_admin_manages_products(client, request, products, headers_fixture):
    headers = request.getfixturevalue(headers_fixture)

    assert client.post("/api/products", json=NEW_PRODUCT, headers=headers).status_code == 403
    assert client.put(f"/api/products/{products[0].id}", json=NEW_PRODUCT, headers=headers).status_code == 403
    assert client.delete(f"/api/products/{products[0].id}", headers=headers).status_code == 403
    assert client.get("/api/products/manage", headers=headers).status_code == 403


def test_product_management_requires_authentication(client, products):
    assert client.post("/api/products", json=NEW_PRODUCT).status_code == 401


@pytest.mark.parametrize(
    "change",
    [
        {"price": 0},
        {"price": -100},
        {"stock": -1},
        {"category": "juguetes"},
        {"name": "x"},
        {"old_price": 5000},  # menor que el precio: no es oferta
        {"image_url": "javascript:alert(1)"},
        {"image_url": "data:image/png;base64,AAA"},
    ],
)
def test_product_validation(client, admin_headers, change):
    response = client.post("/api/products", json={**NEW_PRODUCT, **change}, headers=admin_headers)

    assert response.status_code == 422


def test_admin_updates_product_price_and_stock(client, admin_headers, products):
    payload = {**NEW_PRODUCT, "name": "Aguacate Hass", "price": 5000, "old_price": None, "stock": 40}

    response = client.put(f"/api/products/{products[0].id}", json=payload, headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["price"] == 5000 and response.json()["stock"] == 40


def test_update_missing_product_is_404(client, admin_headers):
    assert client.put("/api/products/999", json=NEW_PRODUCT, headers=admin_headers).status_code == 404


def test_deactivated_product_leaves_catalog_but_stays_in_admin_list(client, admin_headers, products):
    assert client.delete(f"/api/products/{products[0].id}", headers=admin_headers).status_code == 204

    public = {p["id"] for p in client.get("/api/products").json()}
    managed = {p["id"]: p["is_active"] for p in client.get("/api/products/manage", headers=admin_headers).json()}
    assert products[0].id not in public
    assert managed[products[0].id] is False


def test_deactivated_product_keeps_order_history(client, db, customer_headers, admin_headers, products):
    payload = {"delivery_address": "Calle 1 # 2-3", "items": [{"product_id": products[0].id, "quantity": 1}]}
    order = client.post("/api/orders", json=payload, headers=customer_headers).json()

    client.delete(f"/api/products/{products[0].id}", headers=admin_headers)

    item = client.get(f"/api/orders/{order['id']}", headers=customer_headers).json()["items"][0]
    assert item["product_name"] == "Aguacate"
    assert db.get(models.Product, products[0].id) is not None


def test_cannot_order_deactivated_product(client, customer_headers, admin_headers, products):
    client.delete(f"/api/products/{products[0].id}", headers=admin_headers)
    payload = {"delivery_address": "Calle 1 # 2-3", "items": [{"product_id": products[0].id, "quantity": 1}]}

    response = client.post("/api/orders", json=payload, headers=customer_headers)

    assert response.status_code == 400


def test_admin_reactivates_product(client, admin_headers, products):
    client.delete(f"/api/products/{products[0].id}", headers=admin_headers)
    payload = {**NEW_PRODUCT, "name": "Aguacate", "is_active": True}

    client.put(f"/api/products/{products[0].id}", json=payload, headers=admin_headers)

    assert products[0].id in {p["id"] for p in client.get("/api/products").json()}


def _sell(db, customer, product, quantity, status=models.OrderStatus.entregado):
    order = models.Order(user_id=customer.id, total_price=1000, delivery_address="Calle 1", status=status)
    order.items.append(models.OrderItem(product_id=product.id, quantity=quantity, price_at_purchase=product.price))
    db.add(order)
    db.commit()


def test_catalog_reports_units_sold(client, db, customer, products):
    _sell(db, customer, products[1], 3)
    _sell(db, customer, products[1], 2, models.OrderStatus.pendiente)
    _sell(db, customer, products[1], 9, models.OrderStatus.cancelado)  # no cuenta

    body = {p["id"]: p["units_sold"] for p in client.get("/api/products").json()}

    assert body == {products[0].id: 0, products[1].id: 5}


def test_catalog_sorts_best_sellers_first(client, db, customer, products):
    _sell(db, customer, products[1], 4)

    ids = [p["id"] for p in client.get("/api/products?sort=best_sellers").json()]

    assert ids == [products[1].id, products[0].id]


def test_catalog_rejects_unknown_sort(client):
    assert client.get("/api/products?sort=precio").status_code == 422
