# AppCalorias - Sistema de Diseño (Design System)

Este documento centraliza las directrices visuales, la paleta de colores, la tipografía y los patrones de interfaz (UI/UX) de AppCalorias. El objetivo es mantener una consistencia visual estricta en todas las vistas (Coach y Alumno) utilizando Tailwind CSS.

---

## 1. Filosofía UX/UI
* Mobile-First: La interfaz está pensada principalmente para su uso en dispositivos móviles, centralizando el contenido en contenedores con un ancho máximo (max-w-sm, md:max-w-2xl) para escalar limpiamente a web.
* Rounded & Soft: Uso extensivo de bordes muy redondeados (rounded-2xl, rounded-[32px]) para dar una sensación amigable, moderna y de "app nativa".
* Estado Sin Recarga: Las transiciones de vistas (ej: de Lista a Métricas) se manejan manipulando clases de Tailwind (hidden, flex) mediante JavaScript para evitar parpadeos y recargas de página.

---

## 2. Tipografía

Se utiliza una única familia tipográfica de Google Fonts para garantizar máxima legibilidad y velocidad de carga.

* Fuente Principal: Inter
* Pesos utilizados:
  * Regular (400): Textos secundarios largos.
  * Medium (500): Subtítulos, descripciones (text-[#64748B]).
  * Semibold (600): Etiquetas de datos, botones secundarios.
  * Bold (700): Títulos de tarjetas, nombres de usuarios (text-[#1E293B]).
  * Extrabold (800): Títulos principales de pantallas, botones de acción (bg-[#22C55E]).

---

## 3. Paleta de Colores Base

### Fondos y Estructura (Themes)
* Verde Oscuro (App Background): #3D553E - Usado para el fondo global de la ventana.
* Verde Medio (Headers/Cards): #507052 - Usado en las cabeceras principales y menús modales.
* Slate Claro (Fondos de Contenido): #F8FAFC - Background principal de las áreas de trabajo y listas.
* Blanco Puro: #FFFFFF - Para las tarjetas de contenido y modales sobrepuestos.

### Textos y Títulos
* Negro Base / Títulos (Slate 900/800): #0E141A, #1E293B
* Textos Secundarios (Slate 500): #64748B
* Textos Deshabilitados/Labels (Slate 400): #94A3B8

### Acción y Éxito
* Verde Primario (Botones / CTA / Kcal): #22C55E
* Verde Oscuro (Textos sobre fondos claros): #15803D
* Verde Claro (Badges / Fondos de íconos): #DCFCE7

---

## 4. Sistema de Color para Macronutrientes

Para mantener consistencia visual al leer el balance diario y los alimentos, los macros tienen colores fijos asignados en las barras de progreso y los selectores:

* Calorías (KCAL): Verde (bg-[#22C55E])
* Proteínas (P): Rojo (bg-[#EF4444])
* Carbohidratos (HC): Naranja (bg-[#F97316])
* Grasas (G): Azul (bg-[#3B82F6])

### Badges de Categorías de Alimentos (Tabla Enums/UI)
* Proteína Magra / Lácteos: Fondo #DCFCE7 | Texto #15803D | Borde #BBF7D0
* Carbohidratos (HC): Fondo #FEF3C7 | Texto #D97706 | Borde #FDE68A
* Dulces / Azúcares: Fondo #FEE2E2 | Texto #DC2626 | Borde #FECACA
* Grasas: Fondo #E0E7FF | Texto #4F46E5 | Borde #C7D2FE

---

## 5. Componentes Principales

### Botones de Acción (CTA)
Todos los botones principales siguen esta estructura (ejemplo Tailwind):
w-full py-3 rounded-xl bg-[#22C55E] text-[#0E141A] font-extrabold text-xs shadow-sm active:scale-95 transition-transform

* Comportamiento: Se utiliza active:scale-95 y transition-transform para dar feedback táctil físico (el botón se hunde al tocarlo).

### Inputs y Formularios
Estructura base:
w-full bg-[#F8FAFC] border border-gray-200 text-xs font-bold text-gray-900 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#22C55E]

* Diseño: Sin outline por defecto. Al hacer focus, se envuelve en un anillo verde vibrante (focus:ring-[#22C55E]).

### Tarjetas de Lista (Cards)
Estructura base:
bg-white rounded-2xl p-4 border border-gray-100 shadow-sm

---

## 6. Microinteracciones y Lógica Visual

1. Swipe-to-Reveal (Deslizar para Eliminar/Editar):
   * Implementado en la lista de comidas del alumno. Las tarjetas de alimentos utilizan un contenedor relativo (overflow-hidden) con botones subyacentes. La tarjeta superior se desplaza en el eje X (translateX(75px)) al detectar eventos táctiles (touchstart, touchmove) o del mouse.
2. Scroll Colapsable (Sticky Header dinámico):
   * Al hacer scroll hacia abajo en la vista alumnos.html, la tarjeta del "Balance Diario" reduce su tamaño (p-3.5 a p-2.5), oculta subtítulos, y encoge las barras de progreso (h-2 a h-1.5) para maximizar el espacio en pantalla para los alimentos.
3. Modales Bottom-Sheet:
   * Los modales (ej: "Reemplazar Alimento", "Añadir a Desayuno") no aparecen en el centro, sino que emergen desde el borde inferior de la pantalla (flex-col justify-end, rounded-t-[28px]), emulando el comportamiento nativo de iOS/Android.