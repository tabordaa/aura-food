def test_list_products_is_public(client, products):
    response = client.get("/api/products")

    assert response.status_code == 200
    names = {product["name"] for product in response.json()}
    assert names == {"Aguacate", "Leche"}
