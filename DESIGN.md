# AppCalorias · Sistema de diseño

Cómo se ve y cómo se arma la interfaz de AppCalorias. Todo lo que dice este
documento sale del CSS real (`frontend/css/`): si cambia un token o un
componente, se actualiza acá en el mismo commit.

## 1. Para quién diseñamos

El alumno típico no es del gimnasio: es la persona que delega todo y quiere
que le digan **qué hacer, rápido**. De ahí salen las reglas de producto:

- **Acciones, no datos.** Primero la próxima acción ("Lo comí", "Registrar
  peso"); los números van en segundo plano.
- **Menos texto.** Botones con ícono + 1 o 2 palabras. Las explicaciones van
  en el onboarding, no en cada pantalla.
- **El método es del coach.** El alumno ve resultados (su meta, su peso),
  nunca fórmulas, desgloses ni etiquetas Bajo / Normal / Alto.
- **Denso pero tocable.** Se achica lo visual, nunca la zona táctil: todo lo
  que se toca mide al menos 44 × 44 px.

## 2. Archivos y orden de carga

HTML + CSS + JS sin frameworks ni build. Cada página carga, en este orden:

| Archivo | Qué tiene |
|---|---|
| Google Fonts (`<link>`) | Bricolage Grotesque y Instrument Sans |
| `css/base.css` | Tokens (`:root`), reseteo, marco de pantalla y tipografía |
| `css/components.css` | Componentes que usan coach **y** alumno, y utilidades al final |
| `css/pages/<seccion>.css` | Solo lo de esa sección: `cuenta.css` (login y registro), `alumno.css`, `coach.css` |

Si una pieza la usa un solo rol, va en el CSS de esa sección; si la usan los
dos, en `components.css`.

## 3. Reglas

1. **Solo tokens.** Colores, sombras, espacios y radios salen de las
   variables de `:root`. Fuera de `:root` no se escribe ningún color.
2. **Sin `style=""` en el HTML.** La única excepción es el ancho de las
   barras de progreso (`style="width: 57%"`), porque es un dato, no estilo.
3. **Espacios en la escala.** `gap`, `padding` y `margin` usan
   `--espacio-*`. Si un valor no está en la escala, se elige el más cercano.
4. **Zona táctil mínima de 44 px** (`--alto-tactil`). Un ícono chico va
   dentro de un botón de 44 × 44 transparente; dos botones vecinos llevan
   al menos 16 px de separación.
5. **El estado se marca con atributos**, no con clases: `aria-pressed`,
   `aria-current`, `aria-expanded`, `aria-selected` y `hidden`. El CSS se
   engancha de ahí (por ejemplo `.dia[aria-pressed="true"]`).
6. **Números alineados.** Valores que cambian (kcal, gramos, peso) usan
   `font-variant-numeric: tabular-nums` para que no "bailen".

## 4. Tokens

### 4.1 Color

**Marca**

| Token | Valor | Uso |
|---|---|---|
| `--verde` | `#1E6847` | Acción principal, links, elemento elegido |
| `--verde-oscuro` | `#134631` | Hover del verde, tarjetas oscuras de marca |
| `--verde-claro` | `#E4EFE8` | Fondos suaves de íconos y botones `--suave` |
| `--verde-texto-claro` | `#D3E6DA` | Texto sobre verde oscuro |
| `--verde-brillante` | `#7FD3A4` | Acentos sobre fondos oscuros |

**Neutros**

| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#F3F5F1` | Fondo de la pantalla |
| `--fondo-app` | `#DDE3DC` | Línea debajo de las pestañas |
| `--blanco` | `#FFFFFF` | Tarjetas, inputs, barra inferior |
| `--tinta` | `#17211C` | Texto principal y tarjeta oscura |
| `--gris-oscuro` / `--gris` / `--gris-medio` / `--gris-claro` | `#4A554E` / `#5B665F` / `#8A948D` / `#B9C4BD` | Texto secundario, de más a menos importante |
| `--borde` / `--borde-fuerte` / `--borde-punteado` | `#E3E7E1` / `#D6DDD7` / `#AEB8B1` | Bordes de tarjeta, de input y punteados |
| `--pista` / `--trazo` | `#E6EBE5` / `#C5CEC6` | Fondo de barras y anillos; marcas y vasos vacíos |
| `--gris-suave`, `--gris-tag`, `--fondo-oscurecido`, `--deshabilitado` | | Separadores, tags grises, zonas y estados apagados |

**Semánticos**

| Token | Uso |
|---|---|
| `--azul`, `--azul-claro`, `--azul-oscuro` | Información, avatares azules |
| `--naranja`, `--naranja-claro`, `--naranja-oscuro` | Avisos y restricciones ("Sin lactosa") |
| `--violeta` | Grasas |
| `--rojo`, `--rojo-borde` | Errores y acciones de borrar |
| `--agua`, `--agua-borde` | Vasos de agua |

**Macronutrientes**: siempre por su token, nunca por el color directo.

| Token | Macro | Color |
|---|---|---|
| `--macro-p` | Proteínas | azul |
| `--macro-c` | Carbohidratos | naranja |
| `--macro-g` | Grasas | violeta |

Los macros se distinguen también por su nombre o inicial (P, C, G), no solo
por el color.

### 4.2 Tipografía

| Familia | Token | Uso |
|---|---|---|
| Bricolage Grotesque (500–700) | `--fuente-titulos` | Títulos y números |
| Instrument Sans (400–600) | `--fuente-texto` | Todo el resto |

| Clase | Tamaño | Uso |
|---|---|---|
| `.titulo--grande` | 32 px | Título de pantalla ("Hoy", "Clientes") |
| `.titulo` | 24 px | Título de tarjeta o modal |
| `.seccion-titulo` | 18 px | Título de sección |
| `.num--xl` / `--l` / `--m` / `--s` | 52 / 30 / 20 / 16 px | Números destacados |
| `.unidad` | 13 px | Unidad al lado de un número ("kcal", "g") |
| `.sub` | 13 px, gris | Texto secundario |
| `.antetitulo` | 12 px | Rótulo en mayúsculas sobre un bloque |
| `.texto-12` / `-14` / `-15` | | Ajustes puntuales de tamaño |

Etiquetas secundarias: 11–12 px con `line-height: 1.2`; el dato al lado, en
negrita.

### 4.3 Espacios

| Token | Valor |
|---|---|
| `--espacio-2xs` | 2 px |
| `--espacio-xs` | 4 px |
| `--espacio-s` | 8 px |
| `--espacio-m` | 12 px |
| `--espacio-l` | 16 px |
| `--espacio-xl` | 20 px (`--pad-contenido`: margen de la pantalla) |
| `--espacio-2xl` | 24 px |
| `--espacio-3xl` | 32 px |

### 4.4 Formas, sombras y medidas

| Token | Valor | Uso |
|---|---|---|
| `--radio-chico` | 12 px | Botones chicos, inputs, íconos |
| `--radio-fila` | 14 px | Filas, días de la semana |
| `--radio-medio` | 16 px | Botones grandes |
| `--radio-lista` | 20 px | Listas y comidas |
| `--radio-tarjeta` | 24 px | Tarjetas y modales |
| `--sombra-sutil` | | Opción elegida de un segmentado |
| `--sombra-fija` | | Tarjeta que queda fija al scrollear (`.card--fija`) |
| `--sombra-flotante` | | Botón flotante |
| `--sombra-modal` / `--sombra-hoja` | | Modal / hoja que sube desde abajo |
| `--velo` | | Fondo oscuro detrás de un modal |
| `--blanco-translucido` | | Botón sobre tarjeta oscura |
| `--alto-tactil` | 44 px | Alto mínimo de lo que se toca |
| `--ancho-lectura` | 720 px | Ancho máximo del contenido en pantallas anchas |
| `--ancho-formulario` | 440 px | Ancho máximo de login y registro |
| `--ancho-menu` | 240 px | Menú lateral desde 768 px |

Todas las sombras y el velo se arman con `--tinta-rgb` (la tinta en RGB),
así cambian juntas si cambia la tinta.

## 5. Estructura de una pantalla

```html
<div class="pantalla">                <!-- ocupa toda la ventana -->
  <main class="contenido">…</main>     <!-- scroll interno; columna de hasta --ancho-lectura -->
  <nav class="barra-inferior">…</nav>  <!-- abajo en celular; menú lateral desde 768 px -->
</div>
```

**Responsive (celular primero, un solo corte en 768 px):**

| Ancho | Navegación | Contenido |
|---|---|---|
| Menos de 768 px | Barra inferior | Ancho completo con margen `--pad-contenido` |
| 768 px o más | Menú lateral de `--ancho-menu`, con ícono y texto en fila; el "+" del coach queda primero y muestra su acción | Columna centrada de hasta `--ancho-lectura` (`--ancho-formulario` en login y registro); el scroll queda en el borde de la ventana |

La hoja que sube desde abajo (`.hoja`) queda centrada con 560 px de ancho
máximo desde 768 px. El corte se escribe como `@media (min-width: 768px)`:
las variables CSS no funcionan dentro de un media query.

- `.contenido--holgado`: más aire arriba (pantallas principales).
- `.contenido--compacto`: menos aire (dashboard del alumno).
- `.contenido--cuenta`: login y registro.
- **Íconos:** cada página trae al principio su hoja `<svg class="sprite">`
  con `<symbol>` y los dibuja con `<svg class="icono"><use href="#nombre"/></svg>`.
  Los íconos decorativos llevan `aria-hidden="true"`; los botones de solo
  ícono, `aria-label`.

## 6. Componentes

| Grupo | Clases | Para qué |
|---|---|---|
| Botones | `.btn` + `--primario`, `--secundario`, `--suave`, `--punteado`, `--texto`, `--peligro`, `--peligro-texto`; tamaños `--chico` (44 px) y `--alto` (56 px) | Acciones. Uno solo `--primario` por pantalla |
| Botones de ícono | `.btn-icono` (44 × 44 con borde), `.btn-accion` (dentro de inputs y filas), `.btn-translucido` | Acciones sin texto |
| Tarjetas | `.card` + `--oscura`, `--borde-verde`, `--fija`; `.card__fila` | Bloques de contenido |
| Filas y listas | `.fila-link` (+ `--punteada`, `--borde`), `.lista`, `.grupo`, `.tile`, `.chevron` | Ítems que llevan a otra pantalla |
| Avatares y etiquetas | `.avatar` (+ color y tamaño), `.tag` (+ `--verde`, `--naranja`, `--gris`), `.chip`, `.preferencia` | Personas, estados y filtros |
| Formularios | `.campo`, `.campo__etiqueta`, `.input` (+ `--alto`, `--derecha`, `--con-accion`, `--angosto`, `--cantidad`), `.buscador`, `.casilla`, `.textarea` | Carga de datos |
| Selección | `.segmentado`, `.pestanas`, `.opcion` / `.opciones`, `.radio`, `.desplegable`, `.rango` | Elegir entre opciones |
| Acordeón | `.acordeon` (`<details>` / `<summary>`, sin JS) | Contenido que se abre y se cierra |
| Datos | `.macros`, `.macro`, `.barra` (+ `.p`, `.c`, `.g`), `.punto--*`, `.reparto`, `.resultado`, `.mini-dato` | Kcal, macros y avance |
| Mensajes | `.mensaje` (error; `data-tipo="ok"` para éxito), `.aviso`, `.nota`, `.nota-centrada`, `.vacio` (estado vacío) | Feedback al usuario |
| Navegación | `.encabezado`, `.barra-inferior` (+ `__item`, `__mas`), `.pie` | Arriba y abajo de la pantalla |
| Capas | `.modal-fondo` + `.modal` (se abre con `:target`, ej. `href="#eliminar"`), `.hoja` (sube desde abajo) | Confirmaciones y selectores |

**Del alumno** (`alumno.css`):

| Pieza | Clases | Para qué |
|---|---|---|
| Día | `.selector-fecha`, `.dias` / `.dia`, `.resumen-kcal` + `.anillo`, `.vasos` | Encabezado, rueda de días, calorías y agua |
| Comidas | `.comidas`, `.comida` (`<details name="comidas">` con `data-estado="hecha"` o `"pendiente"`), `.alimento-fila`, `.btn-reemplazar`, `.btn-agregar` (`aria-pressed`), `.aviso-flotante` | Tarjetas del dashboard; una sola abierta a la vez |
| Cantidad | `.input--cantidad`, `.aporte` / `.aporte__celda`, `.referencia` | Escribir la cantidad y ver lo que aporta |
| Reemplazos | `.reemplazos`, `.reemplazo` (`role="radio"`, `data-nivel="equivalente"`, `"parcial"` o `"no"`) | Resultados de buscar con qué cambiar un alimento (no hay sugerencias automáticas) |
| Alimento | `.valor-campo`, `.interruptor` (`role="switch"`) | Crear o corregir un alimento |
| Pantallas con pie | `.pie--centrado`, `.pie--columna`, `.btn-icono--primario` | El pie sigue a la columna centrada |
| Perfil | `.regla` / `.marca` | Selector de peso deslizable |

**Flujo de comidas** (`pages/alumno/`): en `dashboard.html`, el nombre de un
alimento abre `cantidad.html`, el ⇄ abre `reemplazar.html` y "Agregar
alimento" abre `agregar.html`. En `agregar.html`, el "+" de arriba abre
`crear-alimento.html` y cada alimento abre `cantidad.html`, que tiene el
acceso a `editar-alimento.html`. Todas son pantallas completas, no hojas
emergentes. Los datos (alimentos, cantidades, adherencia) se completan
cuando se conecten la API de alimentos y el algoritmo de equivalencias:
hasta entonces muestran "—".

## 7. Utilidades

Van al final de `components.css` para ganarle a lo anterior.

| Clase | Hace |
|---|---|
| `.fila`, `.fila--entre`, `.fila--base`, `.fila--arriba` | Flex horizontal y su alineación |
| `.columna`, `.columna--centro` | Flex vertical |
| `.grilla-2`, `.grilla-3` | Grilla de 2 o 3 columnas iguales |
| `.gap-2xs` … `.gap-xl` | Separación con la escala de espacios |
| `.crece` | Ocupa el espacio que sobra |
| `.tactil` | Alto mínimo de 44 px para links de texto |
| `.negrita`, `.texto-gris`, `.derecha`, `.sin-subrayado`, `.texto-12/14/15` | Ajustes de texto |
| `.sr-only` | Visible solo para lectores de pantalla |
| `.sprite` | Hoja de íconos que no ocupa lugar |

## 8. Pendiente

- **Dos columnas en PC.** Pantallas como el dashboard o la ficha del
  cliente podrían usar el ancho sobrante (por ejemplo, el resumen a la
  izquierda y la lista a la derecha).
- **Estados de los componentes.** Definir para todos default, hover
  (solo con `@media (hover: hover)`), foco, activo y deshabilitado.
- **Paleta de PROPUESTADESIGN.md.** Decidir si se adopta Inter y la paleta
  emerald o se mantiene la actual (con los ajustes de contraste que
  necesita).


## 9. Arquitectura de Plantillas HTML y Desacoplamiento JS

Para poder iterar y rediseñar las vistas HTML libremente sin romper la lógica de los controladores en `frontend/js/ui/`, el sistema establece **3 Reglas de Oro de Desacoplamiento**:

### Regla 1: Cero HTML en JavaScript — Etiquetas `<template>` nativas con `data-bind` y `data-ref`

El marcado estructural de filas repetibles (alimentos en comidas, resultados de búsqueda, opciones de reemplazo, tarjetas de historial o clientes) **vive exclusivamente en el archivo `.html`** dentro de etiquetas `<template id="tpl-...">`.

- **Prohibido construir marcado con `innerHTML`:** El JavaScript jamás concatena strings HTML con datos dinámicos ni de usuario.
- **Clonado e hidratación segura:** El controlador clona el nodo (`template.content.cloneNode(true)`), localiza los puntos de inserción mediante atributos semánticos (`[data-bind="..."]` para textos y `[data-ref="..."]` para enlaces, botones o contenedores interactivos) e inyecta los valores usando exclusivamente `textContent` o atributos seguros (`href`, `dataset`).
- **Beneficio doble:** Elimina de raíz las vulnerabilidades **DOM-XSS** y permite cambiar clases, orden de elementos o estructura visual en el `.html` sin modificar una sola línea de JavaScript.

```html
<!-- En el archivo .html -->
<template id="tpl-alimento-busqueda">
  <a class="fila-link fila-link--borde" data-ref="enlace" href="#">
    <div class="columna gap-2xs crece">
      <strong class="texto-15" data-bind="nombre"></strong>
      <span class="sub" data-bind="porcion"></span>
    </div>
    <span class="sub" data-bind="macros"></span>
    <span class="num--s" data-bind="kcal"></span>
  </a>
</template>
```

```javascript
// En el controlador UI (frontend/js/ui/*-ui.js)
const tpl = document.querySelector('#tpl-alimento-busqueda');
const clon = tpl.content.cloneNode(true);
clon.querySelector('[data-bind="nombre"]').textContent = item.nombre;
clon.querySelector('[data-bind="kcal"]').textContent = `${item.kcal} kcal`;
clon.querySelector('[data-ref="enlace"]').href = `cantidad.html?alimento=${encodeURIComponent(item.nombre)}`;
contenedor.appendChild(clon);
```

### Regla 2: Un solo `.html` por pantalla con estados `hidden`

"Vacío" y "Con datos" no son páginas distintas, sino **estados de datos de una misma pantalla**.

- **Prohibido duplicar archivos `.html` para estados vacíos** (por ejemplo, evitar separar `plan-editor.html` y `plan-editor-vacio.html` o `clientes.html` y `clientes-vacio.html`).
- **Conmutación por atributo `hidden`:** Toda pantalla con colecciones dinámicas incluye en el mismo documento tanto el bloque de estado vacío (`.vacio`) como el contenedor de datos (`.lista`, `.comidas`, etc.), alternando su visibilidad mediante el atributo nativo `hidden`:

```html
<!-- Estado vacío y contenedor conviven en el mismo .html -->
<div class="vacio" data-ref="estado-vacio" hidden>
  <p class="seccion-titulo">Todavía no hay elementos</p>
  <p class="sub">Agregá el primero para comenzar.</p>
</div>

<div class="lista" data-ref="lista-datos">
  <!-- Filas instanciadas desde <template> -->
</div>
```

### Regla 3: Cascarón Compartido (Sprite SVG y Barra Inferior) e Invariantes Conceptuales por Rol

El módulo transversal [`frontend/js/utils/navegacion.js`](file:///C:/Users/gian9/OneDrive/Desktop/AppCalorias/frontend/js/utils/navegacion.js) garantiza la consistencia del cascarón visual (hidratación de íconos del `<svg class="sprite">`, estado activo de `.barra-inferior`, historial de retorno y avisos flotantes en `sessionStorage`) y resguarda **dos invariantes conceptuales del producto**:

1. **Invariante de Contexto (`contexto.html`):** El método técnico pertenece al coach. Cuando accede un **alumno**, solo visualiza su meta y objetivo; el desglose matemático de fórmulas y componentes técnicos (**BMR / TMB**, **NEAT**, **METs**, **TEF** y **TDEE**) permanece estrictamente oculto (`hidden`) para el rol alumno y solo se expone al **coach**.
2. **Invariante de 1-Tap Check en el Dashboard (`dashboard.html`):** El tablero diario del alumno se hidrata desde el **plan activo prescripto por su coach** para permitir confirmar cada comida con un toque ("Lo comí" / 1-Tap Check), a la vez que habilita la **carga libre** o reemplazo equivalente de alimentos cuando el alumno come fuera del plan o aún no tiene un plan asignado.
