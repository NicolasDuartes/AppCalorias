/* ==========================================================
   plan-defecto.js — Datos de alimentos por defecto según comida
   - Provee la estructura inicial de alimentos del plan activo
     para las 4 comidas principales: Desayuno, Almuerzo, Merienda y Cena.
   - Utilizado como fallback en agregar-ui.js y pruebas offline.
   Módulo ES puro: sin dependencias del DOM.
   ========================================================== */

/**
 * Alimentos sugeridos por defecto para cada comida del plan.
 * Cada elemento incluye título, descripción resumida de macros, porción y valores cuantitativos.
 */
export const ALIMENTOS_PLAN_DEFECTO = {
  'Desayuno': {
    titulo: 'Avena con leche y fruta',
    linea: '464 kcal · P 31 · C 53 · G 14',
    cantidad: '1 porción (250 g)',
    kcal: 464,
    p: 31,
    c: 53,
    g: 14,
    gramos: 250
  },
  'Almuerzo': {
    titulo: 'Pechuga de pollo con arroz',
    linea: '570 kcal · P 51 · C 50 · G 16',
    cantidad: '1 porción (350 g)',
    kcal: 570,
    p: 51,
    c: 50,
    g: 16,
    gramos: 350
  },
  'Merienda': {
    titulo: 'Yogur griego con frutos secos',
    linea: '388 kcal · P 21 · C 38 · G 19',
    cantidad: '1 porción (200 g)',
    kcal: 388,
    p: 21,
    c: 38,
    g: 19,
    gramos: 200
  },
  'Cena': {
    titulo: 'Lomo vacuno con batata',
    linea: '545 kcal · P 38 · C 52 · G 20',
    cantidad: '1 porción (300 g)',
    kcal: 545,
    p: 38,
    c: 52,
    g: 20,
    gramos: 300
  }
};
