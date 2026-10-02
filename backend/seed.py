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
            {"id": 1, "name": "Aguacate Hass", "price": 9200, "category": "Frutas", "stock": 50, "image_url": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=200"},
            {"id": 2, "name": "Leche Entera", "price": 7800, "category": "Lácteos", "stock": 30, "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200"},
            {"id": 3, "name": "Brócoli Fresco", "price": 7500, "category": "Verduras", "stock": 40, "image_url": "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&q=80&w=200"},
            {"id": 4, "name": "Fresas Hidropónicas", "price": 12500, "category": "Frutas", "stock": 25, "image_url": "https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&q=80&w=200"},
            {"id": 5, "name": "Huevos Campesinos (x12)", "price": 15000, "category": "Proteínas", "stock": 20, "image_url": "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=200"},
            {"id": 6, "name": "Espinaca Baby", "price": 4500, "category": "Verduras", "stock": 60, "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=200"},
            {"id": 7, "name": "Pan Integral Artesanal", "price": 8500, "category": "Panadería", "stock": 15, "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=200"},
            {"id": 8, "name": "Tomate Chonto", "price": 3200, "category": "Verduras", "stock": 100, "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=200"}
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
