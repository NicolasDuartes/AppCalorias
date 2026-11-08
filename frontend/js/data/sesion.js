/* ==========================================================
   sesion.js — quién está logueado y a qué pantallas puede entrar
   Lo usan todas las pantallas que necesitan una cuenta. Los permisos reales
   los controla la base (RLS): esto solo decide a qué pantalla mandar.
   ========================================================== */
import { supabase } from './supabase.js';

// Rutas armadas desde este archivo (js/data/), no desde la URL de la página:
// así funcionan aunque el servidor abra las páginas desde otra ruta
export const PANTALLAS = {
  login: new URL('../../index.html', import.meta.url).href,
  alumno: new URL('../../pages/alumno/dashboard.html', import.meta.url).href,
  coach: new URL('../../pages/coach/clientes.html', import.meta.url).href,
};

/**
 * Verifica que exista una sesión activa en Supabase Auth y que el usuario posea el rol requerido.
 * Si no hay sesión, redirige al login preservando la ruta actual en `?redirect_to=`.
 * Si el usuario tiene un rol distinto al exigido, redirige a la portada de su rol.
 *
 * @param {'alumno'|'coach'} rol - Rol obligatorio para acceder a la pantalla actual.
 * @param {string} [campos=''] - Lista separada por comas de columnas adicionales a consultar en `public.profiles` (ej. `'username, client_code'`).
 * @returns {Promise<{ usuarioId: string, perfil: Object|null }|null>} Datos de sesión y perfil, o `null` si se redirigió fuera de la vista.
 *
 * @example
 * // Caso normal: exigir rol de alumno solicitando campos adicionales del perfil
 * const sesion = await exigirRol('alumno', 'username, client_code, coach_id');
 * // -> { usuarioId: "uuid-123", perfil: { role: "alumno", username: "lucas", ... } }
 *
 * @example
 * // Caso especial: ejecución en entorno de pruebas automatizadas con bypass activo
 * window.__TEST_BYPASS_AUTH__ = true;
 * const sesionTest = await exigirRol('coach');
 * // -> { usuarioId: "test-user", perfil: { role: "coach" } }
 *
 * @note Edge cases:
 * - Sin sesión activa: redirige a `index.html?redirect_to=...` y retorna `null`.
 * - Error al leer `profiles` con sesión válida: retorna `{ usuarioId, perfil: null }` sin expulsar al usuario.
 */
export async function exigirRol(rol, campos = '') {
  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    return { usuarioId: 'test-user', perfil: { role: rol } };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    if (typeof window !== 'undefined') {
      try {
        const rutaActual = window.location.pathname + window.location.search + window.location.hash;
        const destino = new URL(PANTALLAS.login);
        destino.searchParams.set('redirect_to', rutaActual);
        window.location.href = destino.href;
      } catch {
        window.location.href = PANTALLAS.login;
      }
    }
    return null;
  }

  const seleccion = ['role', ...campos.split(',').map((c) => c.trim()).filter(Boolean)].join(', ');
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select(seleccion)
    .eq('id', session.user.id)
    .single();

  if (error || !perfil) return { usuarioId: session.user.id, perfil: null };
  if (perfil.role !== rol) {
    window.location.href = PANTALLAS[perfil.role] ?? PANTALLAS.login;
    return null;
  }
  return { usuarioId: session.user.id, perfil };
}

/**
 * Cierra la sesión activa en Supabase Auth (o en el Mock Store offline)
 * y redirige inmediatamente al usuario a la pantalla de inicio de sesión.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Caso normal: cerrar sesión desde el botón de salida del perfil
 * await cerrarSesion();
 *
 * @example
 * // Caso especial: vincular directamente como manejador de evento click
 * btnSalir.addEventListener('click', () => cerrarSesion());
 */
export async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = PANTALLAS.login;
}
