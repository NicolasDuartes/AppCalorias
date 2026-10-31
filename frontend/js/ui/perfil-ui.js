/* ==========================================================
   perfil-ui.js — datos de la cuenta en el perfil del alumno
   Muestra el @usuario, el ID de cliente (con botón para copiarlo), el coach
   vinculado y administra interactivamente las preferencias y restricciones.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';

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
  cerrarSesion: '#cerrar-sesion',
  listaPreferencias: '#lista-preferencias',
  btnAgregarPreferencia: '#btn-agregar-preferencia',
  modalPreferencia: '#modal-agregar-preferencia',
  formPreferencia: '#form-preferencia',
  inputPreferencia: '#input-preferencia',
  btnCerrarModalPref: '#btn-cerrar-modal-pref',
  btnCancelarPref: '#btn-cancelar-pref',
  tplPreferenciaItem: '#tpl-preferencia-item'
};

export const STORAGE_KEY_PREFERENCIAS = 'appcalorias_preferencias_alumno';
export const PREFERENCIAS_DEFAULT = ['Sin lactosa', 'No come pescado', 'Desayuna liviano'];

const el = (sel) => document.querySelector(sel);

export function obtenerPreferencias() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFERENCIAS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Si falla la lectura o parsing de sessionStorage
  }
  const inicialesDefault = [...PREFERENCIAS_DEFAULT];
  guardarPreferencias(inicialesDefault);
  return inicialesDefault;
}

export function guardarPreferencias(preferencias) {
  try {
    sessionStorage.setItem(STORAGE_KEY_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // Si sessionStorage no está disponible
  }
}

export function renderizarPreferencias(preferencias = obtenerPreferencias()) {
  const listaEl = el(SELECTORES.listaPreferencias);
  const tpl = el(SELECTORES.tplPreferenciaItem);
  if (!listaEl || !tpl) return;

  // Limpiar elementos de preferencia previos sin tocar el botón de agregar
  const existentes = listaEl.querySelectorAll('.preferencia');
  existentes.forEach((nodo) => nodo.remove());

  const btnAgregar = el(SELECTORES.btnAgregarPreferencia);

  preferencias.forEach((texto, index) => {
    const clon = tpl.content.cloneNode(true);
    const textoEl = clon.querySelector('[data-ref="texto"]');
    if (textoEl) {
      textoEl.textContent = texto;
    }
    const btnQuitar = clon.querySelector('button');
    if (btnQuitar) {
      btnQuitar.setAttribute('aria-label', `Quitar ${texto}`);
      btnQuitar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        eliminarPreferencia(index);
      });
    }

    if (btnAgregar && btnAgregar.parentNode === listaEl) {
      listaEl.insertBefore(clon, btnAgregar);
    } else {
      listaEl.appendChild(clon);
    }
  });
}

export function abrirModalPreferencia() {
  const modal = el(SELECTORES.modalPreferencia);
  if (!modal) return;
  modal.hidden = false;
  const input = el(SELECTORES.inputPreferencia);
  if (input) {
    input.value = '';
    input.focus();
  }
}

export function cerrarModalPreferencia() {
  const modal = el(SELECTORES.modalPreferencia);
  if (modal) {
    modal.hidden = true;
  }
  const form = el(SELECTORES.formPreferencia);
  if (form) {
    form.reset();
  }
  const btn = el(SELECTORES.btnAgregarPreferencia);
  if (btn) {
    btn.focus();
  }
}

export function agregarPreferencia(texto) {
  const limpio = (texto || '').trim();
  if (!limpio) return false;

  const preferencias = obtenerPreferencias();
  preferencias.push(limpio);
  guardarPreferencias(preferencias);
  renderizarPreferencias(preferencias);
  cerrarModalPreferencia();
  mostrarAvisoFlotante('Preferencia agregada.');
  return true;
}

export function eliminarPreferencia(index) {
  const preferencias = obtenerPreferencias();
  if (index >= 0 && index < preferencias.length) {
    preferencias.splice(index, 1);
    guardarPreferencias(preferencias);
    renderizarPreferencias(preferencias);
    mostrarAvisoFlotante('Preferencia eliminada.');
  }
}

export function inicializarPreferencias() {
  const preferencias = obtenerPreferencias();
  renderizarPreferencias(preferencias);

  const btnAbrir = el(SELECTORES.btnAgregarPreferencia);
  if (btnAbrir && !btnAbrir.dataset.inicializado) {
    btnAbrir.dataset.inicializado = 'true';
    btnAbrir.addEventListener('click', abrirModalPreferencia);
  }

  const btnCerrar = el(SELECTORES.btnCerrarModalPref);
  if (btnCerrar && !btnCerrar.dataset.inicializado) {
    btnCerrar.dataset.inicializado = 'true';
    btnCerrar.addEventListener('click', cerrarModalPreferencia);
  }

  const btnCancelar = el(SELECTORES.btnCancelarPref);
  if (btnCancelar && !btnCancelar.dataset.inicializado) {
    btnCancelar.dataset.inicializado = 'true';
    btnCancelar.addEventListener('click', cerrarModalPreferencia);
  }

  const formPref = el(SELECTORES.formPreferencia);
  if (formPref && !formPref.dataset.inicializado) {
    formPref.dataset.inicializado = 'true';
    formPref.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputPref = el(SELECTORES.inputPreferencia);
      const texto = inputPref ? inputPref.value : '';
      agregarPreferencia(texto);
    });
  }

  const modalEl = el(SELECTORES.modalPreferencia);
  if (modalEl && !modalEl.dataset.inicializado) {
    modalEl.dataset.inicializado = 'true';
    modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cerrarModalPreferencia();
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

// Inicializar preferencias interactivas inmediatamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPreferencias);
} else {
  inicializarPreferencias();
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
