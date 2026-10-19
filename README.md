# AppCalorias 🥗⚡

> Aplicación web integral para seguimiento nutricional, cálculo de equivalencias alimenticias y planificación deportiva, diseñada para coaches y alumnos.

AppCalorias es una plataforma **Vanilla Web pura (buildless)** optimizada para dispositivos móviles (mobile-first), desarrollada con **HTML5 semántico**, **CSS Custom Properties (Tokens)**, **JavaScript moderno (ES Modules nativos)** y **Supabase (PostgreSQL, Auth y Row Level Security)**. Cero dependencias pesadas, cero herramientas de empaquetado (*no Webpack, no Vite, no npm build*).

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Python 3.8+** (para servir los archivos estáticos localmente).
- Navegador web moderno compatible con ES Modules (Chrome, Edge, Firefox, Safari).

### Puesta en Marcha Local

#### En Windows:
Hacé doble clic en [`iniciar.bat`](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/iniciar.bat) o ejecutalo desde la consola:
```cmd
iniciar.bat
```

#### En Linux / macOS / PowerShell manual:
```bash
python -m http.server 3000 --directory frontend
```

Luego abrí tu navegador en:
- 📱 **Aplicación web:** [http://localhost:3000/](http://localhost:3000/)
- 📘 **Portal de Documentación Técnica:** [http://localhost:3000/docs-dashboard.html](http://localhost:3000/docs-dashboard.html)

> [!IMPORTANT]
> El servidor web **debe** ejecutarse con el directorio `frontend/` como raíz (puerto 3000), ya que las rutas relativas de importación de módulos y recursos están configuradas a partir de esa base.

---

## 📁 Estructura del Repositorio

```text
AppCalorias/
├── frontend/                     # Aplicación web cliente (Vanilla Web)
│   ├── index.html                # Inicio de sesión (punto de entrada)
│   ├── registro.html             # Registro de nuevas cuentas (alumno / coach)
│   ├── docs-dashboard.html       # Hub interactivo de documentación técnica
│   ├── pages/                    # Vistas divididas por rol
│   │   ├── alumno/               # Dashboard, plan, comidas, reemplazo, perfil
│   │   ├── coach/                # Clientes, planes, historial, editor, buscador
│   │   └── shared/               # Pantallas compartidas (contexto energético)
│   ├── css/                      # Sistema de diseño desacoplado
│   │   ├── base.css              # Tokens (:root), reseteo, tipografía y viewport
│   │   ├── components.css        # Componentes compartidos y utilidades ARIA
│   │   └── pages/                # Estilos específicos por sección (alumno, coach, cuenta)
│   └── js/                       # Arquitectura modular JavaScript (33 módulos)
│       ├── ui/                   # 21 controladores de interfaz con mapas SELECTORES
│       ├── data/                 # 7 módulos de capa de datos y cliente Supabase
│       ├── calc/                 # 3 motores matemáticos puros (Atwater, equivalencias, formato)
│       └── utils/                # Utilidades de navegación, avisos toast y formato
├── supabase/                     # Infraestructura de base de datos
│   ├── migrations/               # Scripts DDL de migración PostgreSQL
│   ├── rollback/                 # Scripts de reversión (.down.sql)
│   ├── tests/                    # Suites de pruebas pgTAP para base de datos
│   ├── ESQUEMA.md                # Diccionario de datos y diagrama entidad-relación
│   └── README.md                 # Guía para aplicar migraciones en Supabase SQL Editor
├── scratch/                      # Suites de pruebas de integración y validación local
├── DESIGN.md                     # Especificación de tokens, colores, tipografía y espaciados
├── ROADMAP_Y_ESTRUCTURA.md       # Hoja de ruta, decisiones tomadas y backlog de tareas
├── CHANGELOG.md                  # Registro histórico de versiones ejecutivas (v0.1.0 -> v0.5.0)
├── CONTRIBUTING.md               # Guía de estilo, mapa SELECTORES y ciclo de pruebas
├── .env.example                  # Plantilla de variables de entorno y configuración
└── iniciar.bat                   # Lanzador automático de desarrollo local para Windows
```

---

## 👥 Roles y Flujos de Usuario

### 🏋️ Alumno
Diseñado para la persona que busca saber **qué comer y qué hacer de forma inmediata**:
- **Dashboard Diario:** Selector de fecha con rueda interactiva, contador dinámico de calorías y macronutrientes (P, C, G) del día, tarjetas de 4 comidas (Desayuno, Almuerzo, Merienda, Cena) con marcado *1-Tap Check* ("Lo comí") y contador de hidratación.
- **Plan Alimenticio:** Visualización clara de la pauta asignada por el coach, sin fórmulas complejas.
- **Motor de Reemplazo de Alimentos:** Algoritmo en cliente basado en *Mediana Ponderada L1* que calcula porciones equitativas en gramos o unidades con semáforo nutricional de compatibilidad.
- **Perfil y Objetivo:** Regla analógica táctil para registrar el peso corporal y visualización del objetivo calórico.

### 📋 Coach
Diseñado para la gestión ágil y supervisión técnica:
- **Gestión de Clientes:** Listado de alumnos asignados y vinculación inmediata por código único de cliente (`NF-XXXX-YY`).
- **Ficha del Alumno:** Consulta del plan vigente, historial metabólico y opciones de edición.
- **Editor Reactivo de Planes:** Creación de planes desde cero o basados en plantillas previas, con recálculo en tiempo real de calorías y macronutrientes mediante fórmula termodinámica Atwater ($4P + 4C + 9G$).
- **Historial de Planes:** Línea de tiempo de versiones previas archivadas con capacidad de reactivación.
- **Buscador de Alimentos:** Exploración de catálogo con filtrado por categoría y cálculo por porción.

### 🌐 Compartido (Contexto Energético)
- Pantalla interactiva que calcula la **Tasa Metabólica Basal (TMB - Mifflin-St Jeor)**, **Gasto no deportivo (NEAT)**, **Gasto por ejercicio (METs)**, **Efecto Termogénico de los Alimentos (TEF 10%)** y el **Gasto Energético Total Diario (TDEE)**, con alertas de seguridad ante déficits calóricos severos.

---

## 🎨 Sistema de Diseño (Design Tokens)

La interfaz se rige por las directrices de [`DESIGN.md`](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/DESIGN.md):
- **Tipografía:** *Bricolage Grotesque* (títulos numéricos con números tabulares `tabular-nums`) e *Instrument Sans* (cuerpo y controles).
- **Colores Principales:** Marca Verde Esmeralda (`#1E6847`), Fondos neutros de contraste (`#F5F4F0` / `#FFFFFF`), Acentos de advertencia (`#B45309`) y Peligro (`#B91C1C`).
- **Accesibilidad y Ergonomía:** Zona táctil mínima de **44 × 44 px** (`--alto-tactil`), cierre rápido de modales con tecla `Escape` o clic exterior, y sanitización automática de comas a puntos en teclados móviles `inputmode="decimal"`.

---

## 🧪 Pruebas y Validación

El proyecto cuenta con suites de validación automatizadas ejecutables con Python:
```powershell
# 1. Validación de sintaxis JS en los 33 módulos (sin errores delimitadores)
python scratch/validate_js.py

# 2. Verificación de arquitectura modular, mapas SELECTORES e imports acíclicos
python scratch/test_modularization.py

# 3. Integridad de enlaces HTML y carga de scripts
python scratch/test_navigation_integrity.py

# 4. Pruebas de integración de capa de datos Supabase
python scratch/test_supabase_modules.py

# 5. Pruebas de motor de equivalencias y fórmulas nutricionales
python scratch/test_equivalencia_calc.py
python scratch/test_nutricion_calc.py

# 6. Pruebas interactivas en navegador Chromium/Edge headless
python scratch/test_dashboard_ui.py
python scratch/test_reemplazar_ui.py
```

---

## 📚 Documentación Técnica Detallada

- 🗺️ [**ROADMAP_Y_ESTRUCTURA.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/ROADMAP_Y_ESTRUCTURA.md): Decisiones arquitectónicas, estado de avance y backlog de tareas priorizadas.
- 📐 [**DESIGN.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/DESIGN.md): Especificación de tokens CSS, componentes y lineamientos visuales.
- 🗄️ [**supabase/ESQUEMA.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/supabase/ESQUEMA.md): Esquema relacional, políticas RLS y funciones almacenadas PostgreSQL.
- 📜 [**CHANGELOG.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/CHANGELOG.md): Registro histórico de versiones ejecutivas.
- 🤝 [**CONTRIBUTING.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/CONTRIBUTING.md): Guía de desarrollo, convención de módulos y mapas `SELECTORES`.
- 📊 [**docs/database/EXPLICACION_TABLAS_SUPABASE.md**](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/docs/database/EXPLICACION_TABLAS_SUPABASE.md): Explicación pedagógica de entidades de planes y registros.
