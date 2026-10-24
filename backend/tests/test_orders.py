def _order_payload(products, quantity=2):
    return {
        "delivery_address": "Carrera 23 # 98-45",
        "phone": "3001234567",
        "payment_method": "cash",
        "items": [{"product_id": products[0].id, "quantity": quantity}],
    }


def test_create_order_uses_database_prices_and_discounts_stock(client, db, customer, products):
    response = client.post(f"/api/orders?user_id={customer.id}", json=_order_payload(products))

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["total_price"] == 9000
    assert body["status"] == "pendiente"
    db.refresh(products[0])
    assert products[0].stock == 8


def test_create_order_rejects_insufficient_stock(client, customer, products):
    response = client.post(f"/api/orders?user_id={customer.id}", json=_order_payload(products, quantity=99))

    assert response.status_code == 400
