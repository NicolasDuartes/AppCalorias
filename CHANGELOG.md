# Control de Versiones (Changelog) — AppCalorias

Este documento registra los hitos de versiones **Mayores (Major)** y **Medianas (Minor)** de la aplicación con resúmenes ejecutivos concisos ($\le 10$ renglones). Los cambios atómicos y parches específicos se registran directamente en los commits de Git bajo la convención *Conventional Commits*.

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
