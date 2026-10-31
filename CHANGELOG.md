# Control de Versiones (Changelog) — AppCalorias

Este documento registra los hitos de versiones **Mayores (Major)** y **Medianas (Minor)** de la aplicación con resúmenes ejecutivos concisos ($\le 10$ renglones). Los cambios atómicos y parches específicos se registran directamente en los commits de Git bajo la convención *Conventional Commits*.

## [v0.5.9] — 31/10/2026
- **Tipo:** Versión Menor (Edición Interactiva de Perfiles de Alumno y Coach, y Buscador Híbrido RPC con Pestañas)
- **Fecha:** 31 de Octubre de 2026
- **Resumen:**
  1. Edición de Perfil del Alumno (`perfil.html` y `perfil-ui.js`): Modal accesible `#modal-editar-perfil` con validación fisiológica, guardado reactivo en Supabase `profiles` y `sessionStorage`, actualización DOM en vivo e inmunidad anti-XSS.
  2. Edición de Perfil del Coach (`coach/perfil.html` y `perfil-coach-ui.js`): Modal interactivo `#modal-editar-perfil-coach`, actualización reactiva de `#perfil-usuario` e iniciales vectoriales `#perfil-iniciales`, y notificación toast flotante.
  3. Búsqueda Híbrida RPC en Buscador del Coach (`coach/buscar-alimento.html` y `buscar-alimento-ui.js`): Integración de `buscarAlimentos()` RPC con debounce de 300 ms, normalización Atwater y fallback transparente offline.
  4. Pestañas de origen de alimentos: Conmutación accesible mediante `aria-selected` entre "Frecuentes", "Mis alimentos" y "Base de datos general".
  5. Alternancia accesible de estados (Regla de Oro 2): Integración del contenedor `#lista-alimentos` con alternancia semántica vía atributo `hidden` respecto al bloque `.vacio`.
  6. Blindaje total de la interfaz: Cero usos de `innerHTML` en la totalidad de la capa UI (Regla de Oro 1 al 100%).
  7. Batería de validación: 25 HTMLs, 39 módulos JS analizados con 0 ciclos, 105 pruebas unitarias y E2E superadas en Microsoft Edge headless (37 alumno, 25 coach, 43 buscador).

---

## [v0.5.8] — 30/10/2026
- **Tipo:** Versión Menor (Seguimiento del Coach, Gestión Interactiva de Preferencias y Duplicación de Comidas)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Seguimiento del Coach (`seguimiento.html` y `seguimiento-coach-ui.js`): Vista completa de evolución de peso corporal, barra de avance hacia la meta, tarjeta de adherencia semanal e historial de pesajes.
  2. Conexión de ficha del alumno: Activación del enlace a `seguimiento.html?cliente=UUID` en `cliente.html` (reemplazando el estado inactivo previo).
  3. Tarjeta de Preferencias en la ficha del coach: Visualización de las condiciones declaradas por el alumno en `cliente.html` con chips seguros.
  4. Preferencias y Restricciones interactivas en el alumno (`perfil.html` y `perfil-ui.js`): Modal accesible de adición, botón dinámico de eliminación y persistencia en `sessionStorage` (`appcalorias_preferencias_alumno`).
  5. Duplicar Comidas en el Editor (`plan-editor-ui.js`): Botón `.btn-duplicar-comida` con icono `#copiar` para clonar comidas completas con sus alimentos, porciones y notas con recálculo Atwater automático.
  6. Algoritmo correlativo de copias: Nombrado inteligente (`Desayuno (copia)`, `Desayuno (copia 2)`) y serialización completa para guardado atómico.
  7. Verificación total: 25 HTMLs y 39 módulos JS analizados con 0 fallos de modularización, 100% de enlaces resueltos y 59 pruebas en navegador real aprobadas.

---

