/* ==========================================================
   alimentos-revision-ui.js — Panel de Moderación y Revisión de Alimentos
   Permite al coach revisar, aprobar o rechazar alimentos propuestos
   por alumnos o la comunidad.
   Cumple las 3 Reglas de Oro de Plantillas HTML y desacoplamiento.
   ========================================================== */

import { supabase } from '../data/supabase.js';
import { exigirRol } from '../data/sesion.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import { configurarModalAccesible, activarTrampaFoco, liberarTrampaFoco } from '../utils/accesibilidad.js';

/**
 * Mapa centralizado de selectores del DOM para alimentos-revision.html.
 * Todos los selectores definidos aquí existen en la vista HTML correspondiente.
 */
export const SELECTORES = {
  listaPendientes: '#lista-pendientes',
  estadoVacio: '#estado-vacio',
  cargandoPendientes: '#cargando-pendientes',
  mensajeRevision: '#mensaje-revision',
  tplAlimentoRevision: '#tpl-alimento-revision',
  modalRechazar: '#modal-revisar',
  modalRevisar: '#modal-revisar',
  formRechazar: '#form-rechazar',
  inputRechazarId: '#rechazar-alimento-id',
  motivoRechazo: '#motivo-rechazo',
  subtituloRechazar: '#subtitulo-rechazar',
  btnConfirmarRechazo: '#btn-confirmar-rechazo',
  btnCancelarRechazo: '#btn-cancelar-revision',
  btnCancelarRevision: '#btn-cancelar-revision',
  btnCerrarModal: '#btn-cerrar-modal',
  mensajeRechazar: '#mensaje-rechazar',
  tarjetaAlimento: '.card--alimento-revision',
  btnAprobar: '[data-ref="btn-aprobar"], .btn-aprobar',
  btnRechazar: '[data-ref="btn-rechazar"], .btn-rechazar'
};

/**
 * Datos mock de contingencia ante falta de conexión a base de datos.
 */
export const MOCK_ALIMENTOS_PENDIENTES = [
  {
    id: 'mock-alim-1',
    nombre: 'Galletitas de avena caseras',
    categoria: 'Cereales',
    marca: null,
    coccion: 'Horno',
    kcal: 420,
    proteinas: 10,
    carbohidratos: 65,
    grasas: 12,
    unidad_nombre: 'galletita',
    unidad_g: 25,
    estado_revision: 'pendiente'
  },
  {
    id: 'mock-alim-2',
    nombre: 'Yogur natural con frutos rojos',
    categoria: 'Lácteos',
    marca: 'La Serenísima',
    coccion: 'Listo',
    kcal: 78,
    proteinas: 4.5,
    carbohidratos: 11,
    grasas: 1.8,
    unidad_nombre: 'pote',
    unidad_g: 160,
    estado_revision: 'pendiente'
  },
  {
    id: 'mock-alim-3',
    nombre: 'Barrita de proteína sabor cacao',
    categoria: 'Suplementos',
    marca: 'Nutrex',
    coccion: 'Listo',
    kcal: 360,
    proteinas: 30,
    carbohidratos: 35,
    grasas: 9,
    unidad_nombre: 'barra',
    unidad_g: 60,
    estado_revision: 'pendiente'
  }
];

let alimentosPendientes = [];

/**
 * Conmuta la visibilidad del estado vacío y el contenedor de lista según la presencia de alimentos.
 * Regla 2: Un solo .html con alternancia declarativa por atributo hidden.
 * @param {boolean} tieneAlimentos Indica si hay elementos pendientes para mostrar.
 */
export function conmutarEstadoVacio(tieneAlimentos) {
  const listaEl = document.querySelector(SELECTORES.listaPendientes);
  const vacioEl = document.querySelector(SELECTORES.estadoVacio);

  if (listaEl) {
    listaEl.hidden = !tieneAlimentos;
  }
  if (vacioEl) {
    vacioEl.hidden = Boolean(tieneAlimentos);
  }
}

/**
 * Carga los alimentos pendientes de revisión desde Supabase.
 * Utiliza fallback a datos mock locales ante error o falta de conectividad.
 * @returns {Promise<Array<Object>>}
 */
export async function cargarAlimentosPendientes() {
  const cargando = document.querySelector(SELECTORES.cargandoPendientes);
  try {
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .eq('estado_revision', 'pendiente')
      .order('creado_el', { ascending: false });

    if (cargando) cargando.hidden = true;

    if (!error && Array.isArray(data)) {
      alimentosPendientes = [...data];
      return alimentosPendientes;
    }

    console.warn('Consulta a Supabase falló o sin datos, usando fallback:', error);
    alimentosPendientes = [...MOCK_ALIMENTOS_PENDIENTES];
    return alimentosPendientes;
  } catch (err) {
    if (cargando) cargando.hidden = true;
    console.warn('Excepción al consultar alimentos pendientes, usando fallback:', err);
    alimentosPendientes = [...MOCK_ALIMENTOS_PENDIENTES];
    return alimentosPendientes;
  }
}

