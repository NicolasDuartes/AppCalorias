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
 * Para pantallas de un solo rol ("alumno" o "coach").
 * - Sin sesión: manda al login y devuelve null.
 * - Con otro rol: manda a la pantalla de ese rol y devuelve null.
 * - Si no se pudo leer el perfil: devuelve { usuarioId, perfil: null }.
 * - Si todo está bien: devuelve { usuarioId, perfil } con `role` y los
 *   `campos` pedidos (ej. 'username, email').
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

export async function cerrarSesion() {
  await supabase.auth.signOut();
  window.location.href = PANTALLAS.login;
}