## [v0.5.7] — 30/10/2026
- **Tipo:** Versión Menor (Panel de Progreso del Alumno, Catálogo de Plantillas del Coach y Colaciones Dinámicas)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Progreso del Alumno (`progreso.html` y `progreso-ui.js`): Evolución corporal, seguimiento de peso hacia la meta con barra porcentual, adherencia calórica y de hidratación diaria.
  2. Conexión de navegación de alumno: Enlace activo a `progreso.html` en la barra inferior de `dashboard.html`, `perfil.html` y `plan.html`.
  3. Catálogo de Plantillas del Coach (`plantillas.html` y `plantillas-ui.js`): 4 plantillas predefinidas (Déficit, Hipertrofia, Recomposición y Definición) con cálculo Atwater exacto.
  4. Precarga de plantillas en el Editor: Al presionar "Usar plantilla", `sessionStorage` y `?plantilla=` inyectan comidas y macronutrientes en `plan-editor.html`.
  5. Conexión de navegación del coach: Enlace activo en las 11 páginas del coach hacia `plantillas.html` y conexión desde `plan-nuevo.html`.
  6. Colaciones dinámicas en el editor: Botón `#boton-anadir-colacion` con plantilla nativa `<template id="tpl-comida-colacion">`, agregando colaciones correlativas con botón de borrado, notas y enlaces contextuales de búsqueda.
  7. Verificación total: 24 HTMLs y 38 módulos JS con 0 ciclos, 100% de enlaces estáticos resueltos y 48 pruebas en navegador real Headless Edge/Chromium superadas.

---

## [v0.5.6] — 30/10/2026
- **Tipo:** Versión Menor (Persistencia Real del Plan en Editor del Coach, Erradicación Total de innerHTML y Búsqueda Reactiva)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Persistencia real en el editor de planes (`plan-editor-ui.js`): Serialización reactiva completa del DOM e invocación de `crearPlan()` y `activarPlan()` con fallback en `sessionStorage`.
  2. Propagación contextual del cliente: Inyección de `clienteId` en enlaces de búsqueda y retorno, y redirección inmediata a `plan-activo.html` con aviso toast.
  3. Erradicación total de `innerHTML` (Regla de Oro 1 al 100%): Incorporación de `<template id="tpl-cliente-fila">` en `clientes.html` y refactorización segura en `clientes-ui.js`.
  4. Blindaje anti-DOM-XSS: Limpieza completa de `innerHTML` en `agregar-ui.js` (pie de resumen), `contexto-ui.js` (cálculo de plazos y biometría) y `reemplazar-ui.js` (SVG seguro vía `createElementNS`).
  5. Búsqueda y filtrado reactivo en `agregar.html`: Input accesible con debounce de 300 ms, filtrado en vivo de alimentos locales y búsqueda remota vía `buscarAlimentos()` con `<template id="tpl-alimento-busqueda">`.
  6. Selección interactiva: Los resultados remotos clonados soportan adición/remoción a la comida y recálculo reactivo en tiempo real del pie de resumen.
  7. Validación integral: 100% de pruebas unitarias y E2E superadas (12/12 en persistencia de planes, 25/25 en búsqueda en navegador headless Edge).

---

## [v0.5.5] — 30/10/2026
- **Tipo:** Versión Menor (Navegación Unificada del Coach, Guardia de Sesión con Redirección y Acceso a Calibración)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Conexión de la barra inferior del Coach: Actualización de los 10 archivos HTML de Coach y `contexto.html` enlazando el ícono de Alimentos a `alimentos-revision.html`.
  2. Guardia de sesión con `redirect_to`: `sesion.js` captura la ruta solicitada al redirigir al login para usuarios sin autenticación.
  3. Redirección inteligente post-login: `login-ui.js` valida y respeta la ruta `redirect_to` compatible con el rol, y deriva automáticamente a alumnos sin contexto a `onboarding.html`.
  4. Redirección post-registro: `cuenta-ui.js` redirige inmediatamente al onboarding de 5 pasos a nuevos alumnos con sesión iniciada.
  5. Calibración desde perfil del alumno: Enlace directo en `perfil.html` hacia `onboarding.html` para recalcular TDEE, NEAT y objetivo calórico en cualquier momento.
  6. Gestión visual de permisos del alumno: Conexión interactiva en `cliente.html` y `cliente-ui.js` con `obtenerPermisosAlumno` y `actualizarPermisoAlumno` con toasts en tiempo real.
  7. Integridad de navegación y suites E2E: 100% de enlaces y anclas resueltos, 0 regresiones sintácticas y suites de pruebas en navegador real aprobadas.

