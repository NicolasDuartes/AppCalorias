# Roadmap y Estructura Arquitectónica

## 1. Objetivo y Estado Actual
Hemos migrado exitosamente de un modelo de "archivos planos en la raíz" a una arquitectura estructurada de **Frontend y Backend lógicos**, aplicando principios de Separation of Concerns (SoC) para facilitar el mantenimiento y escalabilidad del proyecto "AppCalorias".

## 2. Nueva Estructura del Proyecto

El proyecto está dividido en dos dominios principales:

### A. Frontend (`/frontend`)
Contiene todo lo relacionado con la Interfaz de Usuario, interacción del cliente y lógica de cálculo en el navegador (offline/local).

*   **`index.html`**: Punto de entrada de la aplicación. Maneja el login y el registro.
*   **`/pages`**:
    *   `alumno.html`: Interfaz del alumno, buscador de alimentos, porciones y diario.
    *   `coach-dashboard.html`: Panel de control del coach para aprobar ingresos y ver métricas.
*   **`/css`**:
    *   `styles.css`: Estilos Tailwind compilados y custom CSS.
*   **`/js`**:
    *   **`/ui`**: *NUEVO*. Scripts que controlan estrictamente el DOM de cada página. 
        *   `auth-ui.js`: Controla los modales y formularios de `index.html`.
        *   `alumno-ui.js`: Controla el DOM y la reactividad de `alumno.html`.
        *   `coach-ui.js`: Renderiza la lista de alumnos en el panel del coach.
    *   **`/utils`**: Librerías de cálculo matemático y manejo de estado.
        *   `calculator.js`: Fórmulas BMR, NEAT, TDEE y Macros.
        *   `equivalences.js`: Conversiones gramo a porción.
        *   `storage.js`: Guardado en LocalStorage.
    *   **`/data`**:
        *   `food-catalog.js`: Base de datos cruda de los alimentos.
    *   `app.js`: Integración pesada (legacy refactorizado).

### B. Backend (`/backend`)
Contiene la configuración de conexión externa, reglas de negocio centralizadas y la API de Supabase.

*   **`/config`**:
    *   `supabase.js`: Inicialización del cliente de BD con las credenciales maestras.
*   **`/services`**:
    *   *(En proceso de migración de lógica RPC/Supabase desde los archivos UI hacia servicios puros).*

## 3. RoadMap Semanal (Próximos Pasos)

Según el `learning-roadmap-generator`, aquí está la hoja de ruta para continuar mejorando:

*   **Semana 1: Refinamiento de UI/UX**
    *   *Objetivo:* Asegurar que todos los modales (`auth-ui.js`, `alumno-ui.js`) manejen errores de red de forma fluida usando notificaciones (Toast).
*   **Semana 2: Backend Services Extraction**
    *   *Objetivo:* Mover los llamados `supabase.auth` y `supabase.from()` que residen en `/ui/*.js` hacia la carpeta `/backend/services/`.
*   **Semana 3: Bundling & Vite (Opcional)**
    *   *Objetivo:* Implementar un bundler para minificar el CSS/JS y hacer que el uso de los ESM (`import/export`) sea compatible con navegadores antiguos.

## 4. Notas Técnicas y Edge Cases (`code-documenter`)

Al revisar el código (Code Review Skill), se establecieron los siguientes comportamientos:
*   **Rutas y Botoneras**: Todos los botones de redirección usan rutas relativas al archivo HTML en ejecución (Ej: `../index.html` o `./pages/coach-dashboard.html`).
*   **Estados de Cuenta**: 
    *   `pendiente`: Usuario bloqueado en `auth-ui.js` hasta que el coach cambie el estatus a `aprobado` vía RPC (`approve_alumno`).
    *   `rechazado`: Usuario es desconectado forzosamente.
