"""Datos de demostración: catálogo completo, clientes de ejemplo y pedidos en todos los estados.

Es idempotente y solo toca registros de demo:
- Productos: se buscan por nombre. Si existen se actualizan sus datos (nunca el stock); si no, se crean.
- Clientes: correos @demo.aurafood.com. Se crean solo si está definida SEED_DEMO_PASSWORD y nunca se cambia la
  contraseña de uno existente.
- Pedidos: solo se crean para clientes demo que todavía no tienen pedidos.

Uso (después de seed.py): python seed_demo.py
"""
import os
import sys
from datetime import timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app import models, settings, utils
from app.database import SessionLocal

UNSPLASH = "https://images.unsplash.com/photo-{}?w=600&q=80&auto=format&fit=crop"

# (nombre, categoría, precio, precio anterior, stock inicial, unidad, etiqueta, origen, id de la foto en Unsplash)
DEMO_PRODUCTS = [
    ("Banano Criollo", "frutas", 2800, None, 80, "x 1 kg", "Popular", "🌿 Urabá Antioqueño", "1571771894821-ce9b6c11b08e"),
    ("Fresas Frescas", "frutas", 7900, 9500, 18, "x 500g", "-17% Hoy", "🍓 Sabana de Bogotá", "1464965911861-746a04b4bca6"),
    ("Naranja Valencia", "frutas", 4200, None, 45, "x 2 kg", "Jugosa", "🌿 Cosecha Nacional", "1547514701-42782101795e"),
    ("Zanahoria Orgánica", "frutas", 2600, None, 35, "x 1 kg", "Orgánico", "🌱 Huerta Directa", "1598170845058-32b9d6a5da37"),
    ("Limón Tahití", "frutas", 3900, 4600, 40, "x 1 kg", "-15% Hoy", "🌿 Cosecha Nacional", "1590502593747-42a996133562"),
    ("Mango Tommy", "frutas", 5500, None, 8, "x 2 uds", "Temporada", "☀️ Tolima", "1553279768-865429fa0078"),
    ("Piña Oro Miel", "frutas", 6900, None, 22, "x 1 ud", "Dulce", "☀️ Valle del Cauca", "1550258987-190a2d41a8ba"),
    ("Espinaca Baby Orgánica", "frutas", 4800, None, 15, "x 250g", "Orgánico", "🌱 Cultivo Hidropónico", "1576045057995-568f588f82fb"),
    ("Papa Pastusa", "frutas", 3200, None, 60, "x 2 kg", "Fresco", "⛰️ Boyacá", "1518977676601-b53f82aba655"),
    ("Cebolla Morada", "frutas", 3600, None, 0, "x 1 kg", "Fresco", "🌿 Cosecha Nacional", "1618512496248-a07fe83aa8cb"),
    ("Sandía Baby", "frutas", 9800, 11500, 6, "x 1 ud", "-15% Hoy", "☀️ Costa Caribe", "1587049352846-4a222e784d38"),
    ("Queso Campesino", "dairy", 9200, None, 25, "x 500g", "Artesanal", "🧀 Ubaté", "1559561853-08451507cbe7"),
    ("Queso Madurado", "dairy", 16500, 18900, 12, "x 400g", "-13% Hoy", "🧀 Cava 6 meses", "1486297678162-eb2a19b0a32d"),
    ("Yogur Griego Natural", "dairy", 7400, None, 30, "x 500g", "Proteína", "🥛 Sin azúcar añadida", "1488477181946-6428a0291777"),
    ("Huevos Campesinos AA", "dairy", 14500, None, 40, "x 30 uds", "Popular", "🐔 Gallinas libres", "1582722872445-44dc5f7e3c8f"),
    ("Mantequilla sin Sal", "dairy", 8900, None, 9, "x 250g", "Fresco", "🥛 Crema de leche", "1589985270826-4b7bb135bc9d"),
    ("Lomo de Res", "meat", 32900, None, 14, "x 1 kg", "Premium", "🥩 Ganado de pastoreo", "1603048297172-c92544798d5a"),
    ("Punta de Anca", "meat", 36500, 41000, 10, "x 1 kg", "-11% Hoy", "🔥 Ideal para asar", "1588168333986-5078d3ae3976"),
    ("Filete de Salmón", "meat", 28900, None, 7, "x 400g", "Omega 3", "🐟 Pesca responsable", "1599084993091-1cb5c0721cc6"),
    ("Chuleta de Cerdo", "meat", 18900, None, 20, "x 1 kg", "Fresco", "🌿 Granja local", "1602470520998-f4a52199a3d6"),
    ("Pan Integral de Masa Madre", "bakery", 9500, None, 16, "x 700g", "Horneado Hoy", "🏠 Fermentación 24h", "1509440159596-0249088772ff"),
    ("Pan Campesino Tajado", "bakery", 7200, None, 20, "x 600g", "Horneado Hoy", "🏠 Receta tradicional", "1549931319-a545dcf3bc73"),
    ("Muffins de Arándano", "bakery", 11900, 13900, 12, "x 4 uds", "-14% Hoy", "🫐 Fruta real", "1607958996333-41aef7caefaa"),
    ("Limpiador Multiusos", "cleaning", 9900, None, 45, "x 750ml", "Biodegradable", "🍋 Aroma limón", "1563453392212-326f5e854473"),
    ("Guantes de Aseo", "cleaning", 6500, None, 30, "x 1 par", "Reutilizable", "🧤 Talla M", "1585421514738-01798e348b17"),
]