---

## [v0.5.4] — 30/10/2026
- **Tipo:** Versión Menor (Onboarding del Alumno en 5 Pasos y Panel de Moderación de Alimentos para el Coach)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Onboarding del Alumno en 5 pasos guiados (`onboarding.html` y `onboarding-ui.js`): Sexo, edad, altura, peso, NEAT, entrenamiento METs y objetivo calórico.
  2. Guardado metabólico unificado: Cálculo de Mifflin-St Jeor, TDEE y TEF con persistencia en `public.contextos_energeticos` y bienvenida al dashboard.
  3. Panel de Moderación de Alimentos del Coach (`alimentos-revision.html` y `alimentos-revision-ui.js`): Gestión de alimentos en estado pendiente con plantilla `<template>`.
  4. Aprobación y rechazo interactivo: Invocación de `revisar_alimento`, modal accesible para motivo de rechazo y feedback toast.
  5. Cumplimiento de las 3 Reglas de Oro: Cero `innerHTML` con datos de usuario, conmutación declarativa de estado vacío con `hidden` y mapas `SELECTORES`.
  6. Sincronización documental: Árbol de archivos actualizado en `Leemewacho.md` alcanzando 22 páginas HTML y 36 módulos JS.
  7. Verificación total: 10 suites automatizadas aprobadas al 100% (sintaxis, modularización, enlaces, cálculos metabólicos y pruebas E2E).

---

## [v0.5.3] — 30/10/2026
- **Tipo:** Versión Menor (Conexión Integral de Capa de Datos, Persistencia Metabólica y Formularios de Alimentos)
- **Fecha:** 30 de Octubre de 2026
- **Resumen:**
  1. Módulo `contexto-api.js`: Alta y consulta en `public.contextos_energeticos` con fallback resiliente en `sessionStorage` y gestión de `permisos_alumno`.
  2. Persistencia metabólica en `contexto-ui.js`: Hidratación automática de biometría y guardado completo de BMR, NEAT, TDEE y calorías objetivo.
  3. Ampliación de `planes-api.js`: Implementación de `obtenerPlanPorId()` con normalización jerárquica de comidas e ítems.
  4. Hidratación en `plan-archivado-ui.js` y conexión real en `plan-ui.js`: El plan del alumno consume `obtenerPlanActivo()` preservando fallback offline.
  5. Formularios de alimentos completos: Incorporación del selector de las 12 categorías y campo oculto `alimento_id` en `crear-alimento.html` y `editar-alimento.html`.
  6. Conexión de `alimento-form-ui.js`: Validación obligatoria de categoría y submit conectado a `crearAlimento()` y `proponerCorreccion()`.
  7. Estandarización de navegación del Coach: Migración de hash a query string `?cliente=UUID` en `clientes-ui.js` y `cliente-ui.js`, y persistencia de pesaje en `objetivo-ui.js`.

---

## [v0.5.2] — 29/10/2026
- **Tipo:** Versión Menor (Arquitectura de Plantillas HTML Nativas `<template>`, Unificación de Estados y Blindaje DOM-XSS)
- **Fecha:** 29 de Octubre de 2026
- **Resumen:**
  1. Formalización de las 3 Reglas de Oro de Desacoplamiento HTML/JS en `DESIGN.md`, `CONTRIBUTING.md`, `ROADMAP_Y_ESTRUCTURA.md` y `.loki/CONTINUITY.md`.
  2. Regla 1 (Cero HTML en JS): Migración a `<template id="tpl-...">` nativos con `cloneNode(true)` y `.textContent` en `dashboard`, `reemplazar`, `buscar-alimento`, `plan-editor` e `historial`.
  3. Erradicación total de vulnerabilidad DOM-XSS en `dashboard-ui.js` y `buscar-alimento-ui.js` eliminando la interpolación cruda en `innerHTML`.
  4. Regla 2 (Estados unificados con `hidden`): Conmutación declarativa entre estados vacíos (`.vacio`) y listas pobladas sin divergencia estructural entre archivos HTML.
  5. Regla 3 (Cascarón compartido e invariante por rol): Centralización del sprite SVG y barra inferior en `navegacion.js` (`asegurarCascaronCompartido`) y ocultamiento del desglose técnico BMR/NEAT/TEF para el rol `alumno` en `rol-ui.js`.
  6. Puente de estado MPA y correcciones críticas: Persistencia en `sessionStorage` entre `buscar-alimento.html` y `plan-editor.html`, enlaces `+ Añadir alimento` activos en vistas vacías y retención de `planId` para archivado real en `plan-activo-ui.js`.
  7. Verificación integral: 10 suites automatizadas (sintaxis, modularización, enlaces, cálculos y navegador real Edge Headless) superadas al 100%.

