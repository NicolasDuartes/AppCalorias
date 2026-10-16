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

const el = (id) => document.getElementById(id);

function mostrarError(texto) {
  el('perfil-usuario').textContent = 'Tu perfil';
  el('mensaje-perfil').textContent = texto;
  el('mensaje-perfil').hidden = false;
}

function mostrarCuenta(perfil) {
  const usuario = nombreDe(perfil);
  el('perfil-usuario').textContent = usuario;
  el('perfil-iniciales').textContent = iniciales(usuario);
  el('codigo-cliente').textContent = perfil.client_code;
  el('copiar-codigo').disabled = false;
}

async function mostrarCoach(coachId) {
  if (!coachId) {
    el('coach-sin-vincular').hidden = false;
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
  el('coach-usuario').textContent = usuario;
  el('coach-iniciales').textContent = iniciales(usuario);
  el('coach-vinculado').hidden = false;
}

// Copiar el ID de cliente
el('copiar-codigo').addEventListener('click', async () => {
  const codigo = el('codigo-cliente').textContent;
  try {
    await navigator.clipboard.writeText(codigo);
    el('copiar-texto').textContent = 'Copiado';
  } catch {
    // Sin permiso de portapapeles: se selecciona el código para copiarlo a mano
    window.getSelection().selectAllChildren(el('codigo-cliente'));
    el('copiar-texto').textContent = 'Seleccionado';
  }
  setTimeout(() => { el('copiar-texto').textContent = 'Copiar'; }, 2000);
});

el('cerrar-sesion').addEventListener('click', cerrarSesion);

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
