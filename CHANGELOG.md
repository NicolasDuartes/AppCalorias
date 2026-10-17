# Control de Versiones (Changelog) — AppCalorias

Este documento registra los hitos de versiones **Mayores (Major)** y **Medianas (Minor)** de la aplicación con resúmenes ejecutivos concisos ($\le 10$ renglones). Los cambios atómicos y parches específicos se registran directamente en los commits de Git bajo la convención *Conventional Commits*.

---

## [v0.4.0] — En Desarrollo
- **Tipo:** Versión Menor (Estabilización de Navegación Inicial y Sesión)
- **Fecha:** Octubre 2026 (En progreso)
- **Resumen:**
  1. Guardas de sesión resilientes con soporte de `redirect_to` para preservar la ruta original post-login.
  2. Detección automática del rol (alumno/coach) en la pantalla compartida `contexto.html` vía Supabase Auth.
  3. Retroalimentación visual accesible (toast/aviso flotante "Próximamente") en botones pendientes de la barra inferior.
  4. Estandarización de botones de retorno ("Volver") con historial inteligente del navegador (`history.back`) y protección de anclajes modales.
  5. Cobertura homogénea de sesiones en las subpáginas de carga y edición de alimentos.
  6. Auditoría integral de redirecciones de botones entre pantallas HTML (acciones Cancelar/Guardar en editores, Crear primer plan en historial vacío, micro-interacciones accesibles para segmentados, switches y lista de alimentos).


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
