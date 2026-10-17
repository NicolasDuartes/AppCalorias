# 📋 AppCalorias — Documentación Integral del Proyecto, Arquitectura y Hub Técnico

> **Estado del Repositorio:** Rama activa `feature/api-equivalencias` (Commit `2dc2dab`)  
> **Autores / Colaboradores Principales:** Nicolás Duartes, Benjamín Vasconsellos, Claude, Antigravity  
> **Stack Base:** Mobile-first Vanilla Web (HTML5, CSS3 Custom Tokens, ES Modules sin build steps) + Supabase (PostgreSQL 15+, Auth, RLS y Stored Procedures)  
> **Dashboard Web Interactivo:** [`frontend/docs-dashboard.html`](../frontend/docs-dashboard.html) (y versión standalone en [`scratch/docs_viewer/index.html`](../../docs_viewer/index.html))  
> **Diseño de Interfaz:** [`DESIGN_DASHBOARD.md`](../DESIGN_DASHBOARD.md)  
> **Google Doc Conectado:** [Copia de Idea general proyecto](https://docs.google.com/document/d/18s7zuFP1w0_MDb8nW-CmYZ0FsMx2IASV9H6AzQ2fqcU)

---

## 1. Visión General del Producto y Filosofía

**AppCalorias** es una plataforma web progresiva (diseñada *Mobile-First* y adaptable a escritorio) orientada a la gestión nutricional y control calórico basada en la relación colaborativa y asimétrica **Coach – Alumno**:
* **El Alumno ("Acciones, no datos"):** No es necesariamente un atleta experimentado; suele ser una persona ocupada que busca delegar la complejidad técnica nutricional y requiere saber **qué comer, cuánto comer y cómo registrarlo en menos de 10 segundos** con el *1-Tap Check*.
* **El Coach ("El método le pertenece"):** Dispone de herramientas clínicas y analíticas para definir el gasto energético (BMR, NEAT, METs, TDEE), armar planes estructurados en 4 comidas, asignar alimentos fijados, monitorear la adherencia en tiempo real y gestionar reemplazos de alimentos de forma matemáticamente controlada.

### Principios Rectores de Diseño (según `DESIGN.md` y `DESIGN_DASHBOARD.md`)
1. **Acciones antes que números:** El alumno visualiza de inmediato su próxima acción (*"Lo comí"*, *"Registrar peso"*); las fórmulas y desgloses analíticos se reservan para la vista del coach.
2. **Ergonomía táctil y accesibilidad:** Zona táctil mínima garantizada de **44 × 44 px** (`--alto-tactil`), contraste semántico estricto y alineación numérica tabular (`tabular-nums`) para evitar vibraciones en la interfaz al cambiar valores.
3. **Cero dependencias pesadas de construcción:** Sin frameworks reactivos pesados (React/Angular/Vue) ni bundlers complejos (Webpack/Vite). Se ejecuta directamente en el navegador con ES Modules, facilitando un despliegue instantáneo y una bajísima barrera de mantenimiento.
4. **Visualización Ergonómica por Pestañas:** Para evitar la fatiga cognitiva de volcados extensos de texto, toda la información técnica, modelos y preguntas estratégicas se estructuran en **8 Pestañas Interactivas** navegables.

---

## 2. Arquitectura del Frontend y Sistema de Pestañas

### 2.1 Estructura de Directorios del Proyecto
```
frontend/
├── index.html                 # Pantalla de acceso / Inicio de sesión
├── registro.html              # Creación de cuenta (rol, @usuario, correo, contraseña)
├── docs-dashboard.html        # Dashboard técnico interactivo con 8 pestañas y simuladores
├── css/
│   ├── base.css               # Reset, tipografía, layout y variables/tokens (:root)
│   ├── components.css         # Componentes universales compartidos (Coach y Alumno)
│   └── pages/                 # Estilos específicos por dominio
│       ├── alumno.css         # Rueda de días, anillo de calorías, tarjetas de comidas
│       ├── coach.css          # Tablas de clientes, editor de plan, acordeones
│       └── cuenta.css         # Formularios y estados de autenticación
├── js/
│   ├── data/
│   │   ├── supabase.js        # Instancia del cliente Supabase vía ESM CDN
│   │   └── sesion.js          # Guardián de rutas, exigirRol(), cerrarSesion()
│   ├── utils/
│   │   └── texto.js           # Formateo de nombres, iniciales y textos
│   └── ui/                    # Controladores por pantalla
│       ├── login-ui.js        # Manejador de index.html
│       ├── cuenta-ui.js       # Registro con validación en tiempo real de @usuario
│       ├── dashboard-ui.js    # Rueda de días deslizante y fecha activa
│       ├── perfil-ui.js       # Datos de cuenta del alumno y código de vinculación
│       ├── objetivo-ui.js     # Regla analógica táctil para registro de peso
│       ├── clientes-ui.js     # Panel del coach y modal de vinculación
│       ├── cliente-ui.js      # Ficha del cliente y desvinculación
│       ├── perfil-coach-ui.js # Perfil del coach y logout
│       └── rol-ui.js          # Adaptador dinámico de páginas compartidas
└── pages/
    ├── alumno/
    │   ├── dashboard.html     # Vista principal diaria (Hoy / Ayer / Calendario)
    │   ├── plan.html          # Plan completo asignado
    │   ├── cantidad.html      # Ajuste de cantidad consumida
    │   ├── reemplazar.html    # Buscador y reemplazo por equivalencia
    │   ├── crear-alimento.html# Alta de alimento personalizado
    │   ├── editar-alimento.html# Modificación de alimento propio
    │   └── perfil.html        # Datos del alumno y visualización de client_code
    └── coach/
        ├── clientes.html      # Lista de alumnos asignados y botón de vinculación
        ├── cliente.html       # Ficha individual del alumno y resumen semanal
        ├── crear-plan.html    # Asistente de creación de plan en 4 comidas
        ├── editar-plan.html   # Editor de plan y ajustes de porciones
        └── perfil.html        # Perfil del profesional y cierre de sesión
```

---

## 3. Modelo de Datos, PostgreSQL y Supabase (RLS)

### 3.1 Tablas Principales y Relaciones
* **`public.perfiles`:** Perfil de usuario extendido (`id UUID REFERENCES auth.users`, `usuario TEXT UNIQUE`, `nombre TEXT`, `rol TEXT CHECK (rol IN ('alumno','coach'))`, `client_code TEXT UNIQUE`).
* **`public.alumnos_coach`:** Vínculo `(coach_id UUID, alumno_id UUID, vinculado_en TIMESTAMPTZ)`.
* **`public.planes_alimentacion`:** Cabecera del plan nutricional (`id`, `alumno_id`, `coach_id`, `calorias_objetivo`, `activo BOOLEAN`).
* **`public.daily_logs`:** Registro atómico diario de consumo confirmado por el alumno (`id`, `alumno_id`, `fecha DATE`, `comida_nombre TEXT`, `alimento_id UUID`, `gramos_reales NUMERIC`, `consumido BOOLEAN`).
* **`public.alimentos`:** Catálogo de alimentos (`id`, `nombre`, `calorias_100g`, `proteinas_100g`, `carbohidratos_100g`, `grasas_100g`, `is_public BOOLEAN`, `creado_por UUID`).

### 3.2 Procedimiento Almacenado RPC: Vinculación Segura
```sql
CREATE OR REPLACE FUNCTION public.vincular_alumno_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id UUID := auth.uid();
  v_alumno_id UUID;
  v_perfil_alumno RECORD;
BEGIN
  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT id, nombre, usuario INTO v_perfil_alumno
  FROM public.perfiles
  WHERE UPPER(client_code) = UPPER(TRIM(p_codigo)) AND rol = 'alumno';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de alumno inexistente');
  END IF;

  v_alumno_id := v_perfil_alumno.id;

  INSERT INTO public.alumnos_coach (coach_id, alumno_id, vinculado_en)
  VALUES (v_coach_id, v_alumno_id, NOW())
  ON CONFLICT (coach_id, alumno_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'alumno_id', v_alumno_id, 'nombre', v_perfil_alumno.nombre);
END;
$$;
```

---

## 4. Motor Nutricional y Algoritmo de Equivalencias L1

Para sustituir un alimento planificado $A$ por un alimento alternativo $B$, el motor busca el multiplicador $x^*$ (en porciones de 100g) que minimiza la desviación ponderada en norma $L_1$:

$$E(x) = w_1 \frac{|C_A - x C_B|}{C_A} + w_2 \frac{4|P_A - x P_B|}{C_A} + w_3 \frac{4|CH_A - x CH_B|}{C_A} + w_4 \frac{9|G_A - x G_B|}{C_A}$$

Donde $w_1 = 0.20$ y $w_2, w_3, w_4$ se normalizan al 80% restante según la proporción calórica de cada macronutriente en $A$.  
Dado que $E(x)$ es una función convexa lineal a trozos, su mínimo global exacto coincide con la **mediana ponderada** de los puntos de quiebre $\{C_A/C_B, P_A/P_B, CH_A/CH_B, G_A/G_B\}$, resolviéndose analíticamente en tiempo constante $O(1)$.

### Umbrales de Aceptación:
* **Equivalente Óptimo:** Adherencia $\ge 90\%$ y Similitud de perfil $\ge 75\%$.
* **Equivalente Parcial:** Adherencia $\ge 75\%$ y Similitud de perfil $\ge 60\%$.
* **No Recomendado:** Similitud $< 60\%$ o Adherencia $< 75\%$.

---

## 5. Auditoría de Errores y Deuda Técnica en el Repositorio

1. **`Fatal Functional Bug` — Desconexión de datos en el Alumno:** `dashboard.html`, `cantidad.html` y `reemplazar.html` muestran guiones fijos ("—") en lugar de consumir `daily_logs` y `planes_alimentacion`.
2. **`Fatal Functional Bug` — Onboarding Ausente:** `registro.html` crea el usuario pero no existe la pantalla `onboarding.html` para calcular BMR, NEAT ni TDEE.
3. **`Schema Mismatch` — Tabla `antropometrias` Obsoleta:** Persiste en migraciones pasadas pese a que la UI actual la descartó.
4. **`Minor Robustness Risk` — RPC `usuario_disponible` sin Rate Limit:** Expuesta a enumeración masiva de usernames por fuerza bruta.
5. **`Minor Robustness Risk` — Colisiones en `client_code`:** Bucle aleatorio sin índice único parcial ni retroceso exponencial.

---

## 6. Integración de Seguridad OpenFDA: Suplementación & Hidratación

Bajo el marco regulatorio **DSHEA** de la FDA:
* **Creatina Monohidrato (UNII: MU72812GK0):** Estatus GRAS. Dosis diaria recomendada: 3g–5g. Requiere **+500 ml de agua adicionales** al requerimiento basal.
* **Cafeína Anhidra (UNII: 3G6A5W338E):** Límite máximo de seguridad para adultos sanos: **400 mg diarios**.
* **Proteína Whey WPI (UNII: 72N6YF3527):** Estatus GRAS. Rango óptimo: 1.6–2.2 g de proteína/kg corporal.
* **Vitamina D3 (UNII: 1C6V77QF41):** Límite superior tolerable (UL): **4,000 UI diarias** sin supervisión médica.
* **Omega 3 EPA/DHA (UNII: 0G416P149N):** Estatus GRAS hasta **3,000 mg diarios combinados**.

### Fórmula de Hidratación Dinámica:
$$\text{Agua Diaria (ml)} = (\text{Peso en kg} \times 35) + (\text{g de Creatina} \times 100) + (\text{Cafeína} \ge 200\text{mg} \to +150) + (\text{Minutos Entrenamiento} \times 12)$$

---

## 7. Arquitectura de AI Agents y Tool Schemas (`agent-tool-builder`)

### 7.1 Tool Schemas Formales en JSON Schema

#### Tool 1: `compute_food_equivalence`
```json
{
  "name": "compute_food_equivalence",
  "description": "Calcula analíticamente la porción óptima en gramos y el índice de adherencia nutricional para sustituir un alimento planificado por otro alternativo mediante la minimización en mediana ponderada L1.",
  "parameters": {
    "type": "object",
    "properties": {
      "target_food": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "quantity_grams": { "type": "number", "minimum": 1 },
          "calories": { "type": "number", "minimum": 0 },
          "protein": { "type": "number", "minimum": 0 },
          "carbs": { "type": "number", "minimum": 0 },
          "fat": { "type": "number", "minimum": 0 }
        },
        "required": ["name", "quantity_grams", "calories", "protein", "carbs", "fat"]
      },
      "replacement_food": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "calories_per_100g": { "type": "number", "minimum": 0 },
          "protein_per_100g": { "type": "number", "minimum": 0 },
          "carbs_per_100g": { "type": "number", "minimum": 0 },
          "fat_per_100g": { "type": "number", "minimum": 0 }
        },
        "required": ["name", "calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g"]
      }
    },
    "required": ["target_food", "replacement_food"]
  }
}
```

#### Tool 2: `validate_supplement_safety_fda`
```json
{
  "name": "validate_supplement_safety_fda",
  "description": "Valida una sustancia o suplemento dietario contra las bases de datos regulatorias de OpenFDA (tolerable upper intake levels, estatus GRAS, advertencias y reportes de eventos adversos).",
  "parameters": {
    "type": "object",
    "properties": {
      "supplement_name": { "type": "string", "description": "Nombre de la sustancia o principio activo (ej. creatine, caffeine, vitamin_d)" },
      "dosage": { "type": "string", "description": "Dosis diaria planificada (ej. '5g', '300mg')" },
      "user_age": { "type": "integer", "description": "Edad del usuario para validar límites pediátricos o geriátricos" }
    },
    "required": ["supplement_name", "dosage"]
  }
}
```

#### Tool 3: `search_food_database`
```json
{
  "name": "search_food_database",
  "description": "Busca alimentos en el catálogo oficial de AppCalorias con filtrado por macronutrientes, coincidencia difusa (fuzzy search) y banderas dietarias (vegano, celíaco, keto).",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Término de búsqueda (ej. 'arroz integral', 'pechuga', 'huevo')" },
      "dietary_flags": {
        "type": "array",
        "items": { "type": "string", "enum": ["vegan", "vegetarian", "gluten_free", "lactose_free", "keto"] },
        "description": "Restricciones dietarias obligatorias"
      },
      "max_results": { "type": "integer", "default": 10, "maximum": 50 }
    },
    "required": ["query"]
  }
}
```

#### Tool 4: `generate_coach_meal_plan`
```json
{
  "name": "generate_coach_meal_plan",
  "description": "Genera una propuesta estructurada de plan de alimentación en 4 comidas diarias que respeta con precisión milimétrica el presupuesto calórico y de macronutrientes fijado por el Coach.",
  "parameters": {
    "type": "object",
    "properties": {
      "target_calories": { "type": "number", "description": "Calorías diarias objetivo (TDEE corregido)" },
      "target_protein_g": { "type": "number", "description": "Gramos de proteína diarios objetivo" },
      "target_carbs_g": { "type": "number", "description": "Gramos de carbohidratos diarios objetivo" },
      "target_fat_g": { "type": "number", "description": "Gramos de grasas diarios objetivo" },
      "meals_distribution": {
        "type": "object",
        "description": "Porcentaje calórico por comida (ej. desayuno: 0.25, almuerzo: 0.35, merienda: 0.15, cena: 0.25)",
        "properties": {
          "desayuno": { "type": "number" },
          "almuerzo": { "type": "number" },
          "merienda": { "type": "number" },
          "cena": { "type": "number" }
        }
      }
    },
    "required": ["target_calories", "target_protein_g", "target_carbs_g", "target_fat_g"]
  }
}
```

#### Tool 5: `log_student_daily_intake`
```json
{
  "name": "log_student_daily_intake",
  "description": "Registra el consumo confirmado de una comida, suplemento o ingesta hídrica en la tabla daily_logs de Supabase, validando previamente que no se dupliquen registros para la misma fecha.",
  "parameters": {
    "type": "object",
    "properties": {
      "log_type": { "type": "string", "enum": ["meal", "supplement", "water"] },
      "date": { "type": "string", "format": "date", "description": "Fecha del consumo (YYYY-MM-DD)" },
      "meal_name": { "type": "string", "description": "Nombre de la comida (Desayuno, Almuerzo, Merienda, Cena) si aplica" },
      "item_id": { "type": "string", "description": "ID del alimento o suplemento" },
      "quantity": { "type": "number", "description": "Cantidad consumida en gramos, unidades o mililitros" },
      "calories": { "type": "number", "description": "Calorías aportadas" }
    },
    "required": ["log_type", "date", "quantity"]
  }
}
```

---

## 8. Las 25 Preguntas Estratégicas para Devs & Tech Leads

### Eje A: Frontend & Stack
1. **Estrategia sin Bundler a Escala (`P1`):** Cache-busting con querystrings `?v=X.Y` en imports durante despliegues Git.
2. **Sincronización Offline-First (`P0`):** Persistencia en `IndexedDB` con Service Worker y Background Sync para sótanos de gimnasios sin señal móvil.
3. **Manejo Centralizado de Estado Reactivo (`P2`):** Bus de eventos con `CustomEvent` y `BroadcastChannel` para sincronizar pestañas sin librerías externas.
4. **Sanitización y Validación en Formularios Críticos (`P0`):** Prevención estricta de XSS mediante `textContent` y esquemas de validación tipo Zod/JSON Schema en el cliente antes de llamar a PostgREST.
5. **Componentización de SVG Sprites vs Inyección Inline (`P2`):** Unificación de sprites repetidos en un archivo global `icons.svg` consumido por `<use href="assets/icons.svg#id">`.

### Eje B: Base de Datos & Supabase
6. **Desacoplamiento Formal de Antropometría (`P0`):** Ejecución de migración `20261017_drop_antropometria.sql` para purgar tablas y columnas obsoletas.
7. **Normalización Relacional vs JSONB en Planes (`P1`):** Normalización de comidas en tablas `plan_meals` y `plan_items` para preservar integridad referencial y auditoría.
8. **Performance de la Vista SQL `coach_alumno_summary` (`P1`):** Conversión a `MATERIALIZED VIEW` con refresco automático mediante `pg_cron`.
9. **Manejo de Zonas Horarias y Registros a Medianoche (`P1`):** Almacenamiento de `log_date` como tipo `DATE` estricto en huso horario local (`America/Argentina/Cordoba`).
10. **Riesgo de Colisión en Generación de Código `client_code` (`P1`):** Índice único en PostgreSQL y límite de 5 reintentos con backoff exponencial.

### Eje C: Motor Nutricional & Equivalencias L1
11. **Fuente de Datos Definitiva del Catálogo de Alimentos (`P0`):** Base curada en Supabase (500 alimentos frecuentes de consumo regional) combinada con API de Open Food Facts para códigos de barra.
12. **Soporte para Unidades y Medidas Caseras (`P1`):** Gramajes promedio precargados (1 huevo = 55g, 1 banana = 120g) con redondeo automático a la unidad.
13. **Calibración y Validación Clínica de Umbrales L1 (`P1`):** Validación por nutricionista líder de los márgenes del 90% (adherencia) y 75% (similitud).
14. **Restricción por Categorías y Perfiles Lipídicos (`P0`):** Matriz de compatibilidad biológica obligatoria antes de ejecutar la minimización L1 para evitar sustituciones aberrantes.
15. **Alimentos Creados por Usuarios: Privacidad vs Comunidad (`P2`):** Visibilidad privada por defecto (`is_public = false`) con flujo de moderación técnica.

### Eje D: Seguridad, Roles & Autenticación
16. **Protección contra Registro Abierto de Coaches (`P1`):** Estado de aprobación manual `approved = false` o código de invitación previo a habilitar clientes.
17. **Rate-Limiting en RPC Pública `usuario_disponible` (`P1`):** Control de peticiones por IP mediante Supabase Edge Functions para prevenir scraping.
18. **Ciclo de Vida de Tokens JWT y Prevención de Pérdida de Datos (`P0`):** Listener global con `supabase.auth.onAuthStateChange` para auto-renovación silenciosa y reintento de peticiones encoladas.
19. **Privacidad y Borrado de Datos (GDPR / Desvinculación) (`P1`):** Desvinculación lógica (`unlinked_at`) que revoca acceso al coach de manera instantánea vía RLS sin destruir el historial médico del alumno.
20. **Validación de Roles en el Servidor (Bypass de Frontend) (`P0`):** Inmutabilidad del rol en `auth.users` mediante triggers PostgreSQL en `handle_new_user()` y verificación estricta en todas las RLS policies.

### Eje E: UX, Producto & Roadmap
21. **Experiencia del Alumno sin Coach (`P1`):** Plantillas de dietas típicas (Alta en Proteína, Déficit Moderado, Keto) con gramajes adaptados a su contexto energético.
22. **El "Muñeco Dinámico" de Progreso Físico (`P2`):** Renderizado SVG vectorial paramétrico liviano en lugar de dependencias 3D pesadas para asegurar 60 fps en móviles de gama baja.
23. **Notificaciones Push para Recordatorio de Hidratación (`P1`):** Web Push API integrada en el Service Worker para recordar tomas en las horas clave de entrenamiento.
24. **Frecuencia y Validación de Pesajes Corporales (`P2`):** Regla analógica táctil limitada a un registro matutino diario con media móvil de 7 días para suavizar oscilaciones hídricas.
25. **Telemetría y Monitoreo de Errores en Clientes Móviles (`P1`):** SDK ligero de Sentry o logging estructurado hacia una tabla `client_logs` en Supabase con sampling del 10%.