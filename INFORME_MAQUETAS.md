INFORME CONSOLIDADO DE MAQUETACIÓN UI/UX — AppCalorias

Rama de trabajo: feature/maqueta-app
Rama base: feature-Juan-Gimenez
Stack técnico: HTML5 + Tailwind CSS (CDN) + Google Fonts (Inter)
Viewport estandarizado: 390 x 917 px (Android mobile layout)

1. Resumen ejecutivo
Se completó el diseño, estandarización técnica y limpieza del 100% de las pantallas correspondientes al Diario Nutricional, el Sistema de Equivalencias / Reemplazos y el Flujo Completo de "Añadir Alimento / Porción" (Categorías raíz y subgrupos expandidos). Todas las plantillas fueron diseñadas de forma modular e independiente sin sobreescribir ni romper la estructura de index.html ni styles.css.

2. Inventario total de archivos generados (18 maquetas)

A. Vistas Principales del Diario (2 archivos):
- diario-kcal.html: Modo diario por Kcal y gramos. Header y tarjeta de balance diario fijos, listado de 4 comidas con scroll fluido (min-h-0) y barra inferior de navegación fija.
- diario-porciones.html: Modo diario por porciones. Idéntica estructura y layout, lógica de check/tachado interactivo y contadores de porciones.

B. Modales de Reemplazo / Equivalencias Directas (8 archivos):
- reemplazo-hc.html: Reemplazo para carbohidratos complejos (pan integral, galletas de arroz, avena, copos).
- reemplazo-dulce.html: Reemplazo para dulces (dulce de leche, miel pura, mermelada, chocolate).
- reemplazo-fruta.html: Reemplazo para frutas (banana, manzana/pera, cítricos, frutos rojos).
- reemplazo-proteinas-magras.html: Reemplazo para proteínas magras (pollo, carne magra, atún, claras, whey).
- reemplazo-proteinas-grasas.html: Reemplazo para proteínas grasas (huevo entero, queso tybo/danbo, untable).
- reemplazo-legumbres.html: Reemplazo para legumbres (lentejas, garbanzos, porotos).
- reemplazo-lacteos.html: Reemplazo para lácteos (leche descremada, yogur griego, yogur bebible).
- reemplazo-frutas-oleosas.html: Reemplazo para grasas saludables (crema de maní, palta, aceite de oliva, frutos secos).

C. Flujo "Añadir alimento" — Vistas Raíz / Acordeones Cerrados (3 archivos):
- add-food-proteinas-cerrado.html: Tab de Proteínas activo, muestra los 4 subgrupos colapsados con badges y contadores.
- add-food-carbohidratos-cerrado.html: Tab de Carbohidratos activo, muestra sus 3 subgrupos colapsados.
- add-food-grasas-cerrado.html: Tab de Grasas activo, muestra su subgrupo colapsado.

D. Flujo "Añadir alimento" — Subgrupos Desplegados / Abiertos (5 archivos):
- add-food-proteinas-magras-abierto.html: Acordeón de Proteínas Magras desplegado con 5 alimentos, selector de porciones (- 1 porc. +) y botón verde de adición.
- add-food-proteinas-grasas-abierto.html: Acordeón de Proteínas Grasas desplegado (huevo, quesos).
- add-food-proteinas-legumbres-abierto.html: Acordeón de Legumbres desplegado (lentejas, garbanzos, porotos).
- add-food-proteinas-lacteos-abierto.html: Acordeón de Lácteos desplegado (leche descremada, yogur descremado).
- add-food-carbohidratos-hc-abierto.html: Acordeón de Hidratos de Carbono desplegado (arroz, fideos, papa, panes, avena).
- add-food-carbohidratos-frutas-abierto.html: Acordeón de Frutas desplegado (manzana, banana, cítricos, frutos rojos).
- add-food-carbohidratos-dulces-abierto.html: Acordeón de Dulces desplegado (dulce de leche, miel, mermelada).
- add-food-grasas-oleosas-abierto.html: Acordeón de Frutas Oleosas / Grasas desplegado (pasta de maní, aceite de oliva, palta, frutos secos, aceitunas).

3. Estandarización técnica aplicada
- Geometría estricta (390 x 917 px): Se purgaron anchos residuales de 412 px y 100vw, eliminando desplazamientos horizontales no deseados en dispositivos móviles.
- Scroll sin bloqueos: Implementación de flex-1 min-h-0 en los contenedores centrales para garantizar scroll suave e interactivo sin recortes en las comidas inferiores o botones finales.
- Componentes anclados: Encabezados superiores (header) y barras de estado / navegación inferior (footer/nav) configurados como elementos fijos (shrink-0 y z-index controlado).
- Modularidad CSS: Todas las plantillas importan Tailwind CSS vía CDN, permitiendo abrir y testear cada archivo .html directamente en cualquier navegador de forma visual.

4. Próxima fase
- Unificar la lógica y los selectores de los acordeones dentro de una vista dinámica integrada en index.html.
- Conectar los eventos de "+ Añadir" y "⇄ Reemplazar" con las estructuras de datos de js/data.js y las funciones de js/app.js.
