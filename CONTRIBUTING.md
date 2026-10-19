# Guía de Contribución — AppCalorias 🤝

Esta guía detalla los estándares de arquitectura, código, pruebas y control de versiones que rigen el proyecto. Todo cambio debe preservar la simplicidad, accesibilidad y filosofía *buildless* del sistema.

---

## 🏛️ Filosofía Arquitectónica

1. **Cero Frameworks y Cero Build Tools:**
   - La aplicación corre directamente en el navegador mediante **HTML5 estándar**, **CSS nativo con Custom Properties** y **ES Modules nativos (`import` / `export`)**.
   - No se permite introducir empaquetadores (Webpack, Vite, Rollup), transpiladores (Babel) ni frameworks de renderizado (React, Vue, Angular).
2. **Desacoplamiento Estricto del DOM (Patrón `SELECTORES`):**
   - El código JavaScript jamás debe tener selectores de elementos dispersos o hardcodeados en funciones internas.
   - Cada módulo UI en `frontend/js/ui/` debe exportar un mapa centralizado denominado `SELECTORES` en el nivel superior del archivo.
   - Los controladores deben incluir guardas defensivas para elementos opcionales o nulos (`if (!elemento) return;`).
3. **Resiliencia y Modo Desconectado (Offline Fallback):**
   - Toda interacción que consulte o persista datos en Supabase debe envolver sus operaciones en bloques `try / catch`.
   - Cuando no exista sesión activa o falle la red, la interfaz debe operar con un respaldo transparente en `sessionStorage` o catálogos locales (`alimentos-locales.js`).

---

## 📄 Protocolo para Crear o Modificar Pantallas

Al añadir una nueva página o modificar una existente, seguí estrictamente estos pasos:

### 1. Estructura HTML Semántica
- Ubicá el archivo en la carpeta correspondiente a su rol:
  - `frontend/pages/alumno/` para vistas de alumnos.
  - `frontend/pages/coach/` para vistas del entrenador.
  - `frontend/pages/shared/` para vistas compartidas.
- Cargá las hojas de estilo en el orden oficial:
  1. Google Fonts (`Bricolage Grotesque` e `Instrument Sans`).
  2. `../../css/base.css` (Tokens y tipografía).
  3. `../../css/components.css` (Componentes transversales).
  4. `../../css/pages/<seccion>.css` (Estilos específicos del rol).
- Cargá el controlador como módulo ES nativo al final del `<body>`:
  ```html
  <script type="module" src="../../js/ui/mi-pantalla-ui.js"></script>
  ```

### 2. Estructura del Controlador UI (`frontend/js/ui/mi-pantalla-ui.js`)
Cada controlador debe adherirse al siguiente formato:

```javascript
/* ==========================================================
   mi-pantalla-ui.js — Controlador de Mi Pantalla
   - Descripción clara de la responsabilidad del módulo.
   - Control de acceso por rol con exigirRol si corresponde.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM.
 */
export const SELECTORES = {
  formulario: '#form-principal',
  inputNombre: 'input[name="nombre"]',
  btnGuardar: '.btn--primario'
};

/**
 * Inicializa la lógica de interacción de la pantalla.
 */
export async function iniciarMiPantalla() {
  const form = document.querySelector(SELECTORES.formulario);
  if (!form) return;

  // Lógica de interacción con guardas defensivas...
}

// Auto-inicialización segura según el estado del documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarMiPantalla);
} else {
  iniciarMiPantalla();
}
```

---

## 🎨 Convenciones de Estilo (CSS)

- **Solo Tokens:** Todo color, margen, espaciado, sombra o radio debe provenir de las variables definidas en `:root` ([`frontend/css/base.css`](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/frontend/css/base.css)).
- **Prohibido `style=""` en HTML:** Solo se admite para valores puramente dinámicos generados por datos (por ejemplo, el ancho porcentual de una barra de macronutrientes: `style="width: 45%"`).
- **Zona Táctil Mínima de 44 px:** Todo botón, enlace o área interactiva debe medir al menos 44 × 44 px (`--alto-tactil`).
- **Estados por Atributos ARIA:** Los cambios de estado deben regirse por atributos semánticos (`aria-pressed`, `aria-expanded`, `aria-selected`, `hidden`), nunca por clases inventadas.
- **Tipografía Numérica:** Toda cifra que fluctúe (kcal, gramos, porcentaje) debe usar `font-variant-numeric: tabular-nums` para evitar saltos visuales.

---

## 🧪 Validación y Pruebas Obligatorias

Antes de enviar cualquier cambio, es obligatorio ejecutar las suites de validación y comprobar que pasen al **100%**:

```powershell
# 1. Verificar sintaxis JavaScript y balance de llaves/paréntesis
python scratch/validate_js.py

# 2. Verificar que todos los HTMLs importen módulos, exporten SELECTORES y no haya ciclos
python scratch/test_modularization.py

# 3. Verificar que no haya enlaces o scripts rotos
python scratch/test_navigation_integrity.py

# 4. Verificar integridad de módulos Supabase
python scratch/test_supabase_modules.py
```

---

## 📦 Gobernanza de Commits

Seguimos el estándar **Conventional Commits**:
- `feat(scope): ...` para nuevas funcionalidades.
- `fix(scope): ...` para corrección de bugs.
- `refactor(scope): ...` para reestructuraciones de código sin cambio de comportamiento.
- `docs(scope): ...` para modificaciones exclusivas en documentación.
- `test(scope): ...` para adición o ajuste de pruebas.
- `perf(scope): ...` para optimizaciones de rendimiento.

> [!TIP]
> **Empaquetamiento Prudente:** Agrupá los cambios en paquetes semánticos completos antes de hacer commit y push. Evitá enviar múltiples micro-commits por minuto para mantener un historial limpio y legible en GitHub.
