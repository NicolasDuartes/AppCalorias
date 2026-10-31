# Roadmap y estructura

Dónde está cada cosa en el repositorio, qué decisiones ya se tomaron y qué
sigue. Para el detalle de cada parte, ver los documentos de la tabla.

## 1. Cómo está organizado

| Carpeta / archivo | Qué tiene | Documento |
|---|---|---|
| `frontend/` | La app: HTML, CSS y JS sin frameworks ni build | [Leemewacho.md](Leemewacho.md) (árbol de archivos) |
| `frontend/css/` | Tokens, componentes y estilos por sección | [DESIGN.md](DESIGN.md) |
| `frontend/js/ui/` | Un archivo por pantalla que maneja su interacción | Comentario al principio de cada archivo |
| `frontend/js/data/` | Cliente de Supabase y `sesion.js` (sesión y rol de cada pantalla) | — |
| `frontend/js/utils/` | Funciones chicas que comparten las pantallas | — |
| `supabase/` | Migraciones, tests y reversiones de la base | [supabase/README.md](supabase/README.md), [supabase/ESQUEMA.md](supabase/ESQUEMA.md) |
| `docs/database/` | Explicación de las tablas del plan y del registro diario | [EXPLICACION_TABLAS_SUPABASE.md](docs/database/EXPLICACION_TABLAS_SUPABASE.md) |

**Para levantar la app:** `cd frontend` y `npx serve`, y abrir
`http://localhost:3000/`. Tiene que servirse desde `frontend/`, porque las
rutas de las páginas son relativas a esa carpeta.

## 2. Decisiones tomadas

- **Entrada:** la app arranca en "Iniciar sesión". El registro pide solo
  rol, @usuario, correo y contraseña; sexo y fecha de nacimiento se van a
  completar dentro de la app (onboarding).
- **Para quién:** el alumno típico quiere que le digan qué hacer. Ve
  acciones y su meta, no fórmulas ni datos técnicos (ver DESIGN.md §1).
- **Sin antropometría:** se quitó de la app, para coach y alumno. Son datos
  complejos que no mejoran la experiencia.
- **Supabase intacto en esta etapa:** se trabaja el frontend; la base no se
  toca hasta retomar el backend.
- **Estilos:** solo tokens, sin `style=""`, escala única de espacios y zona
  táctil de 44 px (ver DESIGN.md §3).

## 3. Hecho

- Login como pantalla de inicio y registro corto.
- Dashboard del alumno: título que cambia con el día (Hoy, Ayer o la fecha),
  rueda de días con el elegido al centro, calendario y tarjeta de calorías
  compacta.
- Limpieza: fuera `backend/`, `md entendimiento/`, las maquetas viejas de
  `docs/design/`, el JS que ninguna pantalla cargaba (calculadora, tabla de
  porciones, equivalencias viejas) y su test roto, y el CSS sin usar.
- Código ordenado: la sesión y el rol se verifican en un solo lugar
  (`sesion.js`); el dashboard del alumno ya pide sesión; los íconos de todas
  las pantallas salen de la hoja de íconos de cada página.
- Perfil del coach: @usuario, email, cantidad de clientes y "Cerrar
  sesión"; el botón "Perfil" de la barra del coach ya lleva ahí.
- Comidas del alumno (solo diseño): 4 tarjetas que se abren de a una, con
  reemplazo por alimento, y las pantallas de cantidad, reemplazo, agregar,
  crear y editar alimento.
- Perfil del alumno: "Mi objetivo" arriba con registro de peso en una regla
  deslizable; sin antropometría.
- Sistema de diseño: tokens de color, sombras y espacios; sin `style=""` en
  el HTML; DESIGN.md reescrito; borrado el JS que no se usaba.
- Responsive: sin marco de teléfono; desde 768 px menú lateral y contenido
  en una columna centrada.
- Estabilización de navegación y feedback visual (v0.4.0 - v0.4.2): módulo
  `navegacion.js` con historial inteligente, toasts inter-páginas persistidos
  en `sessionStorage`, sanitización decimal transparente y validación Atwater
  reactiva (4P + 4C + 9G).
- Motor de equivalencias y datos reales (v0.4.3 - v0.4.4): cálculo analítico
  de porciones equitativas en `reemplazar.html`, tarjetas vacías en cero sin
  alimentos forzados, y acumulador total en dashboard superior.
