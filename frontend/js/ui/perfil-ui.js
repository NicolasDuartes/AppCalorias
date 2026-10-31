/* ==========================================================
   perfil-ui.js — datos de la cuenta en el perfil del alumno
   Muestra el @usuario, el ID de cliente (con botón para copiarlo), el coach
   vinculado, administra interactivamente las preferencias y restricciones,
   y permite la edición interactiva del perfil (nombre, edad y altura).
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { cerrarSesion, exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import { obtenerUltimoContexto } from '../data/contexto-api.js';
import { configurarModalAccesible, activarTrampaFoco, liberarTrampaFoco } from '../utils/accesibilidad.js';

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
  tplPreferenciaItem: '#tpl-preferencia-item',
  btnEditarPerfil: '#btn-editar-perfil',
  modalEditarPerfil: '#modal-editar-perfil',
  formEditarPerfil: '#form-editar-perfil',
  inputPerfilNombre: '#input-perfil-nombre',
  inputPerfilEdad: '#input-perfil-edad',
  inputPerfilAltura: '#input-perfil-altura',
  mensajeModalPerfil: '#mensaje-modal-perfil',
  btnCerrarModalPerfil: '#btn-cerrar-modal-perfil',
  btnCancelarPerfil: '#btn-cancelar-perfil',
  btnGuardarPerfil: '#btn-guardar-perfil'
};

export const STORAGE_KEY_PREFERENCIAS = 'appcalorias_preferencias_alumno';
export const STORAGE_KEY_PERFIL_ALUMNO = 'appcalorias_perfil_alumno';
export const PREFERENCIAS_DEFAULT = ['Sin lactosa', 'No come pescado', 'Desayuna liviano'];

let cuentaActual = null;
let contextoActual = null;

const el = (sel) => document.querySelector(sel);

export function obtenerPerfilAlumnoLocal() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PERFIL_ALUMNO);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export function guardarPerfilAlumnoLocal(perfil) {
  try {
    sessionStorage.setItem(STORAGE_KEY_PERFIL_ALUMNO, JSON.stringify(perfil));
  } catch (_) {}
}

export function formatearDatosPerfil({ edad, altura } = {}) {
  const partes = [];
  if (edad !== undefined && edad !== null && String(edad).trim() !== '') {
    partes.push(`${edad} años`);
  }
  if (altura !== undefined && altura !== null && String(altura).trim() !== '') {
    partes.push(`${altura} cm`);
  }
  return partes.join(' · ');
}

export function actualizarPerfilDatosDOM(datos = {}) {
  const perfilDatosEl = el(SELECTORES.perfilDatos);
  if (!perfilDatosEl) return;
  const texto = formatearDatosPerfil(datos);
  if (texto) {
    perfilDatosEl.textContent = texto;
    perfilDatosEl.hidden = false;
  } else {
    perfilDatosEl.textContent = '';
    perfilDatosEl.hidden = true;
  }
}

export function validarDatosPerfil({ nombre, edad, altura } = {}) {
  const nombreLimpio = (nombre || '').trim();
  if (!nombreLimpio) {
    return { valido: false, error: 'Ingresá un nombre o usuario.' };
  }
  if (nombreLimpio.length > 30) {
    return { valido: false, error: 'El nombre no puede superar los 30 caracteres.' };
  }

  if (edad !== undefined && edad !== null && String(edad).trim() !== '') {
    const edadNum = Number(edad);
    if (!Number.isInteger(edadNum) || edadNum < 12 || edadNum > 100) {
      return { valido: false, error: 'La edad debe ser un número entero entre 12 y 100 años.' };
    }
  }

  if (altura !== undefined && altura !== null && String(altura).trim() !== '') {
    const alturaNum = Number(altura);
    if (isNaN(alturaNum) || alturaNum < 100 || alturaNum > 250) {
      return { valido: false, error: 'La altura debe estar entre 100 y 250 cm.' };
    }
  }

  return { valido: true, error: null };
}

export function abrirModalEditarPerfil() {
  const modal = el(SELECTORES.modalEditarPerfil);
  if (!modal) return;

  const local = obtenerPerfilAlumnoLocal() || {};
  const inputNombre = el(SELECTORES.inputPerfilNombre);
  const inputEdad = el(SELECTORES.inputPerfilEdad);
  const inputAltura = el(SELECTORES.inputPerfilAltura);
  const mensajeError = el(SELECTORES.mensajeModalPerfil);

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

  if (inputEdad) {
    if (local.edad !== undefined && local.edad !== null) {
      inputEdad.value = local.edad;
    } else if (contextoActual?.edad_anios) {
      inputEdad.value = contextoActual.edad_anios;
    } else {
      inputEdad.value = '';
    }
  }

  if (inputAltura) {
    if (local.altura !== undefined && local.altura !== null) {
      inputAltura.value = local.altura;
    } else if (contextoActual?.altura_cm) {
      inputAltura.value = contextoActual.altura_cm;
    } else {
      inputAltura.value = '';
    }
  }

  activarTrampaFoco(modal, {
    elementoInicial: inputNombre,
    disparador: el(SELECTORES.btnEditarPerfil)
  });
}

export function cerrarModalEditarPerfil() {
  const modal = el(SELECTORES.modalEditarPerfil);
  if (modal) {
    liberarTrampaFoco(modal);
  }
  const mensajeError = el(SELECTORES.mensajeModalPerfil);
  if (mensajeError) {
    mensajeError.hidden = true;
    mensajeError.textContent = '';
  }
  const btnGuardar = el(SELECTORES.btnGuardarPerfil);
  if (btnGuardar) {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar cambios';
  }
  const btnEditar = el(SELECTORES.btnEditarPerfil);
  if (btnEditar && typeof btnEditar.focus === 'function') {
    btnEditar.focus();
  }
}

export async function guardarPerfil({ nombre, edad, altura } = {}) {
  const validacion = validarDatosPerfil({ nombre, edad, altura });
  const mensajeEl = el(SELECTORES.mensajeModalPerfil);
  const btnGuardar = el(SELECTORES.btnGuardarPerfil);

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

  const nombreLimpio = nombre.trim();
  const edadNum = (edad !== undefined && edad !== null && String(edad).trim() !== '') ? parseInt(edad, 10) : null;
  const alturaNum = (altura !== undefined && altura !== null && String(altura).trim() !== '') ? parseInt(altura, 10) : null;

  try {
    const usuarioId = cuentaActual?.usuarioId;
    if (usuarioId && !(typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__)) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: nombreLimpio })
        .eq('id', usuarioId);
      if (error) {
        throw error;
      }
    }

    if (cuentaActual?.perfil) {
      cuentaActual.perfil.username = nombreLimpio;
    }

    const nuevoPerfilLocal = {
      username: nombreLimpio,
      edad: edadNum,
      altura: alturaNum
    };
    guardarPerfilAlumnoLocal(nuevoPerfilLocal);

    if (contextoActual) {
      if (edadNum !== null) contextoActual.edad_anios = edadNum;
      if (alturaNum !== null) contextoActual.altura_cm = alturaNum;
    }

    const usuarioEl = el(SELECTORES.perfilUsuario);
    if (usuarioEl) usuarioEl.textContent = nombreLimpio;
    const inicialesEl = el(SELECTORES.perfilIniciales);
    if (inicialesEl) inicialesEl.textContent = iniciales(nombreLimpio);

    actualizarPerfilDatosDOM({ edad: edadNum, altura: alturaNum });

    cerrarModalEditarPerfil();
    mostrarAvisoFlotante('Perfil actualizado con éxito.');
    return { exito: true };
  } catch (err) {
    console.warn('[perfil-ui] Error al actualizar perfil:', err);
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

export function inicializarEdicionPerfil() {
  const modalEl = el(SELECTORES.modalEditarPerfil);
  const btnEditar = el(SELECTORES.btnEditarPerfil);
  const btnCerrar = el(SELECTORES.btnCerrarModalPerfil);
  const btnCancelar = el(SELECTORES.btnCancelarPerfil);

  if (modalEl && !modalEl.dataset.accesibleInicializado) {
    modalEl.dataset.accesibleInicializado = 'true';
    configurarModalAccesible(modalEl, {
      btnAbrir: btnEditar,
      btnCerrar: [btnCerrar, btnCancelar],
      primerEnfocable: SELECTORES.inputPerfilNombre,
      alAbrir: () => {
        abrirModalEditarPerfil();
      },
      alCerrar: () => {
        cerrarModalEditarPerfil();
      }
    });
  }

  const formEditar = el(SELECTORES.formEditarPerfil);
  if (formEditar && !formEditar.dataset.inicializado) {
    formEditar.dataset.inicializado = 'true';
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputNombre = el(SELECTORES.inputPerfilNombre);
      const inputEdad = el(SELECTORES.inputPerfilEdad);
      const inputAltura = el(SELECTORES.inputPerfilAltura);

      const nombre = inputNombre ? inputNombre.value : '';
      const edad = inputEdad ? inputEdad.value : '';
      const altura = inputAltura ? inputAltura.value : '';

      await guardarPerfil({ nombre, edad, altura });
    });
  }
}

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
  const input = el(SELECTORES.inputPreferencia);
  if (input) {
    input.value = '';
  }
  const disparador = el(SELECTORES.btnAgregarPreferencia) || document.querySelector('#btn-abrir-modal-preferencia');
  activarTrampaFoco(modal, {
    elementoInicial: input,
    disparador
  });
}

export function cerrarModalPreferencia() {
  const modal = el(SELECTORES.modalPreferencia);
  if (modal) {
    liberarTrampaFoco(modal);
  }
  const form = el(SELECTORES.formPreferencia);
  if (form) {
    form.reset();
  }
  const btn = el(SELECTORES.btnAgregarPreferencia) || document.querySelector('#btn-abrir-modal-preferencia');
  if (btn && typeof btn.focus === 'function') {
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

  const modal = el(SELECTORES.modalPreferencia);
  const btnAbrir = el(SELECTORES.btnAgregarPreferencia) || document.querySelector('#btn-abrir-modal-preferencia');
  const btnCerrar = el(SELECTORES.btnCerrarModalPref) || document.querySelector('#btn-cerrar-modal-preferencia');
  const btnCancelar = el(SELECTORES.btnCancelarPref) || document.querySelector('#btn-cancelar-preferencia');

  if (modal && !modal.dataset.accesibleInicializado) {
    modal.dataset.accesibleInicializado = 'true';
    configurarModalAccesible(modal, {
      btnAbrir,
      btnCerrar: [btnCerrar, btnCancelar],
      primerEnfocable: SELECTORES.inputPreferencia,
      alAbrir: () => {
        abrirModalPreferencia();
      },
      alCerrar: () => {
        cerrarModalPreferencia();
      }
    });
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
  const local = obtenerPerfilAlumnoLocal();
  const usuario = local?.username || nombreDe(perfil);
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

export function inicializarPerfilUI() {
  inicializarPreferencias();
  inicializarEdicionPerfil();
}

// Inicializar controles interactivos inmediatamente o al cargar DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPerfilUI);
} else {
  inicializarPerfilUI();
}

async function cargar() {
  const cuenta = await exigirRol('alumno', 'username, email, client_code, coach_id');
  if (!cuenta) return;
  cuentaActual = cuenta;
  const { perfil } = cuenta;
  if (!perfil) {
    mostrarError('No se pudo cargar tu perfil. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  mostrarCuenta(perfil);
  await mostrarCoach(perfil.coach_id);

  if (typeof window === 'undefined' || !window.__TEST_BYPASS_AUTH__) {
    try {
      contextoActual = await obtenerUltimoContexto(cuenta.usuarioId);
    } catch (_) {}
  } else {
    try {
      const raw = sessionStorage.getItem(`appcalorias_contexto_ultimo_${cuenta.usuarioId}`);
      if (raw) contextoActual = JSON.parse(raw);
    } catch (_) {}
  }

  const local = obtenerPerfilAlumnoLocal();
  const edad = (local?.edad !== undefined && local?.edad !== null) ? local.edad : (contextoActual?.edad_anios ?? null);
  const altura = (local?.altura !== undefined && local?.altura !== null) ? local.altura : (contextoActual?.altura_cm ?? null);
  actualizarPerfilDatosDOM({ edad, altura });
}

cargar();
