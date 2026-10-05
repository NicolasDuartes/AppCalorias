/* ==========================================================
   clientes-ui.js — lista de clientes del coach y "Añadir cliente"
   Muestra los alumnos vinculados al coach y vincula nuevos con su ID de
   cliente (rpc vincular_alumno). La ventana se abre con href="#anadir-cliente".
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';

const LOGIN = '../../login.html';
const PANTALLA_ALUMNO = '../alumno/dashboard.html';
const FORMATO_ID = /^NF-\d{4}-[A-Z]{2}$/;
const COLORES_AVATAR = ['avatar--azul', 'avatar--naranja'];

const el = (id) => document.getElementById(id);
const lista = el('lista-clientes');
const buscador = el('buscar-cliente');
const formAnadir = el('form-anadir');
const campoId = el('id-cliente');
const botonAnadir = el('boton-anadir');

let clientes = [];

// "benja.blason" → "BB"; "martina" → "MA"
function iniciales(usuario) {
  const partes = usuario.split(/[._]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : usuario.slice(0, 2);
  return letras.toUpperCase();
}

function nombreDe(perfil) {
  return perfil.username || perfil.email.split('@')[0];
}

function mostrarMensaje(nodo, texto, tipo = 'error') {
  nodo.textContent = texto;
  nodo.dataset.tipo = tipo;
  nodo.hidden = false;
}

// "nf 1234 ab", "NF1234AB" → "NF-1234-AB"
function normalizarId(texto) {
  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const partes = limpio.match(/^NF(\d{4})([A-Z]{2})$/);
  return partes ? `NF-${partes[1]}-${partes[2]}` : texto.trim().toUpperCase();
}

// ---------- Lista ----------
function filaCliente(cliente, indice) {
  const nombre = nombreDe(cliente);
  const li = document.createElement('li');
  li.innerHTML = `
    <a class="fila-link">
      <span class="avatar"></span>
      <span class="fila-link__textos">
        <span class="fila-link__nombre"></span>
        <span class="sub"></span>
      </span>
      <span class="chevron"><svg class="icono" width="20" height="20" aria-hidden="true"><use href="#flecha-derecha"/></svg></span>
    </a>`;
  li.querySelector('.fila-link').href = `cliente.html#id=${cliente.id}`;
  const avatar = li.querySelector('.avatar');
  avatar.classList.add(COLORES_AVATAR[indice % COLORES_AVATAR.length]);
  avatar.textContent = iniciales(nombre);
  li.querySelector('.fila-link__nombre').textContent = nombre;
  li.querySelector('.sub').textContent = `ID ${cliente.client_code}`;
  return li;
}

function dibujarLista() {
  const busqueda = buscador.value.trim().toLowerCase();
  const visibles = clientes.filter((c) =>
    nombreDe(c).toLowerCase().includes(busqueda) || c.client_code.toLowerCase().includes(busqueda));

  lista.replaceChildren(...visibles.map(filaCliente));
  el('sin-clientes').hidden = clientes.length > 0;
  el('sin-resultados').hidden = clientes.length === 0 || visibles.length > 0;
  buscador.closest('.buscador').hidden = clientes.length === 0;
}

async function cargarClientes(coachId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, client_code')
    .eq('coach_id', coachId)
    .order('username');
  el('cargando-clientes').hidden = true;
  if (error) {
    mostrarMensaje(el('mensaje-clientes'), 'No se pudieron cargar tus clientes. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  clientes = data;
  dibujarLista();
}

buscador.addEventListener('input', dibujarLista);

// ---------- Añadir cliente ----------
function textoDeError(error) {
  if (error?.code === 'P0002') return 'No existe un alumno con ese ID. Revisalo con tu alumno.';
  if (error?.code === 'P0001') return 'Ese alumno ya está vinculado a otro coach.';
  if (error?.code === '42501') return 'Solo una cuenta de coach puede agregar clientes.';
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('fetch') || msg.includes('network')) return 'No hay conexión con el servidor. Revisá tu internet y volvé a probar.';
  return 'No se pudo agregar el cliente. Volvé a probar en unos minutos.';
}

formAnadir.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const mensaje = el('mensaje-anadir');
  mensaje.hidden = true;

  const codigo = normalizarId(campoId.value);
  campoId.value = codigo;
  if (!FORMATO_ID.test(codigo)) {
    mostrarMensaje(mensaje, 'El ID tiene el formato NF-1234-AB.');
    campoId.focus();
    return;
  }
  if (clientes.some((c) => c.client_code === codigo)) {
    mostrarMensaje(mensaje, 'Ese alumno ya está en tu lista de clientes.');
    return;
  }

  botonAnadir.disabled = true;
  botonAnadir.textContent = 'Agregando…';
  const { data: alumno, error } = await supabase.rpc('vincular_alumno', { p_codigo: codigo });
  botonAnadir.disabled = false;
  botonAnadir.textContent = 'Agregar cliente';

  if (error) {
    mostrarMensaje(mensaje, textoDeError(error));
    return;
  }

  clientes = [...clientes, alumno].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)));
  buscador.value = '';
  dibujarLista();
  formAnadir.reset();
  window.location.hash = ''; // Cierra la ventana (:target)
  mostrarMensaje(el('mensaje-clientes'), `Agregaste a @${nombreDe(alumno)} a tus clientes.`, 'ok');
});

// ---------- Inicio ----------
async function iniciar() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = LOGIN;
    return;
  }
  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (perfil?.role !== 'coach') {
    window.location.href = PANTALLA_ALUMNO;
    return;
  }
  await cargarClientes(session.user.id);

  // Al volver de eliminar un cliente (cliente.html manda #eliminado=usuario)
  const eliminado = new URLSearchParams(window.location.hash.slice(1)).get('eliminado');
  if (eliminado) {
    mostrarMensaje(el('mensaje-clientes'), `Eliminaste a @${eliminado} de tus clientes.`, 'ok');
    history.replaceState(null, '', window.location.pathname);
  }
}

iniciar();
