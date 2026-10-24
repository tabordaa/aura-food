import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Cargar variables de entorno desde el archivo .env
load_dotenv()


def normalize_database_url(url: str) -> str:
    """Usa siempre el driver instalado (psycopg2) para PostgreSQL.

    Desde SQLAlchemy 2.1 una URL `postgresql://` usa por defecto psycopg (v3), que no está instalado.
    También acepta el prefijo `postgres://` que entregan algunos proveedores.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix):]
    return url


# Obtener URL de la base de datos (por defecto usará SQLite local si no hay URL)
SQLALCHEMY_DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL") or "sqlite:///./sql_app.db")

# Configurar el motor de conexión
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para inyectar la sesión en las rutas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
