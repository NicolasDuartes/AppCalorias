/* ==========================================================
   cuenta-ui.js — formulario de crear cuenta (index.html)
   Crea el usuario en Supabase con su tipo de cuenta y @usuario. El perfil
   (rol, @usuario, correo e ID de cliente) lo arma el trigger handle_new_user.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';

const DESTINO = {
  alumno: 'pages/alumno/dashboard.html',
  coach: 'pages/coach/clientes.html',
};
const FORMATO_USUARIO = /^[a-z0-9._]{3,30}$/;

const form = document.querySelector('.form-cuenta');
const campoUsuario = form.elements.usuario;
const campoCorreo = form.elements.correo;
const campoClave = form.elements.clave;
const casillaTerminos = form.elements.acepta;
const ayudaUsuario = document.getElementById('usuario-ayuda');
const mensaje = document.getElementById('mensaje-cuenta');
const fuerza = form.querySelector('.fuerza');
const botonVerClave = document.getElementById('ver-clave');

function tipoElegido() {
  return form.elements.tipo.value === 'coach' ? 'coach' : 'alumno';
}

function mostrarMensaje(texto, tipo = 'error') {
  mensaje.textContent = texto;
  mensaje.dataset.tipo = tipo;
  mensaje.hidden = false;
}

function ocultarMensaje() {
  mensaje.hidden = true;
}

// ---------- @usuario: minúsculas y chequeo de disponibilidad ----------
function avisoUsuario(texto, tipo) {
  ayudaUsuario.textContent = texto;
  ayudaUsuario.dataset.tipo = tipo;
}

async function usuarioDisponible(usuario) {
  const { data, error } = await supabase.rpc('usuario_disponible', { p_usuario: usuario });
  if (error) return null; // No se pudo consultar: lo resuelve el registro
  return data;
}

campoUsuario.addEventListener('input', () => {
  const limpio = campoUsuario.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
  if (limpio !== campoUsuario.value) campoUsuario.value = limpio;
  avisoUsuario('Minúsculas, números, punto o guion bajo.', '');
});

campoUsuario.addEventListener('blur', async () => {
  const usuario = campoUsuario.value;
  if (!FORMATO_USUARIO.test(usuario)) return;
  const libre = await usuarioDisponible(usuario);
  if (campoUsuario.value !== usuario) return; // Cambió mientras se consultaba
  if (libre === true) avisoUsuario(`@${usuario} está disponible.`, 'ok');
  if (libre === false) avisoUsuario(`@${usuario} ya está en uso. Probá con otro.`, 'error');
});

// ---------- Contraseña: mostrar y fuerza ----------
botonVerClave.addEventListener('click', () => {
  const visible = campoClave.type === 'text';
  campoClave.type = visible ? 'password' : 'text';
  botonVerClave.setAttribute('aria-pressed', String(!visible));
  botonVerClave.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

function nivelClave(clave) {
  if (clave.length < 8) return clave.length ? 1 : 0;
  const letrasYNumeros = /[a-zA-Z]/.test(clave) && /\d/.test(clave);
  if (!letrasYNumeros) return 1;
  return clave.length >= 12 || /[^a-zA-Z0-9]/.test(clave) ? 3 : 2;
}

campoClave.addEventListener('input', () => {
  fuerza.dataset.nivel = nivelClave(campoClave.value);
});

// ---------- Errores de Supabase en palabras del usuario ----------
function textoDeError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('already registered')) return 'Ya hay una cuenta con ese correo. Iniciá sesión o usá otro correo.';
  if (msg.includes('database error saving new user')) return 'Ese @usuario ya está en uso. Probá con otro.';
  if (msg.includes('password')) return 'La contraseña no cumple los requisitos: mínimo 8 caracteres, con letras y números.';
  if (msg.includes('email') && msg.includes('invalid')) return 'Revisá el correo electrónico: el formato no es válido.';
  if (error?.status === 429 || msg.includes('rate limit')) return 'Hubo demasiados intentos seguidos. Esperá unos minutos y volvé a probar.';
  if (msg.includes('fetch') || msg.includes('network')) return 'No hay conexión con el servidor. Revisá tu internet y volvé a probar.';
  return 'No se pudo crear la cuenta. Volvé a probar en unos minutos.';
}

// ---------- Envío ----------
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarMensaje();

  if (!casillaTerminos.checked) {
    mostrarMensaje('Aceptá los términos para continuar.');
    return;
  }
  if (!form.reportValidity()) return;

  const usuario = campoUsuario.value;
  if (!FORMATO_USUARIO.test(usuario)) {
    mostrarMensaje('El @usuario tiene que tener de 3 a 30 caracteres: minúsculas, números, punto o guion bajo.');
    campoUsuario.focus();
    return;
  }
  if (nivelClave(campoClave.value) < 2) {
    mostrarMensaje('La contraseña necesita al menos 8 caracteres, con letras y números.');
    campoClave.focus();
    return;
  }

  const rol = tipoElegido();
  const boton = form.querySelector(`.cta-crear.solo-${rol}`);
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Creando cuenta…';

  try {
    if ((await usuarioDisponible(usuario)) === false) {
      avisoUsuario(`@${usuario} ya está en uso. Probá con otro.`, 'error');
      mostrarMensaje('Ese @usuario ya está en uso. Probá con otro.');
      campoUsuario.focus();
      return;
    }

    const correo = campoCorreo.value.trim();
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: campoClave.value,
      options: { data: { role: rol, username: usuario } },
    });
    if (error) throw error;

    // Con confirmación de correo activa, Supabase no avisa que el correo ya
    // existe: devuelve un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      mostrarMensaje('Ya hay una cuenta con ese correo. Iniciá sesión o usá otro correo.');
      return;
    }

    if (data.session) {
      window.location.href = DESTINO[rol];
      return;
    }

    form.reset();
    form.elements.tipo.value = rol;
    fuerza.dataset.nivel = 0;
    avisoUsuario('', '');
    mostrarMensaje(`Te enviamos un correo a ${correo}. Abrí el enlace para confirmar tu cuenta y después iniciá sesión.`, 'ok');
  } catch (error) {
    if ((error?.message || '').toLowerCase().includes('database error saving new user')) {
      avisoUsuario(`@${usuario} ya está en uso. Probá con otro.`, 'error');
    }
    mostrarMensaje(textoDeError(error));
  } finally {
    boton.disabled = false;
    boton.textContent = textoBoton;
  }
});
