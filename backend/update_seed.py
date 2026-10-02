from app.database import SessionLocal
from app import models, utils

def update_data():
    db = SessionLocal()
    try:
        # Creación de usuarios con roles específicos
        users_to_seed = [
            {
                "email": "admin@aurafood.com",
                "name": "Administrador Principal",
                "password_hash": utils.hash_password("admin123"),
                "role": models.RoleEnum.admin,
                "address": "Oficina Central",
                "phone": "3000000001"
            },
            {
                "email": "domicilio@aurafood.com",
                "name": "Repartidor Express",
                "password_hash": utils.hash_password("domicilio123"),
                "role": models.RoleEnum.domiciliario,
                "address": "Punto de Despacho",
                "phone": "3000000002"
            }
        ]

        for u_data in users_to_seed:
            existing_user = db.query(models.User).filter(models.User.email == u_data["email"]).first()
            if existing_user:
                for key, value in u_data.items():
                    setattr(existing_user, key, value)
            else:
                db.add(models.User(**u_data))
        
        # Productos
        products = [
            {"id": 1, "name": "Aguacate Hass Maduro", "price": 4500, "old_price": None, "tag": "Fresco", "origin": "🌿 Cosecha Nacional", "unit": "x 500g", "category": "frutas", "stock": 50, "image_url": "https://images.unsplash.com/photo-1669143017427-26801de9bcc6?q=80&w=1114&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
            {"id": 2, "name": "Manzanas Rojas Frescas", "price": 5200, "old_price": None, "tag": "Popular", "origin": "✈️ Importada Premium", "unit": "x 1 kg", "category": "frutas", "stock": 30, "image_url": "https://plus.unsplash.com/premium_photo-1667049292983-d2524dd0ef08?q=80&w=1149&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
            {"id": 3, "name": "Leche Entera Orgánica", "price": 3800, "old_price": None, "tag": "Orgánico", "origin": "🔬 100% Pasteurizada", "unit": "x 1000ml", "category": "dairy", "stock": 40, "image_url": "https://images.unsplash.com/photo-1635436338433-89747d0ca0ef?q=80&w=943&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
            {"id": 4, "name": "Brócoli Fresco Criollo", "price": 2900, "old_price": 3600, "tag": "-20% Hoy", "origin": "🌱 Huerta Directa", "unit": "x 500g", "category": "frutas", "stock": 25, "image_url": "https://images.unsplash.com/photo-1685504445355-0e7bdf90d415?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
            {"id": 5, "name": "Pechuga de Pollo Campero", "price": 12400, "old_price": None, "tag": "Popular", "origin": "🌿 Libre de Antibióticos", "unit": "x 800g", "category": "meat", "stock": 20, "image_url": "https://images.unsplash.com/photo-1682991136736-a2b44623eeba?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
            {"id": 6, "name": "Croissant de Mantequilla", "price": 6500, "old_price": None, "tag": "Horneado Hoy", "origin": "🏠 Masa Madre 24h", "unit": "x 4 uds", "category": "bakery", "stock": 60, "image_url": ""},
            {"id": 7, "name": "Tomate Chonto Seleccionado", "price": 3400, "old_price": None, "tag": "Fresco", "origin": "⭐ Calidad Superior", "unit": "x 1 kg", "category": "frutas", "stock": 15, "image_url": ""},
            {"id": 8, "name": "Detergente Ecológico", "price": 14900, "old_price": None, "tag": "Biodegradable", "origin": "🌿 Aroma Eucalipto", "unit": "x 1.5 L", "category": "cleaning", "stock": 100, "image_url": ""}
        ]

        for p_data in products:
            existing = db.query(models.Product).filter(models.Product.id == p_data["id"]).first()
            if existing:
                for key, value in p_data.items():
                    setattr(existing, key, value)
            else:
                db.add(models.Product(**p_data))
        
        db.commit()
        print("Productos actualizados correctamente.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_data()