- Arquitectura 100% modular y conexión Supabase (v0.5.0): 20 HTMLs con
  controladores UI dedicados en `frontend/js/ui/` y mapas `SELECTORES`
  centralizados; capa de datos en `frontend/js/data/` (`alimentos-api.js`,
  `planes-api.js`, `registro-api.js`) con fallback transparente; ciclo de
  vida de planes para el coach (`plan-activo-ui.js`, `plan-editor-ui.js`,
  `plan-nuevo-ui.js`, `historial-ui.js`, `plan-archivado-ui.js`); y motor
  metabólico interactivo en `contexto.html` (Mifflin-St Jeor, NEAT, METs,
  TEF, TDEE y alertas de seguridad).
- Documentación raíz formalizada (v0.5.1): creación de `README.md` principal,
  `CONTRIBUTING.md` con estándares de arquitectura y mapas `SELECTORES`,
  plantilla `.env.example`, documentación técnica en `frontend/js/data/README.md`,
  actualización del árbol de 33 módulos en `Leemewacho.md` y sincronización de
  tablas en `supabase/ESQUEMA.md`.
- Endurecimiento de Prioridad 1 y 3 Reglas de Oro de Plantillas HTML
  [Completado - 29/10/2026]: erradicación de DOM-XSS mediante `<template>`
  nativos con `data-bind`/`data-ref` y `textContent`, corrección de archivado
  en `plan-activo-ui.js`, corrección de vista vacía y borradores MPA en
  `plan-editor-ui.js`, resolución asíncrona de sesión (`await exigirRol`) en
  `dashboard-ui.js`, y formalización de las 3 reglas en `DESIGN.md` (§9) y
  `CONTRIBUTING.md`.

## 4. Pendiente (Tareas Priorizadas)

### Prioridad 1: Seguridad y Robustez Inmediata (Bugs Críticos)

1. **Sanitización contra DOM-XSS [Completado - 29/10/2026]:**
   - Aplicar `escaparHtml()` y migrar a `<template>` nativos con `textContent` en `dashboard-ui.js` (L592) y `buscar-alimento-ui.js` (L137) al interpolar nombres de alimentos y macronutrientes, eliminando el uso de `innerHTML` con datos de usuario.
2. **Corrección de flujo de archivado en `plan-activo-ui.js` [Completado - 29/10/2026]:**
   - Retener `res.plan.id` al consultar `obtenerPlanActivo(clienteId)` para que el botón "Finalizar plan" invoque efectivamente `archivarPlan()` en Supabase.
3. **Corrección de vista vacía en `plan-editor-ui.js` [Completado - 29/10/2026]:**
   - Mover la configuración de los botones `SELECTORES.btnAnadir` fuera del condicional `if (!filaAlimento) return;` para que `plan-editor-vacio.html` y el estado vacío con `hidden` propaguen el parámetro `?comida=...` a `buscar-alimento.html`.
4. **Resolución asíncrona de sesión en Dashboard [Completado - 29/10/2026]:**
   - Asegurar `await exigirRol('alumno')` en la inicialización de `dashboard-ui.js` para prevenir condiciones de carrera al resolver `usuarioActualId`.
5. **Implementación de las 3 Reglas de Plantillas HTML y Desacoplamiento JS [Completado - 29/10/2026]:**
   - **Regla 1:** Etiquetas `<template id="tpl-...">` con `data-bind` y `data-ref` hidratadas con `cloneNode(true)` y `textContent` (cero HTML en JS).
   - **Regla 2:** Un solo `.html` por pantalla conmutando estados vacíos y listas mediante `.vacio[hidden]`.
   - **Regla 3:** Cascarón compartido en `navegacion.js` (sprite SVG y barra inferior), persistencia de borradores en `sessionStorage` en flujos MPA del editor e invariantes conceptuales por rol (ocultamiento técnico BMR/NEAT/TEF para el alumno en `contexto.html` y 1-Tap Check en `dashboard.html`).

### Prioridad 2: Conexión Integral de Stubs y Capa de Datos

1. **Creación del módulo `frontend/js/data/contexto-api.js` [Completado - 30/10/2026]:**
   - Desacoplar `contexto-ui.js` y persistir el cálculo metabólico en la tabla `contextos_energeticos` al presionar "Guardar contexto" con fallback en `sessionStorage`.
   - Conectar lectura y actualización de `permisos_alumno` (`obtenerPermisosAlumno`, `actualizarPermisoAlumno`).
2. **Ampliación de `planes-api.js` [Completado - 30/10/2026]:**
   - Implementar función `obtenerPlanPorId(planId)` con sus comidas e ítems ordenados para permitir la hidratación de `plan-archivado.html`.