---

## [v0.5.1] — 19/10/2026
- **Tipo:** Versión Menor / Parche (Documentación Raíz y Estándares de Arquitectura)
- **Fecha:** 19 de Octubre de 2026
- **Resumen:**
  1. README.md formal en la raíz: Visión del producto, arquitectura Vanilla Web, puesta en marcha con iniciar.bat e índice técnico.
  2. Guía de contribución CONTRIBUTING.md: Estándares de desarrollo buildless, obligatoriedad del mapa SELECTORES y ciclo de validación.
  3. Plantilla .env.example: Documentación de variables de Supabase con advertencias de seguridad y políticas RLS.
  4. Capa de datos documentada: frontend/js/data/README.md detallando los contratos y fallbacks de los 7 módulos de persistencia.
  5. Árbol de archivos sincronizado: Leemewacho.md actualizado al 100% reflejando los 33 módulos JS y las 20 pantallas HTML.
  6. Diccionario de datos actualizado: supabase/ESQUEMA.md alineado con el estado real de tablas conectadas y deprecadas.

---

## [v0.5.0] — 18/10/2026
- **Tipo:** Versión Mayor (Arquitectura Frontend 100% Modular, Conexión Supabase y Controladores de Ciclo de Vida de Planes)
- **Fecha:** 18 de Octubre de 2026
- **Resumen:**
  1. Arquitectura 100% modular y desacoplada: Los 20 HTMLs poseen su controlador UI dedicado en `frontend/js/ui/` con mapas `SELECTORES` centralizados, permitiendo alterar el HTML libremente sin tocar la lógica.
  2. Limpieza total de navegacion.js: Aislada como biblioteca utilitaria pura (toasts, historia inteligente, accesibilidad WCAG y sanitización decimal) con grafo acíclico en los 32 módulos JS.
  3. Conexión nativa con Supabase: Capa de datos en `frontend/js/data/` (`alimentos-api.js`, `planes-api.js`, `registro-api.js`) conectada a RPCs (`buscar_alimentos`), tablas relacionales y RLS.
  4. Hidratación asíncrona y resiliencia offline: Dashboard y Reemplazar sincronizan con Supabase en tiempo real conservando fallback transparente a `sessionStorage` para navegación sin conexión o modo prueba.
  5. Ciclo de vida completo de planes para el Coach: Nuevos controladores para creación, edición reactiva (Atwater 4P+4C+9G), activación y archivado en línea de tiempo (`plan-activo-ui.js`, `historial-ui.js`, `plan-nuevo-ui.js`).
  6. Motor metabólico en contexto energético: Cálculo interactivo de TMB (Mifflin-St Jeor), NEAT, entreno, TEF, TDEE y alertas de seguridad ante déficits excesivos.
  7. Verificación integral automatizada: 10 suites de prueba superadas al 100% (validación sintáctica, integridad de enlaces, navegación en Chromium/Edge headless, estructura de APIs y suites de modularización).

---

