/* ==========================================================
   plan-activo-ui.js — Controlador UI para la pantalla de Plan Activo del Coach (plan-activo.html)
   - Visualiza el plan alimenticio activo de un alumno asignado.
   - Permite al coach revisar comidas, alimentos e hidratación.
   - Maneja la finalización de plan (archivar) con confirmación modal.
   - Conectado a planes-api.js y autenticado con rol 'coach'.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { obtenerPlanActivo, archivarPlan } from '../data/planes-api.js';
import { mostrarAvisoFlotante, guardarAvisoToast } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plan-activo.html.
 */
export const SELECTORES = {
  tituloCliente: '.encabezado__textos .sub',
  tagEstado: '.card .tag--grande',
  fechaVigencia: '.card .grilla-2 .columna:nth-child(1) .negrita',
  modalidad: '.card .grilla-2 .columna:nth-child(2) .negrita',
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
  btnActualizar: 'a[href*="plan-editor.html"]',
  btnFinalizarTrigger: 'a[href="#finalizar"]',
  modalFinalizar: '#finalizar',
  btnConfirmarFinalizar: '#finalizar .btn--peligro'
};

/**
 * Inicializa el controlador del plan activo.
 */
export async function iniciarPlanActivo() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('cliente');
  let planId = params.get('plan');

  // Si hay clienteId, intentar hidratar el plan activo desde Supabase
  if (clienteId) {
    try {
      const res = await obtenerPlanActivo(clienteId);
      if (res && res.plan) {
        const plan = res.plan;
        if (plan.id) {
          planId = plan.id;
        }
        const totalKcalEl = document.querySelector(SELECTORES.totalKcal);
        if (totalKcalEl && plan.target_calories) {
          totalKcalEl.textContent = plan.target_calories.toLocaleString('es-AR');
        }
      }
    } catch {
      // Fallback a contenido estático renderizado
    }
  }

  // Interceptar confirmación de finalizar plan
  const btnFinalizar = document.querySelector(SELECTORES.btnConfirmarFinalizar);
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', async (evento) => {
      if (planId) {
        evento.preventDefault();
        try {
          await archivarPlan(planId);
          guardarAvisoToast('Plan finalizado y archivado.');
          window.location.href = 'historial.html' + (clienteId ? `?cliente=${encodeURIComponent(clienteId)}` : '');
        } catch {
          mostrarAvisoFlotante('No se pudo archivar el plan en el servidor.');
          window.location.href = 'historial.html';
        }
      } else {
        guardarAvisoToast('Plan finalizado y archivado.');
      }
    });
  }
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlanActivo);
} else {
  iniciarPlanActivo();
}
