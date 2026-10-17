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

const el = (id) => document.getElementById(id);

function mostrarMensaje(nodo, texto) {
  nodo.textContent = texto;
  nodo.dataset.tipo = 'error';
  nodo.hidden = false;
}

// El id viene en el enlace; si no (volviendo de otra pantalla), el último abierto
function idDelCliente() {
  const delEnlace = new URLSearchParams(window.location.hash.slice(1)).get('id');
  try {
    if (delEnlace) sessionStorage.setItem(CLAVE_GUARDADA, delEnlace);
    return delEnlace || sessionStorage.getItem(CLAVE_GUARDADA);
  } catch {
    return delEnlace;
  }
}

function clienteNoDisponible() {
  el('cliente-usuario').textContent = 'Cliente no disponible';
  el('secciones-cliente').hidden = true;
  mostrarMensaje(el('mensaje-cliente'), 'Este cliente ya no está en tu lista. Volvé a Clientes para elegir otro.');
}

async function iniciar() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;
  if (!cuenta.perfil) {
    el('cliente-usuario').textContent = 'Cliente';
    mostrarMensaje(el('mensaje-cliente'), 'No se pudo cargar tu cuenta. Revisá tu conexión y volvé a abrir la pantalla.');
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
    el('cliente-usuario').textContent = 'Cliente';
    mostrarMensaje(el('mensaje-cliente'), 'No se pudo cargar el cliente. Revisá tu conexión y volvé a abrir la pantalla.');
    return;
  }
  if (!cliente) {
    clienteNoDisponible();
    return;
  }

  const usuario = nombreDe(cliente);
  document.title = `${usuario} · Coach`;
  el('cliente-usuario').textContent = usuario;
  el('cliente-iniciales').textContent = iniciales(usuario);
  el('cliente-codigo').textContent = `ID ${cliente.client_code}`;
  document.querySelectorAll('.nombre-cliente').forEach((n) => { n.textContent = `@${usuario}`; });
  el('boton-eliminar').hidden = false;

  el('confirmar-eliminar').addEventListener('click', async () => {
    const boton = el('confirmar-eliminar');
    boton.disabled = true;
    boton.textContent = 'Eliminando…';
    const { error: errorEliminar } = await supabase.rpc('desvincular_alumno', { p_alumno_id: cliente.id });
    if (errorEliminar) {
      boton.disabled = false;
      boton.textContent = 'Eliminar';
      mostrarMensaje(el('mensaje-eliminar'), 'No se pudo eliminar el cliente. Volvé a probar en unos minutos.');
      return;
    }
    try { sessionStorage.removeItem(CLAVE_GUARDADA); } catch { /* sin almacenamiento */ }
    window.location.href = `${LISTA}#eliminado=${encodeURIComponent(usuario)}`;
  });
}

iniciar();
