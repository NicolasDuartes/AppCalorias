/* ==========================================================
   login-ui.js — formulario de iniciar sesión (index.html, punto de entrada)
   Entra con correo y contraseña y lleva a la pantalla de cada rol.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { PANTALLAS } from '../data/sesion.js';

/**
 * Mapa centralizado de selectores del DOM para index.html.
 */
export const SELECTORES = {
  form: '.form-login',
  campoCorreo: 'input[name="correo"]',
  campoClave: 'input[name="clave"]',
  boton: '#boton-login',
  botonReenviar: '#reenviar-confirmacion',
  botonVerClave: '#ver-clave',
  mensaje: '#mensaje-login',
  sesionAbierta: '#sesion-abierta',
  sesionUsuario: '#sesion-usuario',
  continuarSesion: '#continuar-sesion',
  usarOtraCuenta: '#usar-otra-cuenta'
};

const el = (sel) => document.querySelector(sel);

const form = el(SELECTORES.form);
const campoCorreo = form ? form.querySelector(SELECTORES.campoCorreo) : null;
const campoClave = form ? form.querySelector(SELECTORES.campoClave) : null;
const boton = el(SELECTORES.boton);
const botonReenviar = el(SELECTORES.botonReenviar);
const botonVerClave = el(SELECTORES.botonVerClave);
const mensaje = el(SELECTORES.mensaje);

function mostrarMensaje(texto, tipo = 'error') {
  mensaje.textContent = texto;
  mensaje.dataset.tipo = tipo;
  mensaje.hidden = false;
}

async function cargarPerfil(userId) {
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role, username, email')
    .eq('id', userId)
    .single();
  return error ? null : perfil;
}

// Lleva a la pantalla del rol del usuario logueado
async function irSegunRol(userId) {
  const perfil = await cargarPerfil(userId);
  if (!perfil) {
    mostrarMensaje('Entraste, pero no se pudo cargar tu perfil. Volvé a probar en unos minutos.');
    return;
  }
  window.location.href = PANTALLAS[perfil.role] || PANTALLAS.alumno;
}

function textoDeError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (msg.includes('email not confirmed')) return 'Todavía no confirmaste tu correo. Abrí el enlace que te enviamos al registrarte.';
  if (error?.status === 429 || msg.includes('rate limit')) return 'Hubo demasiados intentos seguidos. Esperá unos minutos y volvé a probar.';
  if (msg.includes('fetch') || msg.includes('network')) return 'No hay conexión con el servidor. Revisá tu internet y volvé a probar.';
  return 'No se pudo iniciar sesión. Volvé a probar en unos minutos.';
}

botonVerClave.addEventListener('click', () => {
  const visible = campoClave.type === 'text';
  campoClave.type = visible ? 'password' : 'text';
  botonVerClave.setAttribute('aria-pressed', String(!visible));
  botonVerClave.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensaje.hidden = true;
  botonReenviar.hidden = true;
  if (!form.reportValidity()) return;

  boton.disabled = true;
  boton.textContent = 'Entrando…';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: campoCorreo.value.trim(),
      password: campoClave.value,
    });
    if (error) {
      mostrarMensaje(textoDeError(error));
      if ((error.message || '').toLowerCase().includes('email not confirmed')) botonReenviar.hidden = false;
      return;
    }
    await irSegunRol(data.user.id);
  } catch (error) {
    mostrarMensaje(textoDeError(error));
  } finally {
    boton.disabled = false;
    boton.textContent = 'Iniciar sesión';
  }
});

if (botonReenviar) {
  botonReenviar.addEventListener('click', async () => {
    botonReenviar.disabled = true;
    const correo = campoCorreo ? campoCorreo.value.trim() : '';
    const { error } = await supabase.auth.resend({ type: 'signup', email: correo });
    botonReenviar.disabled = false;
    if (error) {
      mostrarMensaje(textoDeError(error));
      return;
    }
    botonReenviar.hidden = true;
    mostrarMensaje(`Te reenviamos el correo de confirmación a ${correo}.`, 'ok');
  });
}

// Si ya hay una sesión abierta, pregunta si seguir con esa cuenta o usar otra
const sesionAbierta = el(SELECTORES.sesionAbierta);
const btnContinuar = el(SELECTORES.continuarSesion);
const btnOtraCuenta = el(SELECTORES.usarOtraCuenta);

if (btnContinuar) {
  btnContinuar.addEventListener('click', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await irSegunRol(session.user.id);
  });
}

if (btnOtraCuenta) {
  btnOtraCuenta.addEventListener('click', async () => {
    await supabase.auth.signOut();
    if (sesionAbierta) sesionAbierta.hidden = true;
    if (form) form.hidden = false;
    if (campoCorreo) campoCorreo.focus();
  });
}

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const perfil = await cargarPerfil(session.user.id);
  const usrEl = el(SELECTORES.sesionUsuario);
  if (usrEl) {
    usrEl.textContent = perfil?.username ? `@${perfil.username}` : session.user.email;
  }
  if (sesionAbierta) sesionAbierta.hidden = false;
  if (form) form.hidden = true;
}
