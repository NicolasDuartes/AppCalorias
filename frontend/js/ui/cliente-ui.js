/* ==========================================================
   cliente-ui.js — ficha de un cliente del coach (cliente.html)
   Recibe el cliente en el enlace (cliente.html#id=...) y lo recuerda en la
   pestaña, así al volver de Contexto sigue siendo el mismo.
   "Eliminar cliente" desvincula al alumno (rpc desvincular_alumno): su
   cuenta no se borra.
   Es un módulo: necesita abrirse con servidor (localhost), no desde el disco.
   ========================================================== */
import { supabase } from '../data/supabase.js';
import { exigirRol } from '../data/sesion.js';
import { iniciales, nombreDe } from '../utils/texto.js';
import '../utils/navegacion.js';

const LISTA = 'clientes.html';
const CLAVE_GUARDADA = 'clienteActual';

/**
 * Mapa centralizado de selectores del DOM para cliente.html.
 */
export const SELECTORES = {
  clienteUsuario: '#cliente-usuario',
  clienteIniciales: '#cliente-iniciales',
  clienteCodigo: '#cliente-codigo',
  seccionesCliente: '#secciones-cliente',
  mensajeCliente: '#mensaje-cliente',
  botonEliminar: '#boton-eliminar',
  confirmarEliminar: '#confirmar-eliminar',
  mensajeEliminar: '#mensaje-eliminar',
  nombreCliente: '.nombre-cliente',
  enlaceContexto: 'a[href*="contexto.html"]',
  enlacePlan: 'a[href*="plan-nuevo.html"], a[href*="plan-activo.html"]'
};

const el = (sel) => document.querySelector(sel);

function mostrarMensaje(nodo, texto) {
  if (!nodo) return;
  nodo.textContent = texto;
  nodo.dataset.tipo = 'error';
  nodo.hidden = false;
}

// El id viene en el enlace; si no (volviendo de otra pantalla), el último abierto
function idDelCliente() {
  const delEnlace = new URLSearchParams(window.location.search).get('cliente') || new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.hash.slice(1)).get('id');
  try {
    if (delEnlace) sessionStorage.setItem(CLAVE_GUARDADA, delEnlace);
    return delEnlace || sessionStorage.getItem(CLAVE_GUARDADA);
  } catch {
    return delEnlace;
  }
}

function clienteNoDisponible() {
  const usr = el(SELECTORES.clienteUsuario);
  if (usr) usr.textContent = 'Cliente no disponible';
  const sec = el(SELECTORES.seccionesCliente);
  if (sec) sec.hidden = true;
  mostrarMensaje(el(SELECTORES.mensajeCliente), 'Este cliente ya no está en tu lista. Volvé a Clientes para elegir otro.');
}

async function iniciar() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;
  if (!cuenta.perfil) {
    const usr = el(SELECTORES.clienteUsuario);
    if (usr) usr.textContent = 'Cliente';
    mostrarMensaje(el(SELECTORES.mensajeCliente), 'No se pudo cargar tu cuenta. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }

  const id = idDelCliente();
  if (!id) {
    window.location.href = LISTA;
    return;
  }

  // RLS: el coach solo ve a sus alumnos vinculados
  const { data: cliente, error } = await supabase
    .from('profiles')
    .select('id, username, email, client_code')
    .eq('id', id)
    .eq('coach_id', cuenta.usuarioId)
    .maybeSingle();
  if (error) {
    const usr = el(SELECTORES.clienteUsuario);
    if (usr) usr.textContent = 'Cliente';
    mostrarMensaje(el(SELECTORES.mensajeCliente), 'No se pudo cargar el cliente. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  if (!cliente) {
    clienteNoDisponible();
    return;
  }

  const usuario = nombreDe(cliente);
  document.title = `${usuario} · Coach`;
  const usr = el(SELECTORES.clienteUsuario);
  if (usr) usr.textContent = usuario;
  const ini = el(SELECTORES.clienteIniciales);
  if (ini) ini.textContent = iniciales(usuario);
  const cod = el(SELECTORES.clienteCodigo);
  if (cod) cod.textContent = `ID ${cliente.client_code}`;
  document.querySelectorAll(SELECTORES.nombreCliente).forEach((n) => { n.textContent = `@${usuario}`; });
  const enlaceContexto = el(SELECTORES.enlaceContexto);
  if (enlaceContexto) {
    enlaceContexto.href = `../shared/contexto.html?cliente=${encodeURIComponent(cliente.id)}`;
  }
  const enlacePlan = el(SELECTORES.enlacePlan);
  if (enlacePlan) {
    enlacePlan.href = `plan-activo.html?cliente=${encodeURIComponent(cliente.id)}`;
  }
  const btnEliminar = el(SELECTORES.botonEliminar);
  if (btnEliminar) btnEliminar.hidden = false;

  const btnConfirmar = el(SELECTORES.confirmarEliminar);
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Eliminando…';
      const { error: errorEliminar } = await supabase.rpc('desvincular_alumno', { p_alumno_id: cliente.id });
      if (errorEliminar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Eliminar';
        mostrarMensaje(el(SELECTORES.mensajeEliminar), 'No se pudo eliminar el cliente. Volvé a probar en unos minutos.');
        return;
      }
      try { sessionStorage.removeItem(CLAVE_GUARDADA); } catch { /* sin almacenamiento */ }
      window.location.href = `${LISTA}#eliminado=${encodeURIComponent(usuario)}`;
    });
  }
}

iniciar();