## [v0.4.4] — 17/10/2026
- **Tipo:** Versión Menor (Tarjetas Vacías Iniciales en Cero, Redirección a Agregar y Total Acumulado en Dashboard Superior)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Tarjetas limpias sin alimentos forzados: Las 4 comidas inician vacías sin alimentos predeterminados que el alumno tenga que borrar, sustituyendo los guiones vacíos (`-`) por `0` (`0 alimentos`, `0 kcal` y `P 0 g · C 0 g · G 0 g`).
  2. Total acumulado en dashboard superior: El panel superior (anillo de calorías y barras de proteínas, carbohidratos y grasas) calcula en tiempo real la suma total acumulada de todas las comidas del día.
  3. Botón "+ Agregar alimento" corregido: Al presionar agregar en cualquier comida (Desayuno, Almuerzo, Merienda, Cena), redirige directamente al catálogo de esa sección (`agregar.html?comida=...`), sin mandar a crear alimentos.
  4. Recálculo en vivo al editar cantidad: En la pantalla de cantidad, modificar los gramos recalcula al instante las calorías y macros de la porción en tiempo real.
  5. Contador interactivo de agua y comidas: Marcar "Lo comí" o los vasos de agua actualiza el avance y conserva su estado durante la navegación de la sesión.
  6. Código modular y desacoplado: La interacción se organiza mediante el mapa `SELECTORES` y utilidades exportadas para facilitar futuros cambios en el HTML sin alterar la lógica.
  7. Verificación total: 43 pruebas automáticas en navegador real Edge/Chromium superadas con 100% de éxito.

---

## [v0.4.3] — 17/10/2026
- **Tipo:** Versión Menor (Buscador Inteligente de Reemplazo de Alimentos y Cálculo de Porciones Equitativas)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Cambio fácil de comidas: En la pantalla de reemplazo, ahora puedes buscar cualquier alimento y la app calcula al instante cuánto comer para no desbalancear tu dieta.
  2. Ajuste inteligente de porciones: Si cambias pollo por carne o huevo, el sistema calcula la cantidad justa basándose en los nutrientes más importantes del alimento.
  3. Semáforo de compatibilidad: Muestra en verde si el reemplazo es perfecto (ej. una fruta por otra) o en amarillo/naranja con aviso si aporta más grasa o carbohidratos de lo previsto.
  4. Redondeo cómodo para la cocina: Las cantidades en gramos se redondean a múltiplos de 5g (para que sea fácil de pesar) y los alimentos que se comen por unidad (como huevos) se expresan en unidades enteras.
  5. Catálogo inicial de alimentos: Incluye una lista rápida de alimentos comunes (carnes, huevos, arroz, avena, frutas, verduras y palta) para probar sin demoras.
  6. Código modular y seguro: La lógica quedó separada de la pantalla para permitir mejoras visuales futuras sin romper los cálculos, protegiendo contra textos maliciosos.
  7. Verificación completa: 60 pruebas automáticas superadas con 100% de éxito (37 de cálculos matemáticos y 23 de pantalla en navegador real).

---

## [v0.4.2] — 17/10/2026
- **Tipo:** Versión Menor (Validador Inteligente de Alimentos, Teclado Móvil y Accesibilidad)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Detector inteligente de calorías: Compara automáticamente las calorías con las proteínas, carbohidratos y grasas usando un semáforo visual (verde, naranja y rojo).
  2. Criterio de prudencia: Ante pequeñas diferencias de etiqueta ($\le 25\%$), la app adopta el valor más alto para cuidar el plan y no subestimar calorías.
  3. Bloqueo de errores absurdos: Impide guardar datos físicamente imposibles (como superar 900 kcal en 100g o más de 100g de nutrientes por porción).
  4. Escritura fluida en celulares: Convierte comas en puntos al tipear decimales en teclados móviles en tiempo real, sin trabas ni saltos de cursor.
  5. Cierre rápido con tecla Escape: Permite cerrar cualquier ventana emergente, menú o aviso presionando Escape o tocando afuera, regresando al punto anterior.
  6. Organización limpia de cálculos: Toda la matemática nutricional y de formato quedó aislada en módulos independientes (`frontend/js/calc/`) con pruebas unitarias.
  7. Verificación completa en navegador: 27 pruebas automáticas en navegador real superadas con 100% de éxito.

---

