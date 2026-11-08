/* ==========================================================
   texto.js — Formateo de nombres visibles e iniciales de cuenta
   ========================================================== */

/**
 * Obtiene el identificador visible de un usuario priorizando su `@username`
 * y recurriendo a la parte local de su correo electrónico si no tiene usuario definido.
 *
 * @param {{ username?: string|null, email?: string|null }} perfil - Objeto de perfil de la cuenta.
 * @returns {string} Nombre de usuario visible sin el prefijo `@`.
 *
 * @example
 * // Caso normal: perfil con username configurado
 * nombreDe({ username: 'benja.blason', email: 'benja@mail.com' }); // -> "benja.blason"
 *
 * @example
 * // Caso especial: perfil sin username, extrae el alias previo al símbolo '@'
 * nombreDe({ username: '', email: 'martina.gomez@dominio.com' }); // -> "martina.gomez"
 *
 * @note Edge cases:
 * - Si `username` es vacío o `null`, divide `email` por `'@'` y retorna el primer segmento.
 */
export function nombreDe(perfil) {
  return perfil.username || perfil.email.split('@')[0];
}

/**
 * Genera un monograma de dos letras en mayúsculas a partir de un identificador de usuario,
 * tomando las iniciales de los dos primeros términos separados por punto o guion bajo,
 * o los dos primeros caracteres si consta de una sola palabra.
 *
 * @param {string} usuario - Nombre de usuario o alias de cuenta.
 * @returns {string} Dos letras en mayúsculas para mostrar en avatares.
 *
 * @example
 * // Caso normal: usuario compuesto separado por punto o guion bajo
 * iniciales('benja.blason'); // -> "BB"
 *
 * @example
 * // Caso especial: usuario de una sola palabra sin separadores
 * iniciales('martina'); // -> "MA"
 *
 * @note Edge cases:
 * - Múltiples separadores consecutivos (`..` o `__`) se filtran con `.filter(Boolean)` evitando índices `undefined`.
 */
export function iniciales(usuario) {
  const partes = usuario.split(/[._]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : usuario.slice(0, 2);
  return letras.toUpperCase();
}