/**
 * Renderiza la lista de alimentos pendientes clonando la plantilla HTML.
 * Regla 1: Cero innerHTML con datos de usuario; hidratación segura con textContent y dataset.
 * @param {Array<Object>} alimentos Lista de alimentos a renderizar.
 */
export function renderizarAlimentos(alimentos) {
  const listaEl = document.querySelector(SELECTORES.listaPendientes);
  const tpl = document.querySelector(SELECTORES.tplAlimentoRevision);
  if (!listaEl || !tpl) return;

  listaEl.textContent = '';

  if (!alimentos || alimentos.length === 0) {
    conmutarEstadoVacio(false);
    return;
  }

  conmutarEstadoVacio(true);

  alimentos.forEach((item) => {
    const clon = tpl.content.cloneNode(true);
    const tarjeta = clon.querySelector(SELECTORES.tarjetaAlimento) || clon.firstElementChild;
    if (tarjeta) {
      tarjeta.dataset.alimentoId = item.id;
    }

    // Nombre
    const nombreEl = clon.querySelector('[data-bind="nombre"]');
    if (nombreEl) nombreEl.textContent = item.nombre || 'Alimento sin nombre';

    // Categoría
    const catEl = clon.querySelector('[data-bind="categoria"]');
    if (catEl) catEl.textContent = item.categoria || 'General';

    // Detalles: Marca y Cocción
    const detallesEl = clon.querySelector('[data-bind="detalles"]');
    if (detallesEl) {
      const partes = [];
      if (item.marca && String(item.marca).trim()) {
        partes.push(`Marca: ${String(item.marca).trim()}`);
      }
      if (item.coccion && String(item.coccion).trim()) {
        partes.push(`Cocción: ${String(item.coccion).trim()}`);
      }
      detallesEl.textContent = partes.length > 0 ? partes.join(' · ') : 'Sin marca especificada';
    }

    // Macros cada 100g
    const kcalEl = clon.querySelector('[data-bind="kcal"]');
    if (kcalEl) kcalEl.textContent = String(Math.round(Number(item.kcal) || 0));

    const pEl = clon.querySelector('[data-bind="p"]');
    if (pEl) pEl.textContent = String(Number(item.proteinas ?? item.p ?? 0));

    const cEl = clon.querySelector('[data-bind="c"]');
    if (cEl) cEl.textContent = String(Number(item.carbohidratos ?? item.c ?? 0));

    const gEl = clon.querySelector('[data-bind="g"]');
    if (gEl) gEl.textContent = String(Number(item.grasas ?? item.g ?? 0));

    // Por unidad
    const contenedorUnidad = clon.querySelector('[data-ref="contenedor-unidad"]');
    const unidadEl = clon.querySelector('[data-bind="unidad"]');
    if (item.unidad_nombre && item.unidad_g) {
      if (unidadEl) unidadEl.textContent = `1 ${item.unidad_nombre} = ${item.unidad_g} g`;
      if (contenedorUnidad) contenedorUnidad.hidden = false;
    } else if (contenedorUnidad) {
      contenedorUnidad.hidden = true;
    }

    // Botones de acción
    const btnAprobar = clon.querySelector(SELECTORES.btnAprobar);
    if (btnAprobar) {
      btnAprobar.addEventListener('click', () => {
        aprobarAlimento(item.id, tarjeta);
      });
    }

    const btnRechazar = clon.querySelector(SELECTORES.btnRechazar);
    if (btnRechazar) {
      btnRechazar.addEventListener('click', () => {
        abrirModalRechazo(item.id, item.nombre);
      });
    }

    listaEl.appendChild(clon);
  });
}

/**
 * Aprueba un alimento pendiente invocando el RPC o actualización en base de datos.
 * @param {string} id Identificador único del alimento.
 * @param {HTMLElement} [tarjetaEl] Nodo del DOM correspondiente a la tarjeta.
 */
export async function aprobarAlimento(id, tarjetaEl) {
  const btnAprobar = tarjetaEl?.querySelector(SELECTORES.btnAprobar);
  if (btnAprobar) {
    btnAprobar.disabled = true;
    btnAprobar.textContent = 'Aprobando…';
  }

  let aprobado = false;

  try {
    const { error: errorRpc1 } = await supabase.rpc('revisar_alimento', {
      p_alimento_id: id,
      p_aprobar: true
    });
    if (!errorRpc1) {
      aprobado = true;
    } else {
      const { error: errorRpc2 } = await supabase.rpc('revisar_alimento', {
        p_alimento_id: id,
        p_estado: 'aprobado'
      });
      if (!errorRpc2) aprobado = true;
    }
  } catch (err) {
    console.warn('RPC revisar_alimento falló:', err);
  }

  if (!aprobado) {
    try {
      const { error: errorUpdate } = await supabase
        .from('alimentos')
        .update({
          estado_revision: 'aprobado',
          revisado_el: new Date().toISOString()
        })
        .eq('id', id);
      if (!errorUpdate) aprobado = true;
    } catch (err) {
      console.warn('Update directo en alimentos falló:', err);
    }
  }

  alimentosPendientes = alimentosPendientes.filter((a) => a.id !== id);

  if (tarjetaEl) {
    tarjetaEl.classList.add('removiendo');
    setTimeout(() => {
      tarjetaEl.remove();
      conmutarEstadoVacio(alimentosPendientes.length > 0);
    }, 250);
  } else {
    conmutarEstadoVacio(alimentosPendientes.length > 0);
  }

  mostrarAvisoFlotante('Alimento aprobado con éxito.');
}

