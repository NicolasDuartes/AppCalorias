/* ==========================================================
   clientes-ui.js — lista de clientes del coach y "Añadir cliente"
   Muestra los alumnos vinculados al coach y vincula nuevos con su ID de
   cliente (rpc vincular_alumno). La ventana se abre con href="#anadir-cliente".
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import '../utils/navegacion.js';

const FORMATO_ID = /^NF-\d{4}-[A-Z]{2}$/;
const COLORES_AVATAR = ['avatar--azul', 'avatar--naranja'];

/**
 * Mapa centralizado de selectores del DOM para clientes.html.
 */
export const SELECTORES = {
  lista: '#lista-clientes',
  buscador: '#buscar-cliente',
  formAnadir: '#form-anadir',
  campoId: '#id-cliente',
  botonAnadir: '#boton-anadir',
  sinClientes: '#sin-clientes',
  sinResultados: '#sin-resultados',
  cargandoClientes: '#cargando-clientes',
  mensajeClientes: '#mensaje-clientes',
  mensajeAnadir: '#mensaje-anadir',
  tplClienteFila: '#tpl-cliente-fila'
};

const el = (sel) => document.querySelector(sel);
const lista = el(SELECTORES.lista);
const buscador = el(SELECTORES.buscador);
const formAnadir = el(SELECTORES.formAnadir);
const campoId = el(SELECTORES.campoId);
const botonAnadir = el(SELECTORES.botonAnadir);

let clientes = [];

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
  const tpl = el(SELECTORES.tplClienteFila);
  if (tpl && tpl.content) {
    const clon = tpl.content.cloneNode(true);
    const li = clon.firstElementChild || clon.querySelector('li');
    const enlace = li.querySelector('[data-ref="enlace"]');
    const avatar = li.querySelector('[data-ref="avatar"]');
    const nombreEl = li.querySelector('[data-ref="nombre"]');
    const codigoEl = li.querySelector('[data-ref="codigo"]');

    if (enlace) enlace.href = `cliente.html?cliente=${encodeURIComponent(cliente.id)}`;
    if (avatar) {
      avatar.classList.add(COLORES_AVATAR[indice % COLORES_AVATAR.length]);
      avatar.textContent = iniciales(nombre);
    }
    if (nombreEl) nombreEl.textContent = nombre;
    if (codigoEl) codigoEl.textContent = `ID ${cliente.client_code}`;
    return li;
  }

  // Fallback seguro sin innerHTML en caso de ausencia de template
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.className = 'fila-link';
  a.href = `cliente.html?cliente=${encodeURIComponent(cliente.id)}`;

  const avatar = document.createElement('span');
  avatar.className = `avatar ${COLORES_AVATAR[indice % COLORES_AVATAR.length]}`;
  avatar.textContent = iniciales(nombre);

  const textos = document.createElement('span');
  textos.className = 'fila-link__textos';

  const spanNombre = document.createElement('span');
  spanNombre.className = 'fila-link__nombre';
  spanNombre.textContent = nombre;

  const spanCodigo = document.createElement('span');
  spanCodigo.className = 'sub';
  spanCodigo.textContent = `ID ${cliente.client_code}`;

  textos.append(spanNombre, spanCodigo);

  const chevron = document.createElement('span');
  chevron.className = 'chevron';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#flecha-derecha');
  svg.appendChild(use);
  chevron.appendChild(svg);

  a.append(avatar, textos, chevron);
  li.appendChild(a);
  return li;
}

function dibujarLista() {
  const busqueda = buscador.value.trim().toLowerCase();
  const visibles = clientes.filter((c) =>
    nombreDe(c).toLowerCase().includes(busqueda) || c.client_code.toLowerCase().includes(busqueda));

  lista.replaceChildren(...visibles.map(filaCliente));
  const sinCli = el(SELECTORES.sinClientes);
  if (sinCli) sinCli.hidden = clientes.length > 0;
  const sinRes = el(SELECTORES.sinResultados);
  if (sinRes) sinRes.hidden = clientes.length === 0 || visibles.length > 0;
  if (buscador) buscador.closest('.buscador').hidden = clientes.length === 0;
}

async function cargarClientes(coachId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, client_code')
    .eq('coach_id', coachId)
    .order('username');
  const cargando = el(SELECTORES.cargandoClientes);
  if (cargando) cargando.hidden = true;
  if (error) {
    mostrarMensaje(el(SELECTORES.mensajeClientes), 'No se pudieron cargar tus clientes. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  clientes = data;
  dibujarLista();
}

if (buscador) buscador.addEventListener('input', dibujarLista);

// ---------- Añadir cliente ----------
function textoDeError(error) {
  if (error?.code === 'P0002') return 'No existe un alumno con ese ID. Revisalo con tu alumno.';
  if (error?.code === 'P0001') return 'Ese alumno ya está vinculado a otro coach.';
  if (error?.code === '42501') return 'Solo una cuenta de coach puede agregar clientes.';
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('fetch') || msg.includes('network')) return 'No hay conexión con el servidor. Revisá tu internet y volvé a probar.';
  return 'No se pudo agregar el cliente. Volvé a probar en unos minutos.';
}

if (formAnadir) {
  formAnadir.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const mensaje = el(SELECTORES.mensajeAnadir);
    if (mensaje) mensaje.hidden = true;

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
    mostrarMensaje(el(SELECTORES.mensajeClientes), `Agregaste a @${nombreDe(alumno)} a tus clientes.`, 'ok');
  });
}

// ---------- Inicio ----------
async function iniciar() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;
  if (!cuenta.perfil) {
    const cargando = el(SELECTORES.cargandoClientes);
    if (cargando) cargando.hidden = true;
    mostrarMensaje(el(SELECTORES.mensajeClientes), 'No se pudo cargar tu cuenta. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  await cargarClientes(cuenta.usuarioId);

  // Al volver de eliminar un cliente (cliente.html manda #eliminado=usuario)
  const eliminado = new URLSearchParams(window.location.hash.slice(1)).get('eliminado');
  if (eliminado) {
    mostrarMensaje(el(SELECTORES.mensajeClientes), `Eliminaste a @${eliminado} de tus clientes.`, 'ok');
    history.replaceState(null, '', window.location.pathname);
  }
}

iniciar();
