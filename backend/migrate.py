from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        try:
            # Add new columns to products table
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price FLOAT;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS tag VARCHAR;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS origin VARCHAR;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR;"))
            
            conn.commit()
            print("Migración exitosa: columnas agregadas a la tabla products.")
        except Exception as e:
            print(f"Error en la migración: {e}")

if __name__ == "__main__":
    run_migration()