# Fotos para productos del seed base que no tenían imagen
BASE_PRODUCT_IMAGES = {
    "Croissant de Mantequilla": "1555507036-ab1f4038808a",
    "Detergente Ecológico": "1631729371254-42c2892f0e6e",
    "Tomate Chonto Seleccionado": "1582284540020-8acbe03f4924",
}

DEMO_CUSTOMERS = [
    {"email": "ana.gomez@demo.aurafood.com", "name": "Ana Gómez", "address": "Calle 85 # 11-42, Apto 502, Bogotá",
     "phone": "3104567890", "joined_days_ago": 45},
    {"email": "carlos.rios@demo.aurafood.com", "name": "Carlos Ríos", "address": "Carrera 7 # 72-13, Bogotá",
     "phone": "3157894561", "joined_days_ago": 30},
    {"email": "valentina.mora@demo.aurafood.com", "name": "Valentina Mora", "address": "Avenida 19 # 104-37, Bogotá",
     "phone": "3209876543", "joined_days_ago": 12},
]

S = models.OrderStatus
# Por cliente: (estado, hace cuántas horas se pidió, [(producto, cantidad)], pago, nota o motivo de rechazo)
DEMO_ORDERS = {
    "ana.gomez@demo.aurafood.com": [
        (S.entregado, 24 * 9, [("Huevos Campesinos AA", 1), ("Pan Integral de Masa Madre", 1)], "card", None),
        (S.entregado, 24 * 4, [("Lomo de Res", 1), ("Papa Pastusa", 1), ("Limón Tahití", 1)], "cash", None),
        (S.asignado, 1, [("Fresas Frescas", 2), ("Yogur Griego Natural", 1)], "card", "Dejar en portería"),
        (S.pendiente, 0.2, [("Banano Criollo", 2), ("Queso Campesino", 1)], "cash", "Llamar al llegar"),
    ],
    "carlos.rios@demo.aurafood.com": [
        (S.entregado, 24 * 6, [("Punta de Anca", 1), ("Cebolla Morada", 2)], "card", None),
        (S.rechazado, 24 * 2, [("Filete de Salmón", 3)], "card", "No alcanzamos a recibir el salmón del proveedor hoy"),
        (S.preparado, 2, [("Limpiador Multiusos", 2), ("Guantes de Aseo", 1)], "cash", None),
    ],
    "valentina.mora@demo.aurafood.com": [
        (S.entregado, 24 * 3, [("Muffins de Arándano", 1), ("Mantequilla sin Sal", 1)], "card", None),
        (S.cancelado, 24 * 1, [("Piña Oro Miel", 1)], "cash", None),
        (S.pendiente, 0.5, [("Mango Tommy", 1), ("Espinaca Baby Orgánica", 1), ("Naranja Valencia", 1)], "card", None),
    ],
}


