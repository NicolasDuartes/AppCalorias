/* ==========================================================
   perfil-coach-ui.js — perfil del coach
   Muestra el @usuario, el email y cuántos clientes tiene vinculados, y
   permite cerrar sesión.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';

const LOGIN = '../../index.html';
const PANTALLA_ALUMNO = '../alumno/perfil.html';

const el = (id) => document.getElementById(id);

// "benja.blason" → "BB"; "martina" → "MA"
function iniciales(usuario) {
  const partes = usuario.split(/[._]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : usuario.slice(0, 2);
  return letras.toUpperCase();
}

function mostrarError(texto) {
  el('perfil-usuario').textContent = 'Tu perfil';
  el('mensaje-perfil').textContent = texto;
  el('mensaje-perfil').hidden = false;
}

async function mostrarCantidadClientes(coachId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId);
  if (error) return;
  if (count === 0) el('cantidad-clientes').textContent = 'Todavía no tenés clientes';
  else el('cantidad-clientes').textContent = count === 1 ? '1 cliente vinculado' : `${count} clientes vinculados`;
}

el('cerrar-sesion').addEventListener('click', async () => {
  el('cerrar-sesion').disabled = true;
  await supabase.auth.signOut();
  window.location.href = LOGIN;
});

async function cargar() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = LOGIN;
    return;
  }

  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('username, email, role')
    .eq('id', session.user.id)
    .single();

  if (error || !perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  if (perfil.role !== 'coach') {
    window.location.href = PANTALLA_ALUMNO;
    return;
  }

  const usuario = perfil.username || perfil.email.split('@')[0];
  el('perfil-usuario').textContent = usuario;
  el('perfil-iniciales').textContent = iniciales(usuario);
  el('perfil-email').textContent = perfil.email;
  await mostrarCantidadClientes(session.user.id);
}

cargar();
