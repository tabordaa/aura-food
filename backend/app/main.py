from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import orders

# Crear las tablas en la base de datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aura Food API", description="API para el sistema de supermercado y domicilios")

# Configurar CORS para permitir que el frontend de React (Vite) consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Puertos comunes de dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Aura Food. Visita /docs para ver la documentación."}
