/* ==========================================================
   texto.js — cómo se muestra el nombre de una cuenta
   ========================================================== */

// El @usuario; si la cuenta no tiene, la parte del correo antes de la @
export function nombreDe(perfil) {
  return perfil.username || perfil.email.split('@')[0];
}

// "benja.blason" → "BB"; "martina" → "MA"
export function iniciales(usuario) {
  const partes = usuario.split(/[._]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : usuario.slice(0, 2);
  return letras.toUpperCase();
}