def seed_products(db: Session) -> dict[str, models.Product]:
    by_name = {p.name: p for p in db.query(models.Product).all()}
    created = 0
    for name, category, price, old_price, stock, unit, tag, origin, photo in DEMO_PRODUCTS:
        fields = {
            "category": category, "price": price, "old_price": old_price, "unit": unit, "tag": tag,
            "origin": origin, "image_url": UNSPLASH.format(photo),
        }
        product = by_name.get(name)
        if product:
            # El stock es inventario real (cambia con los pedidos): solo se fija al crear el producto
            for field, value in fields.items():
                setattr(product, field, value)
        else:
            product = models.Product(name=name, stock=stock, is_active=True, **fields)
            db.add(product)
            by_name[name] = product
            created += 1
    for name, photo in BASE_PRODUCT_IMAGES.items():
        if name in by_name and not by_name[name].image_url:
            by_name[name].image_url = UNSPLASH.format(photo)
    db.flush()
    print(f"Productos demo: {created} creados, {len(DEMO_PRODUCTS) - created} actualizados")
    return by_name


def seed_customers(db: Session) -> list[models.User]:
    password = os.getenv("SEED_DEMO_PASSWORD")
    customers = []
    for data in DEMO_CUSTOMERS:
        user = db.query(models.User).filter(models.User.email == data["email"]).first()
        if not user:
            if not password:
                print(f"Omitido {data['email']}: define SEED_DEMO_PASSWORD para crearlo")
                continue
            user = models.User(
                email=data["email"], name=data["name"], address=data["address"], phone=data["phone"],
                role=models.RoleEnum.cliente, password_hash=utils.hash_password(password),
                created_at=models.utc_now() - timedelta(days=data["joined_days_ago"]),
            )
            db.add(user)
            print(f"Cliente demo creado: {data['email']}")
        customers.append(user)
    db.flush()
    return customers


def seed_orders(db: Session, customers: list[models.User], products: dict[str, models.Product]) -> None:
    """Pedidos de ejemplo. No descuentan stock: representan ventas ya hechas y el stock demo ya las considera."""
    courier = db.query(models.User).filter(models.User.role == models.RoleEnum.domiciliario).order_by(models.User.id).first()
    fee = settings.get_delivery_fee()
    now = models.utc_now()
    created = 0
    for customer in customers:
        if db.query(models.Order).filter(models.Order.user_id == customer.id).count():
            continue
        for status, hours_ago, items, payment, note in DEMO_ORDERS.get(customer.email, []):
            created_at = now - timedelta(hours=hours_ago)
            order = models.Order(
                user_id=customer.id, status=status, delivery_address=customer.address, phone=customer.phone,
                payment_method=payment, created_at=created_at, delivery_fee=fee,
                notes=None if status == S.rechazado else note,
                rejection_reason=note if status == S.rechazado else None,
            )
            subtotal = Decimal(0)
            for name, quantity in items:
                product = products[name]
                subtotal += Decimal(product.price) * quantity
                order.items.append(models.OrderItem(product_id=product.id, quantity=quantity, price_at_purchase=product.price))
            order.total_price = subtotal + fee
            if status in (S.asignado, S.entregado) and courier:
                order.courier_id = courier.id
            if status == S.entregado:
                order.delivered_at = created_at + timedelta(minutes=40)
            db.add(order)
            created += 1
    print(f"Pedidos demo creados: {created}")


def seed_demo(db: Session) -> None:
    products = seed_products(db)
    customers = seed_customers(db)
    seed_orders(db, customers, products)
    db.commit()


def main() -> int:
    db = SessionLocal()
    try:
        seed_demo(db)
    except Exception as error:
        db.rollback()
        print(f"Error al cargar los datos de demo: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()
    print("Datos de demo listos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
