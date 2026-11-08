/* ==========================================================
   formato-calc.js — Utilidades puras de normalización y formateo numérico
   - Sanitización de entradas con soporte transparente de coma y punto decimal.
   - Formateo localizado en español (es-AR) para energía y macronutrientes.
   Módulo puro: sin dependencias de DOM ni efectos secundarios.
   ========================================================== */

/**
 * Normaliza una cadena de texto numérico eliminando caracteres no válidos
 * y unificando comas en puntos decimales. Preserva como máximo un único punto.
 *
 * @param {string|number|null|undefined} valor - Texto o número ingresado por el usuario.
 * @returns {string} Cadena sanitizada lista para parseo numérico.
 *
 * @example
 * // Caso normal: reemplazar coma decimal por punto
 * normalizarDecimal('12,5'); // -> "12.5"
 *
 * @example
 * // Caso especial: múltiples separadores, inicio con coma o entrada nula
 * normalizarDecimal('12..3'); // -> "12.3"
 * normalizarDecimal(',5');    // -> "0.5"
 * normalizarDecimal(null);    // -> ""
 *
 * @note Edge cases:
 * - Si `valor` es `null`, `undefined` o solo espacios en blanco, retorna `""`.
 * - Si comienza directamente con coma o punto (`",5"` o `".5"`), antepone `"0"` (`"0.5"`).
 * - Filtra signos negativos y notación científica (`"-45e2"` -> `"452"`).
 */
export function normalizarDecimal(valor) {
  if (valor === null || valor === undefined) return '';
  const str = String(valor).trim();
  if (!str) return '';

  // 1. Convertir comas a puntos
  const conPuntos = str.replace(/,/g, '.');

  // 2. Conservar únicamente dígitos y puntos decimales
  const soloDigitosYPunto = conPuntos.replace(/[^0-9.]/g, '');

  // 3. Garantizar un único punto decimal (y anteponer 0 si comienza directamente con separador decimal)
  const partes = soloDigitosYPunto.split('.');
  if (partes.length > 1) {
    const parteEntera = partes[0] === '' ? '0' : partes[0];
    return `${parteEntera}.${partes.slice(1).join('')}`;
  }
  return soloDigitosYPunto;
}

/**
 * Formatea un valor energético como número entero redondeado con separador de miles
 * conforme a la convención regional `es-AR`.
 *
 * @param {number|string|null|undefined} kcal - Cantidad de kilocalorías a formatear.
 * @returns {string} Cadena numérica entera con separador de miles (ej. `"2.060"`).
 *
 * @example
 * // Caso normal: número decimal o entero mayor a mil
 * formatearKcal(2059.7); // -> "2.060"
 *
 * @example
 * // Caso especial: cadena con coma decimal o valor nulo/inválido
 * formatearKcal("1450,4"); // -> "1.450"
 * formatearKcal(null);     // -> "0"
 *
 * @note Edge cases:
 * - Valores `null`, `undefined`, `NaN` o cadenas vacías se convierten de forma segura en `"0"`.
 */
export function formatearKcal(kcal) {
  const val = typeof kcal === 'string' ? kcal.trim().replace(/,/g, '.') : kcal;
  const num = Math.round(Number(val) || 0);
  return num.toLocaleString('es-AR');
}

/**
 * Formatea una masa en gramos utilizando coma decimal y hasta la cantidad máxima
 * de decimales indicada, omitiendo ceros fraccionarios superfluos.
 *
 * @param {number|string|null|undefined} gramos - Cantidad en gramos a formatear.
 * @param {number} [decimales=1] - Cantidad máxima de posiciones decimales visibles.
 * @returns {string} Cadena formateada en convención `es-AR` (ej. `"14,5"` o `"100"`).
 *
 * @example
 * // Caso normal: cantidad fraccionaria con 1 decimal por defecto
 * formatearGramos(14.52); // -> "14,5"
 *
 * @example
 * // Caso especial: número entero exacto o precisión personalizada
 * formatearGramos(100.0);    // -> "100"
 * formatearGramos(7.256, 2); // -> "7,26"
 *
 * @note Edge cases:
 * - Si `gramos` es una cadena con coma (`"12,5"`) la normaliza antes de formatear; si no es numérica, devuelve `"0"`.
 */
export function formatearGramos(gramos, decimales = 1) {
  const val = typeof gramos === 'string' ? gramos.trim().replace(/,/g, '.') : gramos;
  const num = Number(val) || 0;
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
}
