/* ==========================================================
   perfil-coach-ui.js — perfil del coach
   Muestra el @usuario, el email y cuántos clientes tiene vinculados, y
   permite cerrar sesión.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import '../utils/navegacion.js';

export const SELECTORES = {
  perfilUsuario: '#perfil-usuario',
  perfilIniciales: '#perfil-iniciales',
  perfilEmail: '#perfil-email',
  mensajePerfil: '#mensaje-perfil',
  cantidadClientes: '#cantidad-clientes',
  cerrarSesion: '#cerrar-sesion'
};

const el = (sel) => document.querySelector(sel);

function mostrarError(texto) {
  const usuarioEl = el(SELECTORES.perfilUsuario);
  if (usuarioEl) usuarioEl.textContent = 'Tu perfil';
  const mensajeEl = el(SELECTORES.mensajePerfil);
  if (mensajeEl) {
    mensajeEl.textContent = texto;
    mensajeEl.hidden = false;
  }
}

async function mostrarCantidadClientes(coachId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId);
  if (error) return;
  const cantEl = el(SELECTORES.cantidadClientes);
  if (!cantEl) return;
  if (count === 0) cantEl.textContent = 'Todavía no tenés clientes';
  else cantEl.textContent = count === 1 ? '1 cliente vinculado' : `${count} clientes vinculados`;
}

const btnCerrar = el(SELECTORES.cerrarSesion);
if (btnCerrar) {
  btnCerrar.addEventListener('click', () => {
    btnCerrar.disabled = true;
    cerrarSesion();
  });
}

async function cargar() {
  const cuenta = await exigirRol('coach', 'username, email');
  if (!cuenta) return;
  const { perfil } = cuenta;
  if (!perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  const usuario = nombreDe(perfil);
  const usuarioEl = el(SELECTORES.perfilUsuario);
  if (usuarioEl) usuarioEl.textContent = usuario;
  const inicialesEl = el(SELECTORES.perfilIniciales);
  if (inicialesEl) inicialesEl.textContent = iniciales(usuario);
  const emailEl = el(SELECTORES.perfilEmail);
  if (emailEl) emailEl.textContent = perfil.email;
  await mostrarCantidadClientes(cuenta.usuarioId);
}

cargar();