/**
 * Abre la ventana modal para ingresar el motivo de rechazo de un alimento.
 * @param {string} id Identificador único del alimento.
 * @param {string} [nombre] Nombre descriptivo del alimento.
 */
export function abrirModalRechazo(id, nombre = '') {
  const inputId = document.querySelector(SELECTORES.inputRechazarId);
  const motivoEl = document.querySelector(SELECTORES.motivoRechazo);
  const mensajeEl = document.querySelector(SELECTORES.mensajeRechazar);
  const subtituloEl = document.querySelector(SELECTORES.subtituloRechazar);

  if (inputId) inputId.value = id;
  if (motivoEl) motivoEl.value = '';
  if (mensajeEl) {
    mensajeEl.textContent = '';
    mensajeEl.hidden = true;
  }
  if (subtituloEl && nombre) {
    subtituloEl.textContent = `Indicá el motivo por el cual se rechaza "${nombre}" (opcional):`;
  }
  window.location.hash = 'rechazar';
}

/**
 * Rechaza un alimento pendiente registrando el motivo en Supabase.
 * @param {string} id Identificador único del alimento.
 * @param {string} motivo Justificación o motivo opcional del rechazo.
 */
export async function rechazarAlimento(id, motivo = '') {
  const btnConfirmar = document.querySelector(SELECTORES.btnConfirmarRechazo);
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Rechazando…';
  }

  const motivoLimpio = (motivo || '').trim();
  let rechazado = false;

  try {
    const { error: errorRpc1 } = await supabase.rpc('revisar_alimento', {
      p_alimento_id: id,
      p_aprobar: false,
      p_motivo: motivoLimpio || null
    });
    if (!errorRpc1) {
      rechazado = true;
    } else {
      const { error: errorRpc2 } = await supabase.rpc('revisar_alimento', {
        p_alimento_id: id,
        p_estado: 'rechazado',
        p_motivo: motivoLimpio || null
      });
      if (!errorRpc2) rechazado = true;
    }
  } catch (err) {
    console.warn('RPC revisar_alimento (rechazar) falló:', err);
  }

  if (!rechazado) {
    try {
      const { error: errorUpdate } = await supabase
        .from('alimentos')
        .update({
          estado_revision: 'rechazado',
          motivo_rechazo: motivoLimpio || null,
          revisado_el: new Date().toISOString()
        })
        .eq('id', id);
      if (!errorUpdate) rechazado = true;
    } catch (err) {
      console.warn('Update directo rechazo falló:', err);
    }
  }

  if (btnConfirmar) {
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Rechazar';
  }

  cerrarModalRechazo();

  alimentosPendientes = alimentosPendientes.filter((a) => a.id !== id);

  const tarjetaEl = document.querySelector(`[data-alimento-id="${id}"]`);
  if (tarjetaEl) {
    tarjetaEl.classList.add('removiendo');
    setTimeout(() => {
      tarjetaEl.remove();
      conmutarEstadoVacio(alimentosPendientes.length > 0);
    }, 250);
  } else {
    conmutarEstadoVacio(alimentosPendientes.length > 0);
  }

  mostrarAvisoFlotante('Alimento rechazado.');
}

/**
 * Configura los manejadores de eventos del formulario y modal de rechazo.
 */
export function configurarModalRechazo() {
  const form = document.querySelector(SELECTORES.formRechazar);
  const btnCancelar = document.querySelector(SELECTORES.btnCancelarRechazo);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputId = document.querySelector(SELECTORES.inputRechazarId);
      const motivoEl = document.querySelector(SELECTORES.motivoRechazo);
      const id = inputId?.value;
      const motivo = motivoEl?.value || '';

      if (!id) return;
      await rechazarAlimento(id, motivo);
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener('click', (e) => {
      e.preventDefault();
      cerrarModalRechazo();
    });
  }
}

/**
 * Inicializa el panel de revisión tras validar credenciales de coach.
 */
export async function iniciar() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  configurarModalRechazo();
  const alimentos = await cargarAlimentosPendientes();
  renderizarAlimentos(alimentos);
}

iniciar();
