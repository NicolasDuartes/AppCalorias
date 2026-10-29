/* ==========================================================
   historial-ui.js — Controlador UI para el Historial de Planes del Coach (historial.html / historial-vacio.html)
   - Permite al coach consultar la línea de tiempo de planes archivados de un cliente.
   - Conectado a planes-api.js para obtener historial de planes.
   - Permite reutilizar planes anteriores como plantilla para nuevos planes.
   - Unifica el manejo de estados lleno/vacío mediante conmutarEstadoVacio y #tpl-item-historial.
   - Autenticado con rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { obtenerHistorialPlanes } from '../data/planes-api.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para historial.html y historial-vacio.html.
 */
export const SELECTORES = {
  subtituloCliente: '.encabezado__textos .sub',
  lineaTiempo: '.linea-tiempo',
  itemsLineaTiempo: '.linea-tiempo__item',
  tarjetaPlan: '.linea-tiempo__tarjeta',
  tagArchivado: '.linea-tiempo__tarjeta .tag--gris',
  tituloPlan: '.linea-tiempo__tarjeta .seccion-titulo',
  kcalPlan: '.linea-tiempo__tarjeta .num--m',
  fechasPlan: '.linea-tiempo__tarjeta .sub',
  btnVerDetalle: '.linea-tiempo__tarjeta a.btn--secundario',
  btnReutilizar: '.linea-tiempo__tarjeta a.btn--suave',
  seccionVacio: '.vacio',
  btnCrearDesdeVacio: '.vacio a.btn--primario',
  tplItemHistorial: '#tpl-item-historial'
};

/**
 * Alterna el atributo hidden entre la sección de estado vacío (.vacio) y la línea de tiempo (.linea-tiempo).
 * @param {boolean} tienePlanes Indica si existen planes archivados para mostrar
 */
export function conmutarEstadoVacio(tienePlanes) {
  const lineaTiempoEl = document.querySelector(SELECTORES.lineaTiempo);
  const seccionVacioEl = document.querySelector(SELECTORES.seccionVacio);

  if (lineaTiempoEl) {
    lineaTiempoEl.hidden = !tienePlanes;
  }
  if (seccionVacioEl) {
    seccionVacioEl.hidden = Boolean(tienePlanes);
  }
}

/**
 * Renderiza dinámicamente los ítems del historial clonando #tpl-item-historial con textContent.
 * @param {Array<Object>} planes
 * @param {string|null} clienteId
 */
export function renderizarItemsHistorial(planes, clienteId = null) {
  const contenedor = document.querySelector(SELECTORES.lineaTiempo);
  const tpl = document.querySelector(SELECTORES.tplItemHistorial);
  if (!contenedor || !tpl || !tpl.content) return;

  const fragmento = document.createDocumentFragment();

  planes.forEach((plan) => {
    const clon = tpl.content.cloneNode(true);
    const item = clon.querySelector('.linea-tiempo__item') || clon.firstElementChild;
    if (!item) return;

    const tituloEl = item.querySelector('.seccion-titulo');
    if (tituloEl) {
      tituloEl.textContent = plan.name || plan.nombre || 'Plan alimenticio';
    }

    const kcalEl = item.querySelector('.num--m');
    if (kcalEl) {
      const kcal = Number(plan.target_calories ?? plan.kcal ?? 0);
      kcalEl.textContent = kcal.toLocaleString('es-AR');
    }

    const subs = item.querySelectorAll('.sub');
    if (subs.length > 0) {
      subs[0].textContent = plan.duracion || 'Archivado';
    }
    if (subs.length > 1) {
      const fechaTexto = plan.created_at
        ? new Date(plan.created_at).toLocaleDateString('es-AR')
        : (plan.fechas || '');
      subs[1].textContent = fechaTexto;
    }

    const btnDetalle = item.querySelector('a.btn--secundario');
    if (btnDetalle && plan.id) {
      const query = new URLSearchParams();
      if (clienteId) query.set('cliente', clienteId);
      query.set('plan', plan.id);
      btnDetalle.href = `plan-archivado.html?${query.toString()}`;
    }

    const btnReutilizar = item.querySelector('a.btn--suave');
    if (btnReutilizar) {
      if (plan.id) {
        const query = new URLSearchParams();
        if (clienteId) query.set('cliente', clienteId);
        query.set('plantilla', plan.id);
        btnReutilizar.href = `plan-editor.html?${query.toString()}`;
      }
      btnReutilizar.addEventListener('click', () => {
        mostrarAvisoFlotante('Cargando plantilla en el editor...');
      });
    }

    fragmento.appendChild(item);
  });

  contenedor.replaceChildren(fragmento);
}

/**
 * Inicializa el controlador de historial de planes.
 */
export async function iniciarHistorial() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('cliente');

  if (clienteId) {
    try {
      const planes = await obtenerHistorialPlanes(clienteId);
      if (Array.isArray(planes)) {
        const tienePlanes = planes.length > 0;
        conmutarEstadoVacio(tienePlanes);

        const sub = document.querySelector(SELECTORES.subtituloCliente);
        if (sub) {
          const baseCliente = sub.textContent.split('·')[0].trim();
          sub.textContent = `${baseCliente} · ${planes.length} ${planes.length === 1 ? 'plan archivado' : 'planes archivados'}`;
        }

        if (tienePlanes) {
          renderizarItemsHistorial(planes, clienteId);
        }
      }
    } catch {
      // Fallback local a datos renderizados
    }
  }

  // Interceptar botones de reutilizar como plantilla para cargar parámetros en el editor
  document.querySelectorAll(SELECTORES.btnReutilizar).forEach((btn) => {
    btn.addEventListener('click', () => {
      mostrarAvisoFlotante('Cargando plantilla en el editor...');
    });
  });
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarHistorial);
} else {
  iniciarHistorial();
}
