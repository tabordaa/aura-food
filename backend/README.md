# Aura Food Backend

Este es el backend de la aplicación, construido con **FastAPI** y **PostgreSQL** (vía SQLAlchemy).

## Requisitos Previos
- Python 3.9 o superior.

## Configuración del Entorno Local

Para evitar conflictos entre las librerías de este proyecto y otros proyectos que tengas en tu computadora, utilizamos un "Entorno Virtual" (`venv`).

### 1. Crear y Activar el Entorno Virtual
Abre tu terminal dentro de la carpeta `backend/` y ejecuta:

**En Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**En Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```
*(Sabrás que funcionó porque en tu terminal aparecerá `(venv)` al inicio de la línea).*

### 2. Instalar Dependencias
Con el entorno virtual activado, instala las librerías necesarias:
```bash
pip install -r requirements.txt
```

### 3. Variables de Entorno
1. Duplica el archivo `.env.example` y renómbralo a `.env`.
2. Solicítale al Tech Lead la contraseña de la base de datos o la cadena de conexión completa y pégala en `DATABASE_URL`.

### 4. Ejecutar el Servidor
Para levantar la API en modo desarrollo (se reinicia automáticamente si detecta cambios en el código), ejecuta:
```bash
uvicorn app.main:app --reload
```
La API estará disponible en: [http://localhost:8000](http://localhost:8000)

Puedes ver y probar todos los endpoints desde la documentación interactiva (Swagger) en:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Endpoints de pedidos

- `GET /orders`: devuelve los pedidos con sus ítems.
- `PATCH /orders/{id}/status`: actualiza el estado del pedido. Envía, por ejemplo, `{"status": "entregado"}`.

Los estados válidos son `pendiente`, `preparado`, `asignado` y `entregado`.
