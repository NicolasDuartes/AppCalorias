/* ==========================================================
   perfil-coach-ui.js — perfil del coach
   Muestra el @usuario, el email, cuántos clientes tiene vinculados,
   permite la edición interactiva del perfil y permite cerrar sesión.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';

export const SELECTORES = {
  perfilUsuario: '#perfil-usuario',
  perfilIniciales: '#perfil-iniciales',
  perfilEmail: '#perfil-email',
  mensajePerfil: '#mensaje-perfil',
  cantidadClientes: '#cantidad-clientes',
  cerrarSesion: '#cerrar-sesion',
  btnEditarPerfilCoach: '#btn-editar-perfil-coach',
  modalEditarPerfilCoach: '#modal-editar-perfil-coach',
  formEditarCoach: '#form-editar-coach',
  inputCoachNombre: '#input-coach-nombre',
  inputCoachEmail: '#input-coach-email',
  mensajeModalCoach: '#mensaje-modal-coach',
  btnCerrarModalCoach: '#btn-cerrar-modal-coach',
  btnCancelarCoach: '#btn-cancelar-coach',
  btnGuardarCoach: '#btn-guardar-coach'
};

export const STORAGE_KEY_PERFIL_COACH = 'appcalorias_perfil_coach';

let cuentaActual = null;
let perfilActual = { username: '', email: '' };

const el = (sel) => document.querySelector(sel);

export function obtenerPerfilCoachLocal() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PERFIL_COACH);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export function guardarPerfilCoachLocal(perfil) {
  try {
    sessionStorage.setItem(STORAGE_KEY_PERFIL_COACH, JSON.stringify(perfil));
  } catch (_) {}
}

export function validarDatosPerfilCoach({ nombre } = {}) {
  const nombreLimpio = (nombre || '').trim();
  if (!nombreLimpio) {
    return { valido: false, error: 'Ingresá un nombre o @usuario.' };
  }
  if (nombreLimpio.length > 30) {
    return { valido: false, error: 'El nombre no puede superar los 30 caracteres.' };
  }
  return { valido: true, error: null };
}

export function abrirModalEditarCoach() {
  const modal = el(SELECTORES.modalEditarPerfilCoach);
  if (!modal) return;

  const local = obtenerPerfilCoachLocal() || {};
  const inputNombre = el(SELECTORES.inputCoachNombre);
  const inputEmail = el(SELECTORES.inputCoachEmail);
  const mensajeError = el(SELECTORES.mensajeModalCoach);

  if (mensajeError) {
    mensajeError.hidden = true;
    mensajeError.textContent = '';
  }

  if (inputNombre) {
    if (local.username) {
      inputNombre.value = local.username;
    } else if (cuentaActual?.perfil?.username) {
      inputNombre.value = cuentaActual.perfil.username;
    } else {
      const actual = el(SELECTORES.perfilUsuario)?.textContent?.trim() || '';
      inputNombre.value = (actual && actual !== 'Cargando…' && actual !== 'Tu perfil') ? actual : '';
    }
  }

  if (inputEmail) {
    if (local.email) {
      inputEmail.value = local.email;
    } else if (cuentaActual?.perfil?.email) {
      inputEmail.value = cuentaActual.perfil.email;
    } else {
      const emailActual = el(SELECTORES.perfilEmail)?.textContent?.trim() || '';
      inputEmail.value = emailActual;
    }
  }

  modal.hidden = false;
  if (inputNombre) {
    inputNombre.focus();
  }
}

export function cerrarModalEditarCoach() {
  const modal = el(SELECTORES.modalEditarPerfilCoach);
  if (modal) {
    modal.hidden = true;
  }
  const mensajeError = el(SELECTORES.mensajeModalCoach);
  if (mensajeError) {
    mensajeError.hidden = true;
    mensajeError.textContent = '';
  }
  const btnGuardar = el(SELECTORES.btnGuardarCoach);
  if (btnGuardar) {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar cambios';
  }
  const btnEditar = el(SELECTORES.btnEditarPerfilCoach);
  if (btnEditar) {
    btnEditar.focus();
  }
}

export async function guardarPerfilCoach({ nombre } = {}) {
  const inputNombre = el(SELECTORES.inputCoachNombre);
  const nombreAValidar = nombre !== undefined ? nombre : (inputNombre ? inputNombre.value : '');
  const validacion = validarDatosPerfilCoach({ nombre: nombreAValidar });
  const mensajeEl = el(SELECTORES.mensajeModalCoach);
  const btnGuardar = el(SELECTORES.btnGuardarCoach);

  if (!validacion.valido) {
    if (mensajeEl) {
      mensajeEl.textContent = validacion.error;
      mensajeEl.hidden = false;
    }
    return { exito: false, error: validacion.error };
  }

  if (mensajeEl) {
    mensajeEl.hidden = true;
    mensajeEl.textContent = '';
  }

  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
  }

  const nombreLimpio = nombreAValidar.trim();

  try {
    const coachId = cuentaActual?.usuarioId;
    if (coachId && !(typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__)) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: nombreLimpio })
        .eq('id', coachId);
      if (error) {
        throw error;
      }
    }

    if (cuentaActual?.perfil) {
      cuentaActual.perfil.username = nombreLimpio;
    }

    const emailActual = el(SELECTORES.inputCoachEmail)?.value || el(SELECTORES.perfilEmail)?.textContent || perfilActual.email || '';
    perfilActual = {
      username: nombreLimpio,
      email: emailActual
    };
    guardarPerfilCoachLocal(perfilActual);

    const usuarioEl = el(SELECTORES.perfilUsuario);
    if (usuarioEl) usuarioEl.textContent = nombreLimpio;
    const inicialesEl = el(SELECTORES.perfilIniciales);
    if (inicialesEl) inicialesEl.textContent = iniciales(nombreLimpio);

    cerrarModalEditarCoach();
    mostrarAvisoFlotante('Perfil de coach actualizado.');
    return { exito: true };
  } catch (err) {
    console.warn('[perfil-coach-ui] Error al actualizar perfil:', err);
    if (mensajeEl) {
      mensajeEl.textContent = 'No se pudo guardar el perfil. Revisá tu conexión.';
      mensajeEl.hidden = false;
    }
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar cambios';
    }
    return { exito: false, error: err.message || 'Error de conexión' };
  }
}

export function inicializarEdicionPerfilCoach() {
  const btnEditar = el(SELECTORES.btnEditarPerfilCoach);
  if (btnEditar && !btnEditar.dataset.inicializado) {
    btnEditar.dataset.inicializado = 'true';
    btnEditar.addEventListener('click', abrirModalEditarCoach);
  }

  const btnCerrar = el(SELECTORES.btnCerrarModalCoach);
  if (btnCerrar && !btnCerrar.dataset.inicializado) {
    btnCerrar.dataset.inicializado = 'true';
    btnCerrar.addEventListener('click', cerrarModalEditarCoach);
  }

  const btnCancelar = el(SELECTORES.btnCancelarCoach);
  if (btnCancelar && !btnCancelar.dataset.inicializado) {
    btnCancelar.dataset.inicializado = 'true';
    btnCancelar.addEventListener('click', cerrarModalEditarCoach);
  }

  const formEditar = el(SELECTORES.formEditarCoach);
  if (formEditar && !formEditar.dataset.inicializado) {
    formEditar.dataset.inicializado = 'true';
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputNombre = el(SELECTORES.inputCoachNombre);
      const nombre = inputNombre ? inputNombre.value : '';
      await guardarPerfilCoach({ nombre });
    });
  }

  const modalEl = el(SELECTORES.modalEditarPerfilCoach);
  if (modalEl && !modalEl.dataset.inicializado) {
    modalEl.dataset.inicializado = 'true';
    modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cerrarModalEditarCoach();
      }
    });
  }
}

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
  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    const cantEl = el(SELECTORES.cantidadClientes);
    if (cantEl) cantEl.textContent = 'Todavía no tenés clientes';
    return;
  }
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

// Inicializar edición interactiva inmediatamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarEdicionPerfilCoach);
} else {
  inicializarEdicionPerfilCoach();
}

export async function cargar() {
  const cuenta = await exigirRol('coach', 'username, email');
  if (!cuenta) return;
  cuentaActual = cuenta;
  const { perfil } = cuenta;
  if (!perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  const local = obtenerPerfilCoachLocal();
  const nombreFallback = perfil.username || (perfil.email ? nombreDe(perfil) : '') || 'Coach';
  const usuario = (local && local.username) ? local.username : nombreFallback;
  const email = (local && local.email) ? local.email : (perfil.email || '');

  perfilActual = { username: usuario, email };
  guardarPerfilCoachLocal(perfilActual);

  const usuarioEl = el(SELECTORES.perfilUsuario);
  if (usuarioEl) usuarioEl.textContent = usuario;
  const inicialesEl = el(SELECTORES.perfilIniciales);
  if (inicialesEl) inicialesEl.textContent = iniciales(usuario);
  const emailEl = el(SELECTORES.perfilEmail);
  if (emailEl) emailEl.textContent = email;

  if (cuenta.usuarioId && !(typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__)) {
    await mostrarCantidadClientes(cuenta.usuarioId);
  } else {
    const cantEl = el(SELECTORES.cantidadClientes);
    if (cantEl) cantEl.textContent = 'Todavía no tenés clientes';
  }
}

cargar();
