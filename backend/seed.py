from app.database import SessionLocal, engine
from app import models, utils

# Asegurarse de que las tablas existan
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        # Crear usuario de prueba si no existe
        test_user = db.query(models.User).filter(models.User.email == "test@aurafood.com").first()
        if not test_user:
            test_user = models.User(
                name="Cliente de Prueba",
                email="test@aurafood.com",
                password_hash=utils.hash_password("admin123"),  # Contraseña real encriptada
                role=models.RoleEnum.cliente,
                address="Av. Siempre Viva 123",
                phone="3001234567"
            )
            db.add(test_user)
            db.commit()
            print("Usuario de prueba creado (ID: 1)")

        # Crear productos de prueba si no existen
        products = [
            {"id": 1, "name": "Aguacate Hass Maduro", "price": 4500, "old_price": None, "tag": "Fresco", "origin": "🌿 Cosecha Nacional", "unit": "x 500g", "category": "frutas", "stock": 50, "image_url": ""},
            {"id": 2, "name": "Manzanas Rojas Frescas", "price": 5200, "old_price": None, "tag": "Popular", "origin": "✈️ Importada Premium", "unit": "x 1 kg", "category": "frutas", "stock": 30, "image_url": ""},
            {"id": 3, "name": "Leche Entera Orgánica", "price": 3800, "old_price": None, "tag": "Orgánico", "origin": "🔬 100% Pasteurizada", "unit": "x 1000ml", "category": "dairy", "stock": 40, "image_url": ""},
            {"id": 4, "name": "Brócoli Fresco Criollo", "price": 2900, "old_price": 3600, "tag": "-20% Hoy", "origin": "🌱 Huerta Directa", "unit": "x 500g", "category": "frutas", "stock": 25, "image_url": ""},
            {"id": 5, "name": "Pechuga de Pollo Campero", "price": 12400, "old_price": None, "tag": "Popular", "origin": "🌿 Libre de Antibióticos", "unit": "x 800g", "category": "meat", "stock": 20, "image_url": ""},
            {"id": 6, "name": "Croissant de Mantequilla", "price": 6500, "old_price": None, "tag": "Horneado Hoy", "origin": "🏠 Masa Madre 24h", "unit": "x 4 uds", "category": "bakery", "stock": 60, "image_url": ""},
            {"id": 7, "name": "Tomate Chonto Seleccionado", "price": 3400, "old_price": None, "tag": "Fresco", "origin": "⭐ Calidad Superior", "unit": "x 1 kg", "category": "frutas", "stock": 15, "image_url": ""},
            {"id": 8, "name": "Detergente Ecológico", "price": 14900, "old_price": None, "tag": "Biodegradable", "origin": "🌿 Aroma Eucalipto", "unit": "x 1.5 L", "category": "cleaning", "stock": 100, "image_url": ""}
        ]

        for p_data in products:
            existing = db.query(models.Product).filter(models.Product.id == p_data["id"]).first()
            if not existing:
                product = models.Product(**p_data)
                db.add(product)
        
        db.commit()
        print("8 Productos de prueba creados")

    except Exception as e:
        print(f"Error al poblar base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Poblando la base de datos...")
    seed_data()
    print("Proceso terminado.")
