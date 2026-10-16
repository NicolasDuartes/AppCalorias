/* ==========================================================
   perfil-coach-ui.js — perfil del coach
   Muestra el @usuario, el email y cuántos clientes tiene vinculados, y
   permite cerrar sesión.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';

const el = (id) => document.getElementById(id);

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

el('cerrar-sesion').addEventListener('click', () => {
  el('cerrar-sesion').disabled = true;
  cerrarSesion();
});

async function cargar() {
  const cuenta = await exigirRol('coach', 'username, email');
  if (!cuenta) return;
  const { perfil } = cuenta;
  if (!perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  const usuario = nombreDe(perfil);
  el('perfil-usuario').textContent = usuario;
  el('perfil-iniciales').textContent = iniciales(usuario);
  el('perfil-email').textContent = perfil.email;
  await mostrarCantidadClientes(cuenta.usuarioId);
}

cargar();
