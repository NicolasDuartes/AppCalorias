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
import { obtenerPlanPorId } from '../data/planes-api.js';
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

  // Hidratar datos del plan si viene el parámetro plan en la URL
  if (planId) {
    try {
      const res = await obtenerPlanPorId(planId);
      if (res && res.plan) {
        const plan = res.plan;
        const comidas = Array.isArray(res.comidas) ? res.comidas : [];

        // Calcular totales acumulados de comidas y sus ítems
        let totalKcal = 0;
        let totalP = 0;
        let totalC = 0;
        let totalG = 0;

        comidas.forEach((comida) => {
          (comida.items || []).forEach((it) => {
            totalKcal += Number(it.kcal ?? it.calories ?? 0);
            totalP += Number(it.p ?? it.protein ?? 0);
            totalC += Number(it.c ?? it.carbs ?? 0);
            totalG += Number(it.g ?? it.fat ?? 0);
          });
        });

        if (totalKcal === 0 && (plan.target_calories || plan.kcal)) {
          totalKcal = Number(plan.target_calories ?? plan.kcal ?? 0);
          totalP = Number(plan.target_protein_g ?? plan.p ?? 0);
          totalC = Number(plan.target_carbs_g ?? plan.c ?? 0);
          totalG = Number(plan.target_fat_g ?? plan.g ?? 0);
        }

        const objetivoKcal = Number(plan.target_calories ?? plan.kcal ?? totalKcal);

        // Reparto de macronutrientes en base calórica (4P, 4C, 9G)
        const calP = totalP * 4;
        const calC = totalC * 4;
        const calG = totalG * 9;
        const calMacros = calP + calC + calG;

        let pctP = 29;
        let pctC = 39;
        let pctG = 32;

        if (calMacros > 0) {
          pctP = Math.round((calP / calMacros) * 100);
          pctC = Math.round((calC / calMacros) * 100);
          pctG = Math.max(0, 100 - pctP - pctC);
        }

        // Hidratar datos en el DOM
        const totalKcalEl = document.querySelector(SELECTORES.totalKcal);
        if (totalKcalEl) {
          totalKcalEl.textContent = Math.round(totalKcal).toLocaleString('es-AR');
        }

        const objetivoKcalEl = document.querySelector(SELECTORES.objetivoKcal);
        if (objetivoKcalEl) {
          objetivoKcalEl.textContent = `Objetivo ${Math.round(objetivoKcal).toLocaleString('es-AR')}`;
        }

        const repartoPEl = document.querySelector(SELECTORES.repartoP);
        if (repartoPEl) repartoPEl.style.width = `${pctP}%`;

        const repartoCEl = document.querySelector(SELECTORES.repartoC);
        if (repartoCEl) repartoCEl.style.width = `${pctC}%`;

        const repartoGEl = document.querySelector(SELECTORES.repartoG);
        if (repartoGEl) repartoGEl.style.width = `${pctG}%`;

        const macroPEl = document.querySelector(SELECTORES.macroP);
        if (macroPEl) {
          macroPEl.textContent = `${Math.round(totalP)} `;
          const unidad = document.createElement('span');
          unidad.className = 'unidad';
          unidad.textContent = `g · ${pctP} %`;
          macroPEl.appendChild(unidad);
        }

        const macroCEl = document.querySelector(SELECTORES.macroC);
        if (macroCEl) {
          macroCEl.textContent = `${Math.round(totalC)} `;
          const unidad = document.createElement('span');
          unidad.className = 'unidad';
          unidad.textContent = `g · ${pctC} %`;
          macroCEl.appendChild(unidad);
        }

        const macroGEl = document.querySelector(SELECTORES.macroG);
        if (macroGEl) {
          macroGEl.textContent = `${Math.round(totalG)} `;
          const unidad = document.createElement('span');
          unidad.className = 'unidad';
          unidad.textContent = `g · ${pctG} %`;
          macroGEl.appendChild(unidad);
        }

        const modalidadEl = document.querySelector(SELECTORES.modalidadTexto);
        if (modalidadEl) {
          modalidadEl.textContent = plan.name || plan.modalidad || 'Día único';
        }

        const notaLecturaEl = document.querySelector(SELECTORES.notaLectura);
        if (notaLecturaEl && plan.notes) {
          notaLecturaEl.textContent = plan.notes;
        }

        if (plan.created_at) {
          const vigenciaEl = document.querySelector(SELECTORES.vigenciaTexto);
          if (vigenciaEl) {
            const d = new Date(plan.created_at);
            if (!isNaN(d.getTime())) {
              vigenciaEl.textContent = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error al cargar plan archivado en plan-archivado-ui:', err);
    }
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
