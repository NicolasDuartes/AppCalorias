/* ==========================================================
   plan-archivado-ui.js — Controlador UI para la pantalla de Plan Archivado del Coach (plan-archivado.html)
   - Visualiza en modo lectura un plan alimenticio histórico o archivado.
   - Permite al coach consultar las indicaciones, alimentos y distribución de macronutrientes.
   - Permite reutilizar el plan archivado como base para un nuevo plan en el editor.
   - Autenticado con rol 'coach' mediante exigirRol.
   - Desacople completo del DOM mediante el mapa centralizado SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plan-archivado.html.
 */
export const SELECTORES = {
  subtituloCliente: '.encabezado__textos .sub',
  tagArchivado: '.card .tag--grande',
  vigenciaTexto: '.card .grilla-2 .columna:nth-child(1) .negrita',
  modalidadTexto: '.card .grilla-2 .columna:nth-child(2) .negrita',
  cardFija: '.card--fija',
  totalKcal: '.card--fija .num--l',
  objetivoKcal: '.card--fija .sub',
  repartoP: '.reparto .p',
  repartoC: '.reparto .c',
  repartoG: '.reparto .g',
  macroP: '.macros .macro:nth-child(1) .num',
  macroC: '.macros .macro:nth-child(2) .num',
  macroG: '.macros .macro:nth-child(3) .num',
  acordeones: '.acordeon',
  itemsLectura: '.item-lectura',
  btnReutilizar: 'a[href*="plan-editor.html"]',
  notaLectura: '.nota-centrada'
};

/**
 * Inicializa el controlador del plan archivado.
 */
export async function iniciarPlanArchivado() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const cliente = params.get('cliente');
  const planId = params.get('plan');

  if (cliente) {
    const sub = document.querySelector(SELECTORES.subtituloCliente);
    if (sub) sub.textContent = cliente;
  }

  // Configurar enlace de reutilización como plantilla
  const btnReutilizar = document.querySelector(SELECTORES.btnReutilizar);
  if (btnReutilizar) {
    let href = 'plan-editor.html';
    const query = [];
    if (cliente) query.push(`cliente=${encodeURIComponent(cliente)}`);
    if (planId) query.push(`plantilla=${encodeURIComponent(planId)}`);
    if (query.length > 0) href += `?${query.join('&')}`;
    btnReutilizar.setAttribute('href', href);

    btnReutilizar.addEventListener('click', () => {
      mostrarAvisoFlotante('Cargando plan archivado como plantilla en el editor...');
    });
  }
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlanArchivado);
} else {
  iniciarPlanArchivado();
}
