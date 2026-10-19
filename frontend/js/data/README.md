# Capa de Acceso a Datos — `frontend/js/data/` 🗄️

Esta carpeta contiene los módulos encargados de la interacción con la base de datos de Supabase, el control de sesión, la autenticación y los catálogos locales de respaldo.

---

## 📦 Módulos Disponibles

### 1. `supabase.js`
- **Responsabilidad:** Inicializa y exporta la instancia Singleton del cliente `@supabase/supabase-js` importada mediante CDN nativo ESM.
- **Exportación principal:** `export const supabase = createClient(...)`.
- **Seguridad:** Utiliza la clave pública (`sb_publishable_...`). Toda la seguridad de lectura y escritura está delegada a las políticas Row Level Security (RLS) en PostgreSQL.

### 2. `sesion.js`
- **Responsabilidad:** Gestión de la sesión del usuario autenticado, control de acceso basado en roles y redirecciones según perfil.
- **Funciones principales:**
  - `exigirRol(rolEsperado, camposPerfil)`: Valida la sesión activa en Supabase Auth y verifica que el rol (`alumno` o `coach`) coincida. Redirige a login si no hay sesión. Soporta modo de prueba mediante `window.__TEST_BYPASS_AUTH__`.
  - `cerrarSesion()`: Cierra la sesión en Supabase y limpia el almacenamiento local.
  - `obtenerSesionActiva()`: Retorna el usuario y perfil actual sin forzar redirección.

### 3. `alimentos-api.js`
- **Responsabilidad:** Búsqueda difusa, consulta y propuestas de alimentos en Supabase.
- **Funciones principales:**
  - `buscarAlimentos(texto, categoria, limite)`: Ejecuta el procedimiento almacenado remoto `buscar_alimentos` con trigramas y sin tildes (`pg_trgm` + `unaccent`). Retorna un array con macros normalizados cada 100 g.
  - `obtenerAlimento(id)`: Consulta un alimento específico por clave primaria.
  - `crearAlimento(datos)`: Inserta un nuevo alimento en estado `'pendiente'` para posterior revisión por un coach.
  - `proponerCorreccion(alimentoId, cambios, motivo)`: Registra una propuesta de modificación sobre un alimento aprobado en `correcciones_alimento`.
  - `obtenerCategorias()`: Lista las 12 categorías oficiales ordenadas.

### 4. `planes-api.js`
- **Responsabilidad:** Gestión del ciclo de vida de los planes alimenticios (`meal_plans`, `plan_meals`, `plan_items`).
- **Funciones principales:**
  - `obtenerPlanActivo(alumnoId)`: Recupera el plan vigente del alumno con sus comidas e ítems ordenados.
  - `crearPlan(alumnoId, coachId, modalidad, comidas)`: Da de alta un nuevo plan y sus comidas asociadas.
  - `actualizarPlan(planId, comidas)`: Actualiza las comidas y alimentos de un plan borrador o activo.
  - `activarPlan(planId)`: Pasa un plan a estado `'activo'`.
  - `archivarPlan(planId)`: Archiva un plan finalizado para conservarlo en el historial.
  - `obtenerHistorialPlanes(alumnoId)`: Obtiene la lista cronológica de planes de un alumno.

### 5. `registro-api.js`
- **Responsabilidad:** Registro diario de ingesta de alimentos e hidratación del alumno (`daily_logs`, `logged_items`).
- **Funciones principales:**
  - `obtenerOCrearRegistroDiario(alumnoId, fecha)`: Obtiene el registro diario para una fecha específica o lo inicializa si no existe.
  - `registrarAlimentoConsumido(logId, datos)`: Inserta un alimento consumido en una comida determinada y actualiza los totales acumulados.
  - `eliminarAlimentoConsumido(itemId)`: Elimina un registro de alimento consumido.
  - `obtenerConsumoDiario(alumnoId, fecha)`: Devuelve el resumen diario agrupado por comida (Desayuno, Almuerzo, Merienda, Cena) con totales de kcal y macros.
  - `actualizarAgua(logId, litros)`: Actualiza la cantidad de agua registrada en el día.

### 6. `alimentos-locales.js`
- **Responsabilidad:** Catálogo local en memoria de 24 alimentos comunes con valores nutricionales estandarizados cada 100 g, categorías y pesos de unidades discretas.
- **Uso:** Utilizado como motor de búsqueda local en `reemplazar-ui.js` y como respaldo desconectado (offline).

### 7. `plan-defecto.js`
- **Responsabilidad:** Estructura fija de comidas y alimentos predeterminados para demostraciones o inicializaciones sin plan asignado.

---

## 🛡️ Principio de Resiliencia (Offline Fallback)

Todo controlador que consuma estos módulos debe manejar posibles fallos de red implementando un fallback transparente a `sessionStorage`. La ausencia de conexión o credenciales nunca debe congelar la interfaz ni generar errores no controlados en la consola del usuario.
