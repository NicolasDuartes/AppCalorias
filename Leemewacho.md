# Estructura de Archivos del Proyecto — AppCalorias

> Para la documentación formal de arquitectura, instalación y desarrollo, consultá el [**README.md**](README.md) en la raíz.

```text
frontend/
├── index.html                     # Iniciar sesión (punto de entrada)
├── registro.html                  # Crear cuenta (alumno / coach)
├── docs-dashboard.html           # Hub interactivo de documentación técnica (8 pestañas)
├── css/
│   ├── base.css                   # Tokens (:root), reseteo, marco de pantalla, tipografía (se carga 1º)
│   ├── components.css             # Componentes compartidos por coach y alumno (se carga 2º)
│   └── pages/                     # Estilos propios de cada sección (se carga 3º)
│       ├── alumno.css             # Dashboard, comidas, tarjetas y progreso
│       ├── coach.css              # Lista de clientes, línea de tiempo e historial
│       └── cuenta.css             # Formularios de login y registro
├── js/
│   ├── data/                      # Capa de datos y persistencia (8 módulos)
│   │   ├── supabase.js            # Cliente Singleton de Supabase (ESM)
│   │   ├── sesion.js              # Control de sesión, roles (exigirRol) y rutas
│   │   ├── contexto-api.js        # Gasto energético (contextos_energeticos) y permisos
│   │   ├── alimentos-api.js       # Búsqueda RPC trigram y CRUD de alimentos
│   │   ├── planes-api.js          # Ciclo de vida de planes (meal_plans)
│   │   ├── registro-api.js        # Registro de ingesta diaria y agua (daily_logs)
│   │   ├── alimentos-locales.js   # Catálogo curado local de 24 alimentos comunes
│   │   └── plan-defecto.js        # Estructura de comidas y menú por defecto
│   ├── calc/                      # Motores matemáticos puros (3 módulos)
│   │   ├── nutricion-calc.js      # Fórmula Atwater 4P+4C+9G y consistencia
│   │   ├── equivalencia-calc.js   # Mediana ponderada L1 de porciones equitativas
│   │   └── formato-calc.js        # Sanitización decimal y formateo de texto
│   ├── utils/                     # Utilidades transversales (2 módulos)
│   │   ├── navegacion.js          # Historial inteligente, avisos toast y atajos WCAG
│   │   └── texto.js               # Formato de nombres e iniciales de cuentas
│   └── ui/                        # Controladores desacoplados con mapas SELECTORES (23 módulos)
│       ├── login-ui.js            # index.html
│       ├── cuenta-ui.js           # registro.html
│       ├── onboarding-ui.js       # alumno/onboarding.html (stepper de 5 pasos)
│       ├── dashboard-ui.js        # alumno/dashboard.html
│       ├── plan-ui.js             # alumno/plan.html
│       ├── cantidad-ui.js         # alumno/cantidad.html
│       ├── agregar-ui.js          # alumno/agregar.html
│       ├── reemplazar-ui.js       # alumno/reemplazar.html
│       ├── alimento-form-ui.js    # alumno/crear-alimento.html y editar-alimento.html
│       ├── progreso-ui.js         # alumno/progreso.html (evolución y peso)
│       ├── perfil-ui.js           # alumno/perfil.html (datos y coach)
│       ├── objetivo-ui.js         # alumno/perfil.html (regla analógica de peso)
│       ├── clientes-ui.js         # coach/clientes.html (lista y vinculación)
│       ├── cliente-ui.js          # coach/cliente.html (ficha del alumno)
│       ├── perfil-coach-ui.js     # coach/perfil.html (cuenta y cierre de sesión)
│       ├── plan-nuevo-ui.js       # coach/plan-nuevo.html (selector de modalidad)
│       ├── plan-editor-ui.js      # coach/plan-editor.html y plan-editor-vacio.html
│       ├── plan-activo-ui.js      # coach/plan-activo.html (ver y archivar plan)
│       ├── plan-archivado-ui.js   # coach/plan-archivado.html (vista de solo lectura)
│       ├── historial-ui.js        # coach/historial.html y historial-vacio.html
│       ├── buscar-alimento-ui.js  # coach/buscar-alimento.html
│       ├── alimentos-revision-ui.js # coach/alimentos-revision.html (moderación)
│       ├── plantillas-ui.js       # coach/plantillas.html (catálogo de plantillas)
│       ├── seguimiento-coach-ui.js # coach/seguimiento.html (progreso de cliente)
│       ├── contexto-ui.js         # shared/contexto.html (cálculo BMR/TDEE)
│       └── rol-ui.js              # shared/contexto.html (conmutador por rol)
└── pages/
    ├── alumno/
    │   ├── onboarding.html        # Asistente de 5 pasos para biometría y meta
    │   ├── dashboard.html         # Día, calorías, comidas vacías y agua
    │   ├── plan.html              # Plan alimenticio activo asignado
    │   ├── cantidad.html          # Ajuste de gramos con recálculo en vivo
    │   ├── agregar.html           # Selección de alimentos para una comida
    │   ├── reemplazar.html        # Reemplazo de alimentos por equivalencias
    │   ├── crear-alimento.html    # Formulario para proponer nuevo alimento
    │   ├── editar-alimento.html   # Formulario para proponer corrección
    │   └── perfil.html            # Cuenta, coach vinculado y regla de peso
    ├── coach/
    │   ├── clientes.html          # Bandeja de clientes y vinculación por código
    │   ├── cliente.html           # Ficha de seguimiento del alumno
    │   ├── perfil.html            # Datos del coach y cierre de sesión
    │   ├── plan-nuevo.html        # Creación de plan desde cero o plantilla
    │   ├── plan-editor.html       # Editor con recálculo reactivo de macros
    │   ├── plan-editor-vacio.html # Editor en estado inicial sin comidas
    │   ├── plan-activo.html       # Visualización y archivado del plan vigente
    │   ├── plan-archivado.html    # Consulta de planes históricos finalizados
    │   ├── historial.html         # Línea de tiempo de planes del alumno
    │   ├── historial-vacio.html   # Historial vacío de planes
    │   ├── buscar-alimento.html   # Buscador interactivo de catálogo
    │   └── alimentos-revision.html # Panel de moderación y aprobación de alimentos
    └── shared/
        └── contexto.html          # Motor interactivo de cálculo energético
```
