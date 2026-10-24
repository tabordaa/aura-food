import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import admin, auth, config, orders, products

load_dotenv()

IS_PRODUCTION = os.getenv("ENV") == "production"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]

# En producción no se publica la documentación interactiva (/docs, /redoc, /openapi.json)
app = FastAPI(
    title="Aura Food API",
    description="API para el sistema de supermercado y domicilios",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Configurar CORS para permitir que el frontend de React (Vite) consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Aura Food. Visita /docs para ver la documentación."}

# Routers de la API
app.include_router(auth.router, prefix="/api/auth")
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(config.router, prefix="/api/config")
app.include_router(admin.router, prefix="/api/admin")