## [v0.4.1] — 17/10/2026
- **Tipo:** Versión Menor / Parche (Navegación Contextual, Toasts Inter-páginas y Blindaje de Retorno)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Adaptación contextual dinámica en `cantidad.html`: oculta "Quitar" y conmuta a "Agregar a la comida" al venir de `agregar.html`.
  2. Sistema de avisos flotantes (toasts) inter-páginas persistido en `sessionStorage` (`guardarAvisoToast` y `[data-toast]`).
  3. Estandarización de botones "Cancelar" con `data-volver` para retorno por historial en modales y editores.
  4. Guarda anti-bucle ping-pong en `navegacion.js` evitando que `history.back()` reabra pantallas hijas concluidas.
  5. Campo oculto `origen=agregar` en `crear-alimento.html` para trazabilidad de flujo sin depender de cabeceras HTTP.
  6. Verificación automatizada exhaustiva: 100% passed en tests estáticos, requisitos y comportamiento profundo.
  7. Cálculo matemático de macros y mocks pospuestos para integración definitiva con API de alimentos y coach.

---

## [v0.4.0] — 17/10/2026
- **Tipo:** Versión Menor (Estabilización de Navegación Inicial y Redirecciones)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Estandarización integral de navegación y redirecciones en los 23 archivos HTML del frontend.
  2. Módulo centralizado `frontend/js/utils/navegacion.js` con historial inteligente (`history.back` y fallback seguro).
  3. Feedback accesible con avisos flotantes (toasts) no intrusivos para opciones en desarrollo de la barra inferior.
  4. Desacoplamiento dinámico de `contexto.html` con redirección contextual según rol (alumno/coach).
  5. Blindaje de modales y botones de acción rápida (`#anadir-cliente`, Cancelar/Guardar) previniendo saltos de hash.
  6. Verificación automatizada con suite de pruebas de integridad de enlaces y anclas (100% passed).
  7. Guardas profundas con `redirect_to` pospuestas para fase Supabase cumpliendo directiva de no tocar backend.


---

## [v0.3.0] — 17/10/2026
- **Tipo:** Versión Menor (Unificación Arquitectónica, Tokens CSS y Documentación)
- **Fecha:** 17 de Octubre de 2026
- **Resumen:**
  1. Sincronización y unificación de 39 commits de refactorización directamente en la rama `Master`.
  2. Migración completa a Vanilla Web puro (HTML5 + CSS Tokens en `base.css` y `components.css`), eliminando Tailwind.
  3. Modularización de pantallas en `frontend/pages/` divididas por rol (`alumno`, `coach` y `shared`).
  4. Centralización de sesión y control de acceso en `sesion.js` conectado a Supabase Auth y RLS.
  5. Inclusión de panel interactivo de documentación (`docs-dashboard.html`) y script de inicio local (`iniciar.bat`).
  6. Implementación del motor de cálculo energético (BMR Harris-Benedict, NEAT, TEF, TDEE) en `contexto.html`.
  7. Simplificación de la API de equivalencias nutricionales a búsqueda directa sin heurísticas automáticas.

---

## [v0.2.0] — Octubre 2026
- **Tipo:** Versión Menor (Rediseño Integral de Interfaz y Tokens de Diseño)
- **Fecha:** Octubre 2026
- **Resumen:**
  1. Redacción de `DESIGN.md` fijando la escala tipográfica (Bricolage/Instrument), colores y espaciados.
  2. Maquetación responsive mobile-first de todas las vistas de Alumno (dashboard, comidas, agua, perfil).
  3. Maquetación responsive de vistas de Coach (gestión de clientes, vinculación por ID, contexto).
  4. Depuración de dependencias obsoletas, frameworks CSS externos y scripts huérfanos.
  5. Adopción de componentes semánticos y accesibles siguiendo directrices ARIA.

---

## [v0.1.0] — Septiembre 2026
- **Tipo:** Versión Mayor (Prototipo Funcional Inicial y Modelo de Datos)
- **Fecha:** Septiembre 2026
- **Resumen:**
  1. Configuración del proyecto y conexión inicial con Supabase (Auth y PostgreSQL).
  2. Definición del esquema inicial de base de datos (`profiles`, `clientes_coaches`).
  3. Primeros prototipos de login, registro y pantallas estáticas de exploración calórica.
