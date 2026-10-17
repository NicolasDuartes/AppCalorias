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
 * @param {string|number} valor - Texto ingresado por el usuario.
 * @returns {string} Cadena sanitizada lista para parseo numérico.
 * @example
 * normalizarDecimal("12,5") // "12.5"
 * normalizarDecimal("12..3") // "12.3"
 * normalizarDecimal("-45e2") // "452"
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
 * Formatea un valor calórico como entero con separador de miles en español.
 * @param {number|string} kcal - Cantidad de calorías.
 * @returns {string} Texto formateado (ej. "2.060").
 */
export function formatearKcal(kcal) {
  const val = typeof kcal === 'string' ? kcal.trim().replace(/,/g, '.') : kcal;
  const num = Math.round(Number(val) || 0);
  return num.toLocaleString('es-AR');
}

/**
 * Formatea una cantidad en gramos con hasta la cantidad de decimales especificada,
 * usando coma decimal conforme a la convención en español.
 * @param {number|string} gramos - Cantidad en gramos.
 * @param {number} [decimales=1] - Cantidad máxima de decimales.
 * @returns {string} Texto formateado (ej. "14,5" o "100").
 */
export function formatearGramos(gramos, decimales = 1) {
  const val = typeof gramos === 'string' ? gramos.trim().replace(/,/g, '.') : gramos;
  const num = Number(val) || 0;
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
}
