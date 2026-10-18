/* ==========================================================
   perfil-ui.js — datos de la cuenta en el perfil del alumno
   Muestra el @usuario, el ID de cliente (con botón para copiarlo) y el coach
   vinculado. El resto del perfil (objetivo, preferencias, etc.) sigue siendo
   maqueta hasta que esos datos estén en la base.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import '../utils/navegacion.js';

export const SELECTORES = {
  perfilUsuario: '#perfil-usuario',
  perfilIniciales: '#perfil-iniciales',
  perfilDatos: '#perfil-datos',
  codigoCliente: '#codigo-cliente',
  copiarCodigo: '#copiar-codigo',
  copiarTexto: '#copiar-texto',
  coachVinculado: '#coach-vinculado',
  coachSinVincular: '#coach-sin-vincular',
  coachIniciales: '#coach-iniciales',
  coachUsuario: '#coach-usuario',
  mensajePerfil: '#mensaje-perfil',
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

function mostrarCuenta(perfil) {
  const usuario = nombreDe(perfil);
  const usuarioEl = el(SELECTORES.perfilUsuario);
  if (usuarioEl) usuarioEl.textContent = usuario;
  const inicialesEl = el(SELECTORES.perfilIniciales);
  if (inicialesEl) inicialesEl.textContent = iniciales(usuario);
  const codigoEl = el(SELECTORES.codigoCliente);
  if (codigoEl) codigoEl.textContent = perfil.client_code;
  const copiarEl = el(SELECTORES.copiarCodigo);
  if (copiarEl) copiarEl.disabled = false;
}

async function mostrarCoach(coachId) {
  if (!coachId) {
    const sinCoachEl = el(SELECTORES.coachSinVincular);
    if (sinCoachEl) sinCoachEl.hidden = false;
    return;
  }
  const { data: coach, error } = await supabase
    .from('profiles')
    .select('username, email')
    .eq('id', coachId)
    .single();
  if (error) {
    mostrarError('No se pudo cargar el coach. Volvé a abrir la pantalla.');
    return;
  }
  const usuario = nombreDe(coach);
  const coachUsuarioEl = el(SELECTORES.coachUsuario);
  if (coachUsuarioEl) coachUsuarioEl.textContent = usuario;
  const coachInicialesEl = el(SELECTORES.coachIniciales);
  if (coachInicialesEl) coachInicialesEl.textContent = iniciales(usuario);
  const vinculadoEl = el(SELECTORES.coachVinculado);
  if (vinculadoEl) vinculadoEl.hidden = false;
}

// Copiar el ID de cliente
const botonCopiar = el(SELECTORES.copiarCodigo);
if (botonCopiar) {
  botonCopiar.addEventListener('click', async () => {
    const codigoEl = el(SELECTORES.codigoCliente);
    const copiarTextoEl = el(SELECTORES.copiarTexto);
    const codigo = codigoEl ? codigoEl.textContent : '';
    try {
      await navigator.clipboard.writeText(codigo);
      if (copiarTextoEl) copiarTextoEl.textContent = 'Copiado';
    } catch {
      // Sin permiso de portapapeles: se selecciona el código para copiarlo a mano
      if (codigoEl) window.getSelection().selectAllChildren(codigoEl);
      if (copiarTextoEl) copiarTextoEl.textContent = 'Seleccionado';
    }
    setTimeout(() => {
      if (copiarTextoEl) copiarTextoEl.textContent = 'Copiar';
    }, 2000);
  });
}

const botonCerrar = el(SELECTORES.cerrarSesion);
if (botonCerrar) {
  botonCerrar.addEventListener('click', cerrarSesion);
}

async function cargar() {
  const cuenta = await exigirRol('alumno', 'username, email, client_code, coach_id');
  if (!cuenta) return;
  const { perfil } = cuenta;
  if (!perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  mostrarCuenta(perfil);
  await mostrarCoach(perfil.coach_id);
}

cargar();