3. **Conexión real de `plan-ui.js` (Alumno) [Completado - 30/10/2026]:**
   - Sustituir el stub `cargarPlanActivo()` que leía del DOM estático por el consumo asíncrono de `obtenerPlanActivo(alumnoId)` de `planes-api.js`, manteniendo fallback transparente a `leerDatosPlanDOM()`.
4. **Rediseño y conexión de formularios de alimentos (`crear-alimento.html` y `editar-alimento.html`) [Completado - 30/10/2026]:**
   - Incorporar selector visual de las 12 categorías nutricionales (campo obligatorio `NOT NULL` en PostgreSQL) y campo oculto `alimento_id`.
   - Modificar `alimento-form-ui.js` para interceptar el `submit` con `preventDefault()`, validar consistencia calórica y ejecutar `crearAlimento()` o `proponerCorreccion()`.
5. **Transferencia de alimentos al editor de planes [Completado - 29/10/2026]:**
   - Utilizar `sessionStorage` (`appcalorias_alimento_editor_pendiente`) en `buscar-alimento-ui.js` para transferir el alimento seleccionado a `plan-editor.html` e insertarlo reactivamente en la comida.
6. **Persistencia de pesajes en `objetivo-ui.js` [Completado - 30/10/2026]:**
   - Conectar la regla analógica de pesaje con persistencia en `sessionStorage` (`appcalorias_peso_actual`, `appcalorias_historial_pesajes`) restaurando el progreso en cada carga.
7. **Estandarización de navegación del Coach [Completado - 30/10/2026]:**
   - Unificar el paso de parámetros en el panel del coach migrando de fragmentos hash (`#id=...`) a query strings (`?cliente=UUID`) en `clientes-ui.js` y `cliente-ui.js`.

### Prioridad 3: Flujos de Usuario Faltantes

1. **Onboarding del alumno (`onboarding.html`):**
   - Asistente de 5 pasos post-registro (sexo, fecha de nacimiento, peso y altura, actividad física NEAT/METs, objetivo calórico) para poblar el primer contexto energético.
2. **Panel de moderación y revisión de alimentos del Coach:**
   - Interfaz en el panel del coach para listar alimentos en estado `'pendiente'` y aprobarlos o rechazarlos usando los RPCs `revisar_alimento` y `revisar_correccion`.
3. **Gestión visual de `permisos_alumno`:**
   - Interfaz para que el coach habilite o deshabilite las secciones editables del alumno (`contexto`, `plan`).

### Prioridad 4: Base de Datos y Robustez Transaccional

1. **Migración de limpieza de tablas zombies:**
   - Crear migración que aplique `DROP TABLE IF EXISTS public.antropometrias, public.alumnos CASCADE;`.
2. **Migración baseline de planes y logs:**
   - Crear archivo DDL formal en `supabase/migrations/` para versionar `meal_plans`, `plan_meals`, `plan_items`, `daily_logs` y `logged_items`.
3. **RPC transaccional `guardar_plan_completo`:**
   - Crear procedimiento almacenado en PostgreSQL para encapsular el borrado e inserción atómica de comidas e ítems protegiendo contra cortes de conexión.
4. **Trigger PostgreSQL para totales diarios:**
   - Migrar la sumatoria de `recalcularTotalesLog` a un trigger `AFTER INSERT OR UPDATE OR DELETE ON logged_items`.
5. **Tabla histórica `registro_pesajes`:**
   - Crear tabla liviana `(id, alumno_id, peso_kg, fecha, created_at)` con RLS.
6. **Protección contra enumeración en `usuario_disponible`:**
   - Implementar rate limiting o mover la verificación a endpoint protegido.

### Prioridad 5: Infraestructura, Testing y Documentación

1. **Versionar las suites de prueba:**
   - Mover las 10 suites de `scratch/` a una carpeta `tests/` versionada en Git.
2. **Integración Continua (CI):**
   - Configurar GitHub Actions (`.github/workflows/ci.yml`) para ejecutar validación sintáctica, integridad de enlaces y suites de modularización en cada PR.
3. **Completar documentación raíz [Completado - 19/10/2026]:**
   - Creados `README.md` formal, `CONTRIBUTING.md`, `.env.example` y `frontend/js/data/README.md`.
   - Sincronizados `Leemewacho.md` y `supabase/ESQUEMA.md`.
4. **Resiliencia offline del SDK de Supabase:**
   - Empaquetar copia estática local (`vendor/supabase-js.js`) para evitar dependencia exclusiva de CDN jsdelivr.
