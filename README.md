# 🍏 AppCalorias - Tracker Nutricional

AppCalorias es una aplicación web móvil (PWA/SPA) diseñada para el seguimiento nutricional y la conexión entre profesionales de la nutrición (Coaches) y sus pacientes (Alumnos). 

Está construida con un enfoque **Mobile-First**, simulando la fluidez, gestos y diseño de una aplicación nativa.

---

## ✨ Características Principales

### 👤 Perfil Alumno (Diario Nutricional)
* **Gestión de Comidas:** Visualización de Desayuno, Almuerzo, Merienda y Cena.
* **Modo Dual:** Alternancia en tiempo real entre vista por **Macronutrientes (Kcal/g)** y vista por **Porciones Equivalentes**.
* **Gestos Nativos (Swipe to Reveal):** Deslizamiento táctil hacia la derecha sobre un alimento para revelar la opción de eliminar.
* **Sistema de Reemplazos:** Modal inteligente que sugiere alimentos equivalentes según el grupo macro (Ej: reemplazar 1 porción de HC puro por otra).
* **Catálogo de Alimentos:** Interfaz para añadir alimentos categorizados por Proteínas, Carbohidratos y Grasas, con buscador integrado y sub-acordeones.
* **Balance Dinámico:** Barras de progreso que se actualizan en tiempo real al marcar, desmarcar, añadir o eliminar alimentos.

### 📋 Perfil Coach (Panel de Gestión)
* **Métricas Rápidas:** KPI de alumnos activos y planes pendientes de revisión.
* **Directorio de Alumnos:** Lista de pacientes con su nivel de adherencia a la dieta en tiempo real (Color coding: verde/amarillo/rojo).
* **Accesos Directos:** Botones para revisar el diario específico del alumno o editar su plan base.

---

## 📂 Arquitectura del Proyecto

El proyecto está organizado de forma modular para separar el punto de acceso (Login) de las vistas específicas de cada tipo de usuario, compartiendo un único archivo de estilos.

```text
app-tracker/
├── css/
│   └── styles.css              # Estilos globales, utilidades personalizadas y animaciones
├── pages/
│   ├── alumno.html             # Diario nutricional interactivo (Vista Alumno)
│   └── coach-dashboard.html    # Panel de gestión de pacientes (Vista Coach)
├── .env                        # Variables de entorno (Creado localmente, no se sube)
├── index.html                  # Punto de entrada: Registro y selección de rol
└── README.md                   # Documentación del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 & CSS3:** Estructura semántica y optimización de gestos (`touch-action`, ocultamiento de scrollbars).
* **Vanilla JavaScript:** Lógica de estado, interactividad y manipulación del DOM sin frameworks pesados.
* **Tailwind CSS (CDN):** Estilos, diseño responsive y utilidades de interfaz.
* **Vite:** Servidor de desarrollo local rápido y herramienta de construcción.
* **Supabase:** Backend as a Service (BaaS) para la base de datos y autenticación de usuarios.

---

## 🚀 Cómo levantar el proyecto localmente

Para poder ejecutar la aplicación y que se conecte correctamente a la base de datos, seguí estos pasos:

### 1. Clonar el repositorio
Abrí una terminal y descargá el proyecto:
```bash
git clone [ACA_PONE_EL_LINK_DE_TU_REPO_DE_GITHUB]
cd AppCalorias
```

### 2. Instalar dependencias
Asegurate de tener **Node.js** instalado en tu computadora. Luego, ejecutá:
```bash
npm install
```

### 3. Configurar variables de entorno (¡MUY IMPORTANTE!) ⚠️
Por seguridad, el archivo con las claves de la base de datos NO se sube a GitHub. **Tenés que crearlo a mano**:

1. Creá un archivo en la raíz del proyecto (al mismo nivel que el `index.html`) y ponele exactamente este nombre: `.env`
2. Entrá a nuestro proyecto en [Supabase](https://supabase.com) (aceptá la invitación que te llegó al mail si no lo hiciste).
3. Andá a la ruedita de configuración (Project Settings) -> API.
4. Pegá esto adentro de tu archivo `.env`, reemplazando con los valores que ves en Supabase:

```env
VITE_SUPABASE_URL=pega_aca_la_URL_del_proyecto
VITE_SUPABASE_ANON_KEY=pega_aca_la_clave_anon_public
```
*Nota: Guardá el archivo. No te preocupes, Git está configurado para ignorarlo y no subirlo accidentalmente.*

### 4. Levantar el servidor
Una vez que tengas el `.env` guardado, ejecutá:
```bash
npx vite
```
Hacé clic en el enlace local (suele ser `http://localhost:5173/`) y ¡listo! 

*(Para apagar el servidor en cualquier momento, presioná `Ctrl + C` en la terminal).*

> **💡 Tip para pruebas:** Abre las herramientas de desarrollador (F12) en tu navegador y activa la vista de dispositivo móvil para experimentar la interfaz y los gestos táctiles correctamente.