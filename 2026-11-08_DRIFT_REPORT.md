# AppCalorias — Reporte de Detección de Deriva (Drift Report)
**Fecha:** 2026-11-08  
**Alcance:** Documentos de diseño, arquitectura y especificaciones del proyecto (`DESIGN.md`, `README.md`, `ROADMAP_Y_ESTRUCTURA.md`, `docs/DOCUMENTACION_APPCALORIAS.md`, `supabase/ESQUEMA.md`, `docs/database/EXPLICACION_TABLAS_SUPABASE.md`, `frontend/js/data/README.md`, `CONTRIBUTING.md`, `Leemewacho.md`).

---

## DESIGN.md

No drift detected.

---

## README.md

- **Conteo de módulos JavaScript desactualizado:** Línea 53 afirma que el proyecto cuenta con "33 módulos" distribuidos en "21 controladores UI", "7 módulos de datos" y "2 motores matemáticos". El código real en `frontend/js/` cuenta con **42 módulos**: **28 controladores UI** (se agregaron `onboarding-ui.js`, `historial-alumno-ui.js`, `crear-plato-ui.js`, `progreso-ui.js`, `alimentos-revision-ui.js`, `plantillas-ui.js`, `seguimiento-coach-ui.js`), **8 módulos de datos** (incluyendo `contexto-api.js`), **3 motores matemáticos** (`nutricion-calc.js`, `equivalencia-calc.js`, `formato-calc.js`) y **3 módulos de utilidades** (`navegacion.js`, `accesibilidad.js`, `texto.js`).
- **Versión de Changelog desfasada:** Línea 67 indica `CHANGELOG.md (v0.1.0 -> v0.5.0)`. La versión ejecutiva actual implementada en el repositorio y registrada en el changelog es `v0.6.1`.
- **Tokens de color desfasados en especificación visual:** Línea 101 cita valores hexadecimales desactualizados (`#F5F4F0` para fondos, `#B45309` para advertencia y `#B91C1C` para peligro), discrepando de los tokens canónicos vigentes en `base.css` (`--fondo: #F3F5F1`, `--fondo-app: #DDE3DC`, `--naranja: #E39A2D`, `--rojo: #8A3B2E`).
- **Restricción de comidas fijas vs. colaciones dinámicas:** Línea 79 restringe el dashboard a "tarjetas de 4 comidas (Desayuno, Almuerzo, Merienda, Cena)", omitiendo el soporte interactivo implementado para colaciones dinámicas correlativas ("Colación 1", "Colación 2", etc.).
- **Comando de prueba sintáctica:** Línea 110 describe la validación de sintaxis sobre "los 33 módulos", debiendo referenciar los 42 módulos existentes.

---

## ROADMAP_Y_ESTRUCTURA.md

- **Comandos de ejecución local incompletos:** Línea 18 indica exclusivamente `cd frontend y npx serve`, omitiendo el script lanzador automatizado [`iniciar.bat`](iniciar.bat) y el servidor estándar `python -m http.server 3000 --directory frontend` provistos en el proyecto.
- **Estado de resiliencia offline desfasado:** Línea 198 (Prioridad 5, ítem 4) cataloga como pendiente "Resiliencia offline del SDK de Supabase: empaquetar copia estática...". La resiliencia offline ya fue resuelta en `v0.6.0` dentro de [`frontend/js/data/supabase.js`](frontend/js/data/supabase.js) mediante un `MockStore` reactivo en memoria con persistencia en `localStorage`/`sessionStorage` y Query Builder encadenado sin dependencia obligatoria de CDN.

---

## docs/DOCUMENTACION_APPCALORIAS.md

