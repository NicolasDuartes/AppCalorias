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
import { obtenerPermisosAlumno, actualizarPermisoAlumno } from '../data/contexto-api.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
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
  enlacePlan: 'a[href*="plan-nuevo.html"], a[href*="plan-activo.html"]',
  enlaceSeguimiento: '#enlace-seguimiento',
  preferenciasCliente: '#preferencias-cliente',
  listaPreferenciasCliente: '#lista-preferencias-cliente',
  permisosCliente: '#permisos-cliente',
  permisoContexto: '#permiso-contexto',
  permisoPlan: '#permiso-plan'
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
  const enlaceSeguimiento = el(SELECTORES.enlaceSeguimiento);
  if (enlaceSeguimiento) {
    enlaceSeguimiento.href = `seguimiento.html?cliente=${encodeURIComponent(cliente.id)}`;
  }

  // Hidratar preferencias del alumno
  const contPreferencias = el(SELECTORES.listaPreferenciasCliente);
  if (contPreferencias) {
    while (contPreferencias.firstChild) {
      contPreferencias.removeChild(contPreferencias.firstChild);
    }
    let prefs = [];
    try {
      const stored = sessionStorage.getItem('appcalorias_preferencias_alumno');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          prefs = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          prefs = Object.values(parsed);
        }
      }
    } catch {
      const stored = sessionStorage.getItem('appcalorias_preferencias_alumno');
      if (stored && typeof stored === 'string') {
        prefs = stored.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (!prefs.length && cliente?.preferencias && Array.isArray(cliente.preferencias)) {
      prefs = cliente.preferencias;
    }

    if (!prefs.length) {
      prefs = ['Sin lactosa', 'No come pescado', 'Desayuna liviano'];
    }

    prefs.forEach((prefTexto) => {
      const chip = document.createElement('span');
      chip.className = 'preferencia';
      chip.textContent = String(prefTexto);
      contPreferencias.appendChild(chip);
    });
  }

  // Hidratar y gestionar permisos del alumno
  try {
    const permisos = await obtenerPermisosAlumno(cliente.id);
    const switchContexto = el(SELECTORES.permisoContexto);
    const switchPlan = el(SELECTORES.permisoPlan);

    if (switchContexto) {
      const activo = Array.isArray(permisos) && permisos.includes('contexto');
      switchContexto.setAttribute('aria-checked', String(activo));
      switchContexto.addEventListener('click', async () => {
        const nuevo = switchContexto.getAttribute('aria-checked') !== 'true';
        switchContexto.setAttribute('aria-checked', String(nuevo));
        const res = await actualizarPermisoAlumno(cliente.id, 'contexto', nuevo);
        if (res.success) {
          mostrarAvisoFlotante(nuevo ? 'Permiso de contexto habilitado.' : 'Permiso de contexto revocado.');
        } else {
          switchContexto.setAttribute('aria-checked', String(!nuevo));
          mostrarAvisoFlotante('No se pudo actualizar el permiso.');
        }
      });
    }

    if (switchPlan) {
      const activo = Array.isArray(permisos) && permisos.includes('plan');
      switchPlan.setAttribute('aria-checked', String(activo));
      switchPlan.addEventListener('click', async () => {
        const nuevo = switchPlan.getAttribute('aria-checked') !== 'true';
        switchPlan.setAttribute('aria-checked', String(nuevo));
        const res = await actualizarPermisoAlumno(cliente.id, 'plan', nuevo);
        if (res.success) {
          mostrarAvisoFlotante(nuevo ? 'Permiso de plan alimenticio habilitado.' : 'Permiso de plan revocado.');
        } else {
          switchPlan.setAttribute('aria-checked', String(!nuevo));
          mostrarAvisoFlotante('No se pudo actualizar el permiso.');
        }
      });
    }
  } catch (err) {
    console.warn('Error gestionando permisos del alumno:', err);
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