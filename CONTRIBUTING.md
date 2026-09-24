# Guía para el Trabajo en Equipo (Git)

¡Bienvenidos al equipo! Para trabajar juntos en Aura Food sin borrar el código de los demás ni romper la aplicación, usaremos un flujo de trabajo sencillo en Git.

## Las Reglas de Oro

1. **NUNCA programes en la rama `main` ni en `develop`.** Esas ramas son sagradas.
2. Cada vez que vayas a hacer algo (una nueva pantalla, un botón, corregir un error), **crea una rama nueva**.
3. Antes de empezar tu día de trabajo, **actualiza tu código local** trayendo lo último de GitHub.

## Tipos de Ramas (El concepto de "Características")

El proyecto tiene dos ramas principales que ya existen en GitHub:
- `main`: Es la versión final. Solo se actualiza cuando tenemos algo 100% probado (como para una presentación).
- `develop`: Es la versión "en desarrollo". Aquí es donde unimos el trabajo de todos.

### Ramas de Características (`feat/...` o `fix/...`)

Cuando te asignen una tarea (una "característica" o "feature"), debes crear una ramificación a partir de `develop`. Imagina que sacas una copia del código solo para ti, trabajas ahí sin molestar a nadie, y luego proponemos unir esa copia de vuelta.

- Si es una funcionalidad nueva, nómbrala con `feat/`: `feat/carrito-compras`, `feat/pantalla-domiciliario`
- Si es un arreglo de un bug, nómbrala con `fix/`: `fix/error-login`

## Flujo Paso a Paso (Tu día a día)

### 1. Clonar el repositorio (Solo la primera vez)
```bash
git clone https://github.com/tu-usuario/aura-food.git
cd aura-food
```

### 2. Antes de empezar a programar: Actualízate
Asegúrate de estar en `develop` y traer los últimos cambios de tus compañeros.
```bash
git checkout develop
git pull origin develop
```

### 3. Crea tu rama para la nueva tarea
```bash
git checkout -b feat/mi-tarea
```
*(Ejemplo: `git checkout -b feat/pantalla-domicilios`)*

### 4. Programa y guarda tus cambios
Haz tus cambios en el código (CSS, React, etc.). Cuando termines algo importante:
```bash
git add .
git commit -m "feat: agregada la pantalla inicial del domiciliario"
```

### 5. Sube tu rama a GitHub
```bash
git push -u origin feat/mi-tarea
```

### 6. Pide que revisen tu código (Pull Request - PR)
1. Ve a GitHub.
2. Verás un botón verde que dice **"Compare & pull request"**.
3. Asegúrate de que estás uniendo tu rama hacia `develop` (no hacia `main`).
4. Avisa por el grupo: *"¡Muchachos, subí la pantalla del carrito, revisen el PR!"*.
5. El **Tech Lead** revisará el código y, si todo está bien, hará el "Merge" (unirá tu código con `develop`).
6. Una vez unido, tu tarea está lista. ¡Vuelve al Paso 2 para tu siguiente tarea!