- **Metadatos de rama y commit desactualizados:** Línea 3 indica `Rama activa feature/api-equivalencias (Commit 2dc2dab)`. La rama activa es `2026-10-18` (Commit `e429d66`).
- **Enlace roto a archivo inexistente:** Línea 7 referencia `DESIGN_DASHBOARD.md` (`../DESIGN_DASHBOARD.md`), documento que no existe en el repositorio (el documento canónico es `DESIGN.md`).
- **Árbol de directorios y módulos desfasado:** La Sección 2.1 describe únicamente 9 controladores UI (omitiendo 19 controladores reales), lista solo 2 módulos de datos (`supabase.js` y `sesion.js`, omitiendo los 6 módulos API restantes), no incluye `accesibilidad.js`, y documenta páginas obsoletas de creación de planes (`crear-plan.html` y `editar-plan.html`) en lugar de las páginas reales (`plan-editor.html`, `plan-nuevo.html`, `plan-activo.html`, `plan-archivado.html`, `plantillas.html`).
- **Nombre de tabla de perfiles inconsistente:** La Sección 3.1 documenta la tabla como `public.perfiles`, mientras que el esquema DDL oficial en Supabase la define como `public.profiles`.

---

## supabase/ESQUEMA.md

- **Estado de `permisos_alumno` desactualizado:** Línea 29 lista `permisos_alumno` como `"En esquema (pendiente interfaz UI)"`. La interfaz ya se encuentra implementada e interactiva con interruptores táctiles en [`frontend/pages/coach/cliente.html`](frontend/pages/coach/cliente.html) y [`frontend/js/ui/cliente-ui.js`](frontend/js/ui/cliente-ui.js), consumiendo las funciones `obtenerPermisosAlumno` y `actualizarPermisoAlumno` de `contexto-api.js`.
- **Estado de `contextos_energeticos` desactualizado:** Línea 30 lista `contextos_energeticos` como `"En esquema (pendiente conectar contexto-ui)"`. El módulo [`frontend/js/ui/contexto-ui.js`](frontend/js/ui/contexto-ui.js) ya está conectado y persiste los cómputos metabólicos tanto en PostgreSQL como en `sessionStorage` para contingencia offline vía [`frontend/js/data/contexto-api.js`](frontend/js/data/contexto-api.js).

---

## docs/database/EXPLICACION_TABLAS_SUPABASE.md

- **Afirmación de desconexión Frontend-Backend obsoleta:** La Sección § "🧭 ¿Si pongo la app a correr en local ya tengo acceso a las nuevas features?" (Líneas 7–24) afirma que *"El Frontend actualmente sigue con el código original (solo tiene el formulario de registro y la calculadora de calorías en local). Todavía no está conectado a estas tablas nuevas"*. Esta afirmación corresponde a un estado preliminar pre-v0.5.0. El frontend cuenta con 42 módulos ES nativos y está 100% conectado a `profiles`, `meal_plans`, `plan_meals`, `plan_items`, `daily_logs`, `logged_items`, `contextos_energeticos`, `permisos_alumno` y `alimentos` a través de `frontend/js/data/`.
- **Páginas obsoletas referenciadas:** Menciona pantallas inexistentes o reemplazadas como `alumno.html` y `coach.html` en el diagrama de arquitectura.

---

## frontend/js/data/README.md

- **Omisión de Mock Store y Query Builder en `supabase.js`:** La documentación de `supabase.js` (Líneas 9–12) indica únicamente que inicializa la instancia importada vía CDN. Omite documentar la arquitectura dual implementada en v0.6.0 con `MockStore` reactivo en memoria (`STORAGE_KEY_STORE = 'appcalorias_offline_store_v1'`) y emulación completa de métodos encadenados (`from`, `select`, `eq`, `single`, `insert`, `update`, `delete`, `rpc`, `auth`) para ejecución sin conexión a internet.

---

## CONTRIBUTING.md

- **Omisión del módulo transversal de accesibilidad:** En la Regla 3 de Plantillas HTML (Línea 22) se documenta `navegacion.js` para el cascarón común, pero se omite la pauta obligatoria de utilizar [`frontend/js/utils/accesibilidad.js`](frontend/js/utils/accesibilidad.js) (`activarTrampaFoco`, `liberarTrampaFoco`, `configurarModalAccesible`) para cualquier nuevo modal o diálogo que se incorpore a la aplicación.

---

## Leemewacho.md

No drift detected.
