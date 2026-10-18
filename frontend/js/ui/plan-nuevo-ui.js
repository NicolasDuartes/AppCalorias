/* ==========================================================
   plan-nuevo-ui.js — Controlador UI para la pantalla de Nuevo Plan del Coach (plan-nuevo.html)
   - Permite al coach elegir la modalidad de creación: desde cero o plantilla.
   - Enlaza con el plan activo actual o el historial de planes archivados.
   - Autenticado con rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plan-nuevo.html.
 */
export const SELECTORES = {
  subtituloCliente: '.encabezado__textos .sub',
  caloriasObjetivo: '.card--oscura .num--xl',
  linkRevisarContexto: '.card--oscura a.link-claro',
  btnCrearDesdeCero: 'a[href*="plan-editor-vacio.html"]',
  btnCargarPlantilla: 'button[data-aviso]',
  btnVerPlanActual: 'a[href*="plan-activo.html"]',
  btnVerHistorial: 'a[href*="historial.html"]'
};

/**
 * Inicializa el controlador de nuevo plan.
 */
export async function iniciarPlanNuevo() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const cliente = params.get('cliente');
  const kcal = params.get('kcal');

  if (cliente) {
    const sub = document.querySelector(SELECTORES.subtituloCliente);
    if (sub) sub.textContent = cliente;

    // Propagar parámetro cliente a los enlaces hijos
    const enlaces = document.querySelectorAll(`${SELECTORES.btnCrearDesdeCero}, ${SELECTORES.btnVerPlanActual}, ${SELECTORES.btnVerHistorial}`);
    enlaces.forEach((enlace) => {
      const href = enlace.getAttribute('href');
      if (href && !href.includes('cliente=')) {
        const sep = href.includes('?') ? '&' : '?';
        enlace.setAttribute('href', `${href}${sep}cliente=${encodeURIComponent(cliente)}`);
      }
    });
  }

  if (kcal) {
    const calEl = document.querySelector(SELECTORES.caloriasObjetivo);
    if (calEl) {
      calEl.textContent = Number(kcal).toLocaleString('es-AR');
    }
  }
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlanNuevo);
} else {
  iniciarPlanNuevo();
}
