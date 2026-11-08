# AppCalorias 🥗⚡

> Aplicación web integral para seguimiento nutricional, cálculo de equivalencias alimenticias y planificación deportiva, diseñada para coaches y alumnos.

AppCalorias es una plataforma **Vanilla Web pura (buildless)** optimizada para dispositivos móviles (mobile-first), desarrollada con **HTML5 semántico**, **CSS Custom Properties (Tokens)**, **JavaScript moderno (ES Modules nativos)** y **Supabase (PostgreSQL 15+, Auth y Row Level Security)**. Cero dependencias pesadas, cero herramientas de empaquetado (*no Webpack, no Vite, no npm build*).

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Python 3.8+** (para servir los archivos estáticos localmente).
- Navegador web moderno compatible con ES Modules (Chrome, Edge, Firefox, Safari).

### Puesta en Marcha Local

#### En Windows:
Hacé doble clic en [`iniciar.bat`](iniciar.bat) o ejecutalo desde la consola:
```cmd
iniciar.bat
```

#### En Linux / macOS / PowerShell manual:
```bash
python -m http.server 3000 --directory frontend
```

Luego abrí tu navegador en:
- 📱 **Aplicación web:** [http://localhost:3000/](http://localhost:3000/)

> [!IMPORTANT]
> El servidor web **debe** ejecutarse con el directorio `frontend/` como raíz (puerto 3000 u 8080 en `iniciar.bat`), ya que las rutas relativas de importación de módulos y recursos están configuradas a partir de esa base.

---

## 📁 Estructura del Repositorio

```text
AppCalorias/
├── frontend/                     # Aplicación web cliente (Vanilla Web MPA)
│   ├── index.html                # Inicio de sesión (punto de entrada)
│   ├── registro.html             # Registro de nuevas cuentas (alumno / coach)
│   ├── pages/                    # 27 vistas en subdirectorios divididas por rol (29 HTMLs en total)
│   │   ├── alumno/               # 12 vistas: dashboard, plan, historial, comidas, reemplazo, plato, progreso, perfil, onboarding
│   │   ├── coach/                # 14 vistas: clientes, planes, historial, editor, buscador, moderación, plantillas, seguimiento
│   │   └── shared/               # 1 vista compartida: contexto energético (contexto.html)
│   ├── css/                      # Sistema de diseño desacoplado (en cascada)
│   │   ├── base.css              # 1º: Tokens (:root), reseteo, tipografía y viewport
│   │   ├── components.css        # 2º: Componentes compartidos y utilidades ARIA
│   │   └── pages/                # 3º: Estilos específicos por sección (alumno, coach, cuenta)
│   └── js/                       # Arquitectura modular JavaScript (42 módulos)
│       ├── ui/                   # 28 controladores de interfaz con mapas SELECTORES
│       ├── data/                 # 8 módulos de datos y cliente Supabase con Mock Store offline
│       ├── calc/                 # 3 motores matemáticos puros (Atwater, equivalencias, formato)
│       └── utils/                # 3 utilidades transversales (navegación, accesibilidad, texto)
├── supabase/                     # Infraestructura de base de datos
│   ├── migrations/               # Scripts DDL de migración PostgreSQL
│   ├── rollback/                 # Scripts de reversión (.down.sql)
│   ├── tests/                    # Suites de pruebas pgTAP para base de datos
│   ├── ESQUEMA.md                # Diccionario de datos, ER, flujo Coach-Alumno, semáforo y RPCs
│   └── README.md                 # Guía para aplicar migraciones en Supabase SQL Editor
├── scratch/                      # Suites de pruebas de integración y validación local
├── DESIGN.md                     # Especificación canónica de tokens, colores, componentes y WAI-ARIA
├── ROADMAP.md                    # Hoja de ruta, decisiones tomadas y backlog de tareas priorizadas
├── CHANGELOG.md                  # Registro histórico de versiones ejecutivas (v0.1.0 -> v0.6.1)
├── CONTRIBUTING.md               # Guía de desarrollo, convención de módulos, mapas SELECTORES y tests
├── .env.example                  # Plantilla de variables de entorno y configuración
└── iniciar.bat                   # Lanzador automático de desarrollo local para Windows
```

---

## 🏗️ Arquitectura de Software Frontend (4 Capas)

La lógica de la aplicación se divide estrictamente en 4 capas desacopladas sin dependencias circulares:

| Capa | Directorio | Módulos | Responsabilidad |
|---|---|:---:|---|
| **Controladores UI** | `frontend/js/ui/` | **28** | Captura de eventos, sincronización DOM con mapas `SELECTORES`, renderizado sin `innerHTML` (`<template>`). |
| **Capa de Datos** | `frontend/js/data/` | **8** | Abstracción de base de datos, consultas Supabase, control de sesión y persistencia resiliente offline con `MockStore`. |
| **Cálculo Puro** | `frontend/js/calc/` | **3** | Algoritmos deterministas sin DOM ni red: Atwater ($4P+4C+9G$), minimización $L_1$ de equivalencias y formato. |
| **Utilidades** | `frontend/js/utils/` | **3** | Cascarón de navegación (`navegacion.js`), WCAG WAI-ARIA Focus Trap (`accesibilidad.js`) y formateo de cuenta (`texto.js`). |

<details>
<summary><strong>📋 Ver el desglose detallado de los 28 Controladores UI y las 29 Pantallas HTML</strong></summary>

### Vistas y Controladores del Alumno (`frontend/pages/alumno/` — 12 pantallas)
- `dashboard.html` ↔ `dashboard-ui.js`: Selector de fecha, totales del día, tarjetas de comidas principales y colaciones dinámicas con 1-Tap Check, y vasos de agua.
- `onboarding.html` ↔ `onboarding-ui.js`: Asistente guiado en 5 pasos para calibrar biometría, NEAT, entrenamiento METs y objetivo calórico inicial.
- `plan.html` ↔ `plan-ui.js`: Visualización del menú vigente asignado por el coach y acceso al historial.
- `historial.html` ↔ `historial-alumno-ui.js`: Historial cronológico de versiones de planes del alumno con reparto de macronutrientes.
- `cantidad.html` ↔ `cantidad-ui.js`: Ajuste granular de porción en gramos o unidades con recálculo nutricional en vivo.
- `agregar.html` ↔ `agregar-ui.js`: Búsqueda local/remota con debounce y agregado manual de alimentos a una comida.
- `reemplazar.html` ↔ `reemplazar-ui.js`: Motor interactivo de sustitución nutricional con semáforo de equivalencia.
- `crear-plato.html` ↔ `crear-plato-ui.js`: Armado de platos compuestos combinando múltiples ingredientes con recálculo Atwater reactivo.
- `crear-alimento.html` y `editar-alimento.html` ↔ `alimento-form-ui.js`: Alta de nuevos alimentos y propuestas de corrección sobre el catálogo con validación termodinámica.
- `progreso.html` ↔ `progreso-ui.js`: Evolución de peso corporal, adherencia calórica y control rápido de hidratación diaria.
- `perfil.html` ↔ `perfil-ui.js` + `objetivo-ui.js`: Gestión de cuenta de alumno, preferencias alimentarias, regla deslizable de pesaje y velocímetro de objetivo.

### Vistas y Controladores del Coach (`frontend/pages/coach/` — 14 pantallas)
- `clientes.html` ↔ `clientes-ui.js`: Bandeja de clientes, métricas rápidas y vinculación por código con `vincular_alumno`.
- `cliente.html` ↔ `cliente-ui.js`: Ficha técnica del alumno, permisos por sección, preferencias y accesos directos.
- `plan-nuevo.html` ↔ `plan-nuevo-ui.js`: Asistente de creación de nuevo plan (desde cero o precargado desde plantilla).
- `plan-editor.html` (y vista de compatibilidad `plan-editor-vacio.html`) ↔ `plan-editor-ui.js`: Editor reactivo de comidas, colaciones dinámicas, duplicación de ingestas y cálculo Atwater en vivo.
- `plan-activo.html` ↔ `plan-activo-ui.js`: Inspección del plan vigente y modal accesible de archivado.
- `plan-archivado.html` ↔ `plan-archivado-ui.js`: Consulta histórica en modo solo lectura (compatible con rol coach y alumno).
- `historial.html` (y vista de compatibilidad `historial-vacio.html`) ↔ `historial-ui.js`: Línea de tiempo de planes del alumno seleccionado.
- `buscar-alimento.html` ↔ `buscar-alimento-ui.js`: Búsqueda híbrida trigram en catálogo con pestañas y macros por porción.
- `alimentos-revision.html` ↔ `alimentos-revision-ui.js`: Panel de moderación para aprobar o rechazar alimentos propuestos por alumnos.
- `plantillas.html` ↔ `plantillas-ui.js`: Catálogo maestro de 4 plantillas nutricionales base reutilizables.
- `seguimiento.html` ↔ `seguimiento-coach-ui.js`: Evolución longitudinal de peso, adherencia semanal e hidratación del cliente.
- `perfil.html` ↔ `perfil-coach-ui.js`: Datos profesionales del entrenador y edición accesible de perfil.

### Vistas Compartidas y Autenticación (3 pantallas)
- `frontend/index.html` ↔ `login-ui.js`: Inicio de sesión, soporte `redirect_to` y redirección inteligente por rol.
- `frontend/registro.html` ↔ `cuenta-ui.js`: Alta de cuentas con verificación de `@usuario` y generación automática de `client_code`.
- `frontend/pages/shared/contexto.html` ↔ `contexto-ui.js` + `rol-ui.js`: Calculadora metabólica (Mifflin-St Jeor, NEAT, METs, TEF, TDEE) con invariante de visibilidad por rol.

</details>

---

## 🗄️ Capa de Acceso a Datos (`frontend/js/data/`)

La capa de datos encapsula toda interacción con Supabase y proporciona **resiliencia total ante desconexión o fallos de red** mediante un cliente dual:

1. **`supabase.js` (Cliente Resiliente con Mock Store Offline):**
   - Inicializa el cliente Singleton `@supabase/supabase-js` vía CDN ESM nativo.
   - **Modo Offline Transparente (v0.6.0):** Cuando la conexión falla o el CDN no responde, activa automáticamente un `MockStore` reactivo en memoria con persistencia en `localStorage`/`sessionStorage` (`STORAGE_KEY_STORE = 'appcalorias_offline_store_v1'`).
   - Emula la API encadenada de Supabase: `.from(tabla).select().eq().order().limit().maybeSingle()`, `.insert()`, `.update()`, `.delete()`, `.rpc()` y `supabase.auth` (`signInWithPassword`, `signUp`, `signOut`, `getSession`).
2. **`sesion.js`:** Control de autenticación, verificación de rol (`exigirRol`) y soporte para modo testing sin credenciales (`window.__TEST_BYPASS_AUTH__`).
3. **`alimentos-api.js`:** Búsqueda difusa de alimentos (`buscarAlimentos` vía RPC `pg_trgm`), consulta por ID, alta de alimentos (`crearAlimento`) y propuestas de corrección (`proponerCorreccion`).
4. **`contexto-api.js`:** Persistencia y recuperación del historial metabólico en `contextos_energeticos` y control de permisos granulares en `permisos_alumno`.
5. **`planes-api.js`:** Creación, actualización, activación, archivado y normalización de planes de comida (`meal_plans`, `plan_meals`, `plan_items`).
6. **`registro-api.js`:** Gestión de ingestas diarias (`daily_logs`, `logged_items`), confirmación de alimentos (*1-Tap Check*) y registro de hidratación.
7. **`alimentos-locales.js`:** Catálogo estático de 24 alimentos comunes con macronutrientes por 100 g y pesos por unidad, utilizado para contingencia offline.
8. **`plan-defecto.js`:** Estructura fija de 4 comidas para demostraciones o inicializaciones sin plan asignado.

---

## 🔬 Motores Matemáticos Puros (`frontend/js/calc/`)

### 1. Balance Energético y Atwater (`nutricion-calc.js`)
Calcula el aporte termodinámico de cada alimento a partir de sus macronutrientes:
$$\text{Energía (kcal)} = 4 \cdot P + 4 \cdot C + 9 \cdot G$$
- Aplica filtro de consistencia física: máximo $900\text{ kcal}$ cada $100\text{ g}$ y suma de macronutrientes $\le 100\text{ g}$.
- Evalúa discrepancias entre calorías declaradas en etiquetas y calorías teóricas, aplicando el principio de prudencia nutricional.

### 2. Motor de Equivalencias por Mediana Ponderada $L_1$ (`equivalencia-calc.js`)
Permite sustituir un alimento $A$ (del plan) por otro alimento $B$ (elegido por el alumno), encontrando el factor de escala óptimo $x$ que minimiza la discrepancia nutricional ponderada en norma $L_1$:
$$E(x) = w_1 \frac{|C_A - x C_B|}{C_A} + w_2 \frac{4|P_A - x P_B|}{C_A} + w_3 \frac{4|CH_A - x CH_B|}{C_A} + w_4 \frac{9|G_A - x G_B|}{C_A}$$
- **Pesos dinámicos autocalibrados:** $w_1 = 0.20$ (energía total), y $w_2, w_3, w_4$ proporcionales al perfil calórico del alimento de origen.
- **Resolución analítica exacta en $O(1)$:** Mediante ordenamiento de cocientes y selección de la mediana ponderada acumulada.
- **Redondeo práctico dual:** Ajuste a múltiplos de $5\text{ g}$ para balanza o unidades enteras si el alimento cuenta con peso por pieza (`unidad_g`).
- **Semáforo de compatibilidad:** Clasifica el reemplazo en `equivalente` ($\text{Adherencia} \ge 90\% \land \text{Similitud} \ge 75\%$), `parcial` o `no equivalente`.

---

## 👥 Roles y Flujos de Usuario

### 🏋️ Alumno ("Acciones Inmediatas, Cero Fricción")
- **Dashboard Diario:** Selector de fecha con rueda interactiva, contador dinámico de calorías y macronutrientes (P, C, G) del día, tarjetas de comidas principales y colaciones con marcado *1-Tap Check* ("Lo comí") y contador de vasos de agua.
- **Plan e Historial Alimenticio:** Visualización de la pauta vigente asignada por el coach y consulta de versiones archivadas previas.
- **Motor de Reemplazo y Platos Compuestos:** Sustitución de alimentos en tiempo real respetando los macronutrientes del plan y armado de recetas propias multi-ingrediente.
- **Progreso Físico e Hidratación:** Historial reactivo de pesajes corporales, porcentaje de avance hacia el objetivo y ajuste rápido de agua consumida.

### 📋 Coach ("El Método le Pertenece")
- **Gestión de Clientes:** Listado de alumnos asignados y vinculación inmediata por código único (`NF-XXXX-YY`).
- **Editor Reactivo de Planes y Plantillas:** Diseño de comidas y colaciones desde cero o a partir de 4 plantillas base, duplicación de ingestas y recálculo Atwater instantáneo.
- **Historial y Seguimiento:** Consulta de planes archivados, evolución de pesajes, adherencia semanal e hidratación en tiempo real.
- **Buscador y Moderación:** Catálogo con búsqueda trigram por pestañas y panel de aprobación/rechazo de alimentos propuestos por alumnos.

### 🌐 Contexto Energético Compartido
- Cálculo de la **Tasa Metabólica Basal (TMB - Mifflin-St Jeor)**, **NEAT**, **METs**, **TEF (10%)** y **TDEE**, ocultando el desglose técnico al alumno y exponiéndolo íntegramente al coach.

---

## 🎨 Sistema de Diseño (Design Tokens)

La interfaz se rige por las directrices de [`DESIGN.md`](DESIGN.md) y [`frontend/css/base.css`](frontend/css/base.css):
- **Tipografía:** *Bricolage Grotesque* (`--fuente-titulos`, títulos y cifras con `tabular-nums`) e *Instrument Sans* (`--fuente-texto`, cuerpo y controles).
- **Paleta Canónica (`:root` en `base.css`):**
  - Marca Verde: `--verde: #1E6847` / `--verde-oscuro: #134631` / `--verde-claro: #E4EFE8`
  - Fondos y Superficies: `--fondo: #F3F5F1` / `--fondo-app: #DDE3DC` / `--blanco: #FFFFFF` / `--borde: #E3E7E1`
  - Tipografía: `--tinta: #17211C` / `--gris-oscuro: #4A554E` / `--gris: #5B665F` / `--gris-medio: #8A948D`
  - Semánticos y Macros: `--azul: #2B59C3` (`--macro-p`) / `--naranja: #E39A2D` (`--macro-c`) / `--violeta: #A8467F` (`--macro-g`) / `--rojo: #8A3B2E` / `--agua: #7FB3E8`
- **Accesibilidad y Ergonomía:** Zona táctil mínima de **44 × 44 px** (`--alto-tactil`), Focus Trap obligatorio con [`accesibilidad.js`](frontend/js/utils/accesibilidad.js) en modales, y sanitización automática de comas a puntos en teclados móviles `inputmode="decimal"`.

---

## 🧪 Pruebas y Validación Obligatorias

El proyecto cuenta con suites de validación automatizadas ejecutables en Python:
```powershell
# 1. Validación de sintaxis JS en los 42 módulos (delimitadores y comillas)
python scratch/validate_js.py

# 2. Verificación de arquitectura modular, mapas SELECTORES e imports acíclicos
python scratch/test_modularization.py

# 3. Integridad de enlaces HTML y carga de scripts (29 pantallas funcionales)
python scratch/test_navigation_integrity.py

# 4. Pruebas de integración de capa de datos Supabase y contratos API
python scratch/test_supabase_modules.py

# 5. Pruebas de motores matemáticos de nutrición y equivalencias
python scratch/test_equivalencia_calc.py
python scratch/test_nutricion_calc.py

# 6. Pruebas de interfaz y reactividad en navegador Chromium/Edge headless
python scratch/test_dashboard_ui.py
python scratch/test_reemplazar_ui.py
python scratch/test_progreso_ui.py
python scratch/test_crear_plato.py
python scratch/test_accesibilidad_modales.py
python scratch/test_sincronizacion_agua.py
```

---

## 📚 Documentación Técnica Canónica (5 Pilares)

- 🏛️ [**README.md**](README.md): Portal principal, arquitectura de 4 capas, capa de datos y motores de cálculo.
- 📐 [**DESIGN.md**](DESIGN.md): Especificación exhaustiva de tokens CSS, componentes transversales y WAI-ARIA.
- 🗺️ [**ROADMAP.md**](ROADMAP.md): Sprints completados, decisiones arquitectónicas y backlog técnico priorizado.
- 🤝 [**CONTRIBUTING.md**](CONTRIBUTING.md): Guía de desarrollo, patrón SELECTORES, reglas de plantillas y tests.
- 📜 [**CHANGELOG.md**](CHANGELOG.md): Registro cronológico de versiones ejecutivas (v0.1.0 -> v0.6.1).
- 🗄️ [**supabase/ESQUEMA.md**](supabase/ESQUEMA.md): Esquema relacional, flujo Coach-Alumno, semáforo, RLS y RPCs.
- 🚀 [**supabase/README.md**](supabase/README.md): Guía operativa de migraciones, reversiones y tests pgTAP.
