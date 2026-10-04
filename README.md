# AppCalorias 🥑

Aplicación web de seguimiento nutricional con sistema **Coach → Alumno**.

> [!NOTE]
> **Actualización:** Se han añadido las carpetas `AppCalorias` y `AppCalorias-Coach`. Su contenido se encuentra en proceso de revisión y debe ser optimizado y adaptado al nuevo formato y estilo.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + Vanilla JS (ES Modules) |
| Estilos | TailwindCSS (CDN) + CSS custom |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Servidor local | Python `http.server` |

---

## Estructura del Proyecto

```
AppCalorias/
│
├── AppCalorias/            # 📁 Nuevo módulo (pendiente de optimización y adaptación de estilo/formato)
├── AppCalorias-coach/      # 📁 Nuevo módulo Coach (pendiente de optimización y adaptación de estilo/formato)
├── index.html              # 🚪 Entry point — Login / Registro
├── README.md
├── DESIGN.md               # Decisiones de diseño visual
├── .gitignore
│
├── src/                    # 📦 Código fuente del producto
│   ├── pages/
│   │   ├── alumno.html     # 🧑 Vista principal del Alumno (diario nutricional)
│   │   └── coach.html      # 🏋️ Dashboard del Coach (gestión de alumnos)
│   │
│   ├── js/
│   │   ├── config/
│   │   │   └── supabase.js          # Conexión a Supabase + helper requireAuth()
│   │   ├── services/
│   │   │   ├── auth.service.js      # Lógica de login/registro
│   │   │   └── coach.service.js     # Lógica del Coach
│   │   ├── utils/
│   │   │   ├── calculator.js        # Cálculo TDEE, BMR, macros, porciones
│   │   │   ├── equivalences.js      # Equivalencias de alimentos
│   │   │   └── storage.js           # Helpers de localStorage
│   │   ├── data/
│   │   │   └── food-catalog.js      # Catálogo de alimentos y categorías
│   │   └── app.js                   # Punto de entrada JS principal
│   │
│   └── css/
│       └── styles.css               # Estilos globales y utilities
│
├── docs/                   # 📚 Documentación técnica
│   ├── design/
│   │   ├── INFORME_MAQUETAS.md
│   │   └── mockups/                 # Maquetas estáticas de referencia (HTML)
│   └── database/
│       └── EXPLICACION_TABLAS_SUPABASE.md
│
└── tests/
    └── calculator.test.html         # Tests unitarios de la calculadora
```

---

## Cómo correr en local

```bash
# Desde la raíz del proyecto
python -m http.server 8080 --bind 127.0.0.1
```

Luego abre: **http://127.0.0.1:8080**

> ⚠️ **Importante**: Para testear Coach y Alumno simultáneamente, usa tu navegador habitual para uno y **una ventana de incógnito** para el otro. Si no, Supabase compartirá la sesión y dará errores RLS.

---

## Flujo de la aplicación

```
Usuario → index.html (Login/Registro)
              │
              ├── role: 'coach'   → src/pages/coach.html
              └── role: 'alumno'  → src/pages/alumno.html
```

### Coach puede:
- Ver alumnos **pendientes** de aprobación
- **Aprobar** alumnos
- Ver sus **alumnos aprobados**
- Cargar **métricas y contexto energético** (Déficit / Mantenimiento / Superávit) para cada alumno
- El sistema calcula automáticamente TDEE, macros y porciones diarias

### Alumno puede:
- Ver su **diario nutricional del día** (Hoy)
- Agregar alimentos a cada comida (Desayuno, Almuerzo, Merienda, Cena)
- Cambiar entre modo **Porciones** y **Kcal/g**
- Ver tabs de **Mi Plan**, **Progreso** y **Coach** (en desarrollo)

---

## Base de Datos (Supabase)

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios con rol (`coach`/`alumno`), estado y `coach_id` de asignación |
| `meal_plans` | Plan nutricional asignado por el coach al alumno |

Ver documentación detallada en [`docs/database/EXPLICACION_TABLAS_SUPABASE.md`](docs/database/EXPLICACION_TABLAS_SUPABASE.md)

---

## Fórmulas de Cálculo

Basadas en la **Calculadora Nico Duartes.xlsx**:

1. **BMR** (Mifflin-St Jeor): `10*peso + 6.25*altura - 5*edad ± 5/161`
2. **NEAT**: `pasos × 0.04`
3. **Gasto entrenamiento**: `MET × peso × horas × (días/7)`
4. **TDEE**: `BMR + NEAT + entrenamiento`
5. **TEF** (termogénesis): `BMR × 0.10`
6. **Objetivo calórico**: `TDEE + TEF ± contexto`
