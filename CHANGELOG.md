# Control de Versiones (Changelog) — AppCalorias

Este documento registra los hitos de versiones **Mayores (Major)** y **Medianas (Minor)** de la aplicación con resúmenes ejecutivos concisos ($\le 10$ renglones). Los cambios atómicos y parches específicos se registran directamente en los commits de Git bajo la convención *Conventional Commits*.

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
