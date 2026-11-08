# Roadmap y Decisiones de Arquitectura

Este documento centraliza el estado del proyecto, las decisiones técnicas adoptadas, el historial de funcionalidades implementadas y el backlog de tareas pendientes priorizadas.

> Para la arquitectura de 4 capas, desglose de módulos y guía de instalación, consultá el [**README.md**](README.md) principal.  
> Para el sistema visual y componentes, consultá [**DESIGN.md**](DESIGN.md).  
> Para el esquema relacional, políticas de seguridad y RPCs, consultá [**supabase/ESQUEMA.md**](supabase/ESQUEMA.md).

---

## 1. Decisiones de Arquitectura Tomadas

- **Buildless Vanilla Web pura:** Cero dependencias npm, sin Webpack, Vite ni frameworks. HTML5 semántico nativo, CSS Custom Tokens en cascada y JavaScript moderno (ES Modules).
- **Entrada y roles asimétricos:** La aplicación arranca en "Iniciar sesión". El registro pide solo rol, @usuario, correo y contraseña. El perfil del alumno se enfoca en acciones inmediatas y metas simples ("qué comer en menos de 10 segundos"); el coach dispone del control metabólico y planificación.
- **Sin antropometría:** Se eliminó de la interfaz para coach y alumno (9 perímetros, 8 pliegues y 3 diámetros descartados por complejidad innecesaria).
- **Resiliencia y Modo Desconectado (Offline Fallback):** Arquitectura dual en `supabase.js` con `MockStore` reactivo en memoria (`STORAGE_KEY_STORE = 'appcalorias_offline_store_v1'`) y Query Builder encadenado para garantizar que la app funcione sin conexión o cuando el CDN no esté disponible.
- **Las 3 Reglas de Oro de Plantillas HTML (Cero `innerHTML`):**
  - **Regla 1:** Plantillas `<template id="tpl-...">` con `data-bind` y `data-ref` hidratadas con `cloneNode(true)` y `textContent` para erradicar cualquier vector de inyección DOM-XSS.
  - **Regla 2:** Un solo `.html` por pantalla alternando estados vacíos y listas mediante `.vacio[hidden]` (manteniendo `plan-editor-vacio.html` e `historial-vacio.html` solo como alias de compatibilidad legada).
  - **Regla 3:** Cascarón compartido en `navegacion.js`, persistencia de borradores en `sessionStorage` en flujos MPA e invariantes conceptuales por rol.
- **Accesibilidad WAI-ARIA Universal (Regla 4):** Ciclo estricto de foco (*Focus Trap*) con `accesibilidad.js` (`activarTrampaFoco`, `liberarTrampaFoco`, `configurarModalAccesible`) en los 6 modales de la aplicación, con soporte para teclado (`Escape`, `Tab`, `Shift+Tab`) y restauración al elemento disparador (WCAG 2.1 AA).

---

## 2. Historial de Hitos Implementados

- **Inicio de sesión y registro corto:** Login como pantalla de bienvenida y redirección inteligente por rol.
- **Dashboard del alumno:** Selector de fecha con rueda de días, calendario táctil, tarjeta compacta de calorías y 1-Tap Check en comidas principales y colaciones.
- **Perfil del coach y gestión de clientes:** Listado de alumnos, vinculación por ID único (`NF-XXXX-YY`) con `vincular_alumno`, y ficha técnica.
- **Sistema de diseño y responsive:** Tokens de color canónicos (`--verde: #1E6847`, `--fondo: #F3F5F1`), escala de espacios, zona táctil de 44 px (`--alto-tactil`), layout adaptable sin marcos rígidos de teléfono.
- **Navegación y feedback visual (v0.4.0 - v0.4.2):** Módulo `navegacion.js` con historial inteligente, toasts inter-páginas persistidos en `sessionStorage`, sanitización decimal transparente y validación Atwater reactiva ($4P + 4C + 9G$).
- **Motor de equivalencias analítico (v0.4.3 - v0.4.4):** Cálculo analítico exacto de porciones equitativas en $O(1)$ por mediana ponderada en norma $L_1$ (`equivalencia-calc.js`) con semáforo de similitud y adherencia.
- **Arquitectura 100% modular y conexión Supabase (v0.5.0):** Controladores UI en `frontend/js/ui/` con mapas `SELECTORES` centralizados; capa de datos en `frontend/js/data/` (`alimentos-api.js`, `planes-api.js`, `registro-api.js`, `contexto-api.js`); ciclo de vida de planes para el coach (`plan-activo-ui.js`, `plan-editor-ui.js`, `plan-nuevo-ui.js`, `historial-ui.js`, `plan-archivado-ui.js`); y motor metabólico interactivo en `contexto.html` (Mifflin-St Jeor, NEAT, METs, TEF y TDEE).
- **Consolidación y Poda Canónica (v0.6.1):** 42 módulos JavaScript limpios, 29 pantallas funcionales, cliente resiliente con Mock Store offline en `supabase.js`, eliminación de maquetas obsoletas (`docs-dashboard.html`), unificación de la documentación en 5 pilares canónicos y 100% de éxito en la suite cuádruple de verificación.

---

## 3. Backlog de Tareas Pendientes (Priorizadas)

### Prioridad 1: Base de Datos y Robustez Transaccional
1. **Migración de limpieza de tablas zombies:**
   - Crear migración SQL que aplique `DROP TABLE IF EXISTS public.antropometrias, public.alumnos CASCADE;`.
2. **Migración baseline formal de planes y logs:**
   - Crear archivo DDL formal en `supabase/migrations/` para versionar `meal_plans`, `plan_meals`, `plan_items`, `daily_logs` y `logged_items`.
3. **RPC transaccional `guardar_plan_completo`:**
   - Crear procedimiento almacenado en PostgreSQL para encapsular el borrado e inserción atómica de comidas e ítems protegiendo contra cortes de conexión a mitad de guardado.
4. **Trigger PostgreSQL para totales diarios:**
   - Migrar la sumatoria de `recalcularTotalesLog` a un trigger de base de datos `AFTER INSERT OR UPDATE OR DELETE ON logged_items`.
5. **Tabla histórica `registro_pesajes`:**
   - Crear tabla persistente en base de datos `(id, alumno_id, peso_kg, fecha, created_at)` con políticas RLS para respaldar el historial actualmente mantenido en `sessionStorage`/`contextos_energeticos`.
6. **Protección contra enumeración en `usuario_disponible`:**
   - Implementar rate limiting por IP mediante Supabase Edge Functions.

### Prioridad 2: Infraestructura y Empaquetado Local
1. **Versionar las suites de prueba:**
   - Mover las suites estandarizadas de `scratch/` a una carpeta `tests/` versionada en Git.
2. **Integración Continua (CI):**
   - Configurar GitHub Actions (`.github/workflows/ci.yml`) para ejecutar validación sintáctica, integridad de enlaces y suites de modularización en cada PR.
3. **Copia local estática del SDK `@supabase/supabase-js`:**
   - Aunque el modo offline ya está cubierto por el `MockStore` en `supabase.js`, empaquetar una copia estática (`vendor/supabase-js.js`) permitirá conectar con el backend de Supabase en redes corporativas que bloqueen el CDN `jsdelivr`.
