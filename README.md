# Aura Food 🛒

Aura Food es una plataforma integral (end-to-end) para que los supermercados ofrezcan sus productos sin intermediarios, permitiendo a los clientes hacer pedidos desde casa y a la tienda gestionar su inventario y domicilios sin pagar altas comisiones.

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:
1. **Frontend:** Aplicación web en React + Vite.
2. **Backend:** API en Python (próximamente) con base de datos PostgreSQL.

## Configuración del Entorno de Desarrollo

### Frontend (React)

Requisitos previos:
- [Node.js](https://nodejs.org/) (versión 20.x recomendada).

Pasos:
1. Clona el repositorio.
2. Abre la terminal en la carpeta `aura-food`.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Backend (Python)

Requisitos previos:
- [Python 3.10+](https://www.python.org/)

1. Ve a la raíz del proyecto (próximamente habrá una carpeta `backend`).
2. Crea un entorno virtual:
   ```bash
   python -m venv venv
   ```
3. Activa el entorno virtual:
   - En Windows: `.\venv\Scripts\activate`
   - En Mac/Linux: `source venv/bin/activate`
4. Instala las dependencias iniciales:
   ```bash
   pip install -r requirements.txt
   ```

## Flujo de Trabajo

Por favor, lee el archivo [CONTRIBUTING.md](CONTRIBUTING.md) antes de empezar a programar. Ahí explicamos cómo usar Git y cómo nos vamos a organizar para no pisarnos el código.
