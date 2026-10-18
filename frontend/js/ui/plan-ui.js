/* ==========================================================
   plan-ui.js — Controlador UI de visualización de Plan para el Alumno (plan.html)
   - Permite al alumno consultar su plan alimenticio activo asignado por su coach.
   - Lee y valida la estructura de comidas, macronutrientes, hidratación y pautas.
   - Prepara la arquitectura para carga asíncrona de datos desde Supabase (cargarPlanActivo).
   - Control de acceso por rol 'alumno' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para pages/alumno/plan.html.
 */
export const SELECTORES = {
  acordeon: '.acordeon',
  acordeonTitulo: '.acordeon__titulo',
  acordeonKcal: '.acordeon__linea .negrita',
  acordeonMacros: '.acordeon__linea .sub',
  itemLectura: '.item-lectura',
  itemLecturaNombre: '.item-lectura__textos .negrita',
  itemLecturaDetalle: '.item-lectura__textos .sub',
  itemLecturaKcal: '.item-lectura .num',
  cardFija: '.card--fija',
  totalKcal: '.card--fija .card__fila .num--l',
  objetivoKcal: '.card--fija .card__fila .sub',
  repartoP: '.reparto .p',
  repartoC: '.reparto .c',
  repartoG: '.reparto .g',
  macrosNum: '.macros .macro .num',
  macroProteina: '.macros .macro:nth-child(1) .num',
  macroCarbos: '.macros .macro:nth-child(2) .num',
  macroGrasas: '.macros .macro:nth-child(3) .num',
  tagEstado: '.tag--verde',
  versionTexto: '.card__fila .sub.negrita',
  vigenciaTexto: '.grilla-2 .columna:nth-child(1) .negrita',
  modalidadTexto: '.grilla-2 .columna:nth-child(2) .negrita',
  pautaTexto: '.tile--azul + div .negrita',
  suplementoTexto: '.tile--azul + div .sub',
  notaCoach: '.acordeon__cuerpo .nota'
};

/**
 * Lee los datos estructurados del plan directamente desde el DOM estático actual.
 * @returns {Object} Objeto con totales, comidas y pautas leídas del DOM.
 */
export function leerDatosPlanDOM() {
  const totalKcalEl = document.querySelector(SELECTORES.totalKcal);
  const objetivoKcalEl = document.querySelector(SELECTORES.objetivoKcal);
  const protEl = document.querySelector(SELECTORES.macroProteina);
  const carbEl = document.querySelector(SELECTORES.macroCarbos);
  const grasEl = document.querySelector(SELECTORES.macroGrasas);

  const totalKcal = totalKcalEl ? parseInt(totalKcalEl.textContent.replace(/\D/g, ''), 10) || 0 : 0;
  const objetivoMatch = objetivoKcalEl?.textContent?.match(/\d+[\d.]*/);
  const objetivoKcal = objetivoMatch ? parseInt(objetivoMatch[0].replace(/\./g, ''), 10) || 0 : 0;

  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  const comidas = [];

  acordeones.forEach((acordeon) => {
    const titulo = acordeon.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim() || '';
    const kcalTexto = acordeon.querySelector(SELECTORES.acordeonKcal)?.textContent?.trim() || '';
    const macrosTexto = acordeon.querySelector(SELECTORES.acordeonMacros)?.textContent?.trim() || '';
    const nota = acordeon.querySelector(SELECTORES.notaCoach)?.textContent?.trim() || '';

    const items = [];
    acordeon.querySelectorAll(SELECTORES.itemLectura).forEach((it) => {
      items.push({
        nombre: it.querySelector(SELECTORES.itemLecturaNombre)?.textContent?.trim() || '',
        detalle: it.querySelector(SELECTORES.itemLecturaDetalle)?.textContent?.trim() || '',
        kcal: it.querySelector(SELECTORES.itemLecturaKcal)?.textContent?.trim() || ''
      });
    });

    comidas.push({
      titulo,
      kcalTexto,
      macrosTexto,
      nota,
      items
    });
  });

  return {
    totalKcal,
    objetivoKcal,
    proteinas: protEl?.textContent?.trim() || '',
    carbohidratos: carbEl?.textContent?.trim() || '',
    grasas: grasEl?.textContent?.trim() || '',
    comidas
  };
}

/**
 * Stub preparado para consultar el plan activo asignado al alumno desde Supabase.
 * En modo desconectado o stub, devuelve los datos cargados en el DOM.
 * @param {string} [usuarioId] ID del usuario alumno autenticado.
 * @returns {Promise<Object>} Datos del plan activo.
 */
export async function cargarPlanActivo(usuarioId = null) {
  // Stub: actualmente lee del DOM estático.
  // Al enlazar con tablas Supabase:
  // const { data, error } = await supabase.from('planes').select('*').eq('alumno_id', usuarioId).eq('activo', true).single();
  return leerDatosPlanDOM();
}

/**
 * Renderiza los datos de un plan en los elementos del DOM.
 * @param {Object} plan Objeto con los datos del plan a volcar.
 */
export function renderizarPlan(plan) {
  if (!plan) return;

  if (plan.totalKcal) {
    const elKcal = document.querySelector(SELECTORES.totalKcal);
    if (elKcal) elKcal.textContent = plan.totalKcal.toLocaleString('es-AR');
  }

  if (plan.objetivoKcal) {
    const elObj = document.querySelector(SELECTORES.objetivoKcal);
    if (elObj) elObj.textContent = `Objetivo ${plan.objetivoKcal.toLocaleString('es-AR')}`;
  }
}

/**
 * Inicializa el controlador de la pantalla de visualización del plan.
 */
export async function iniciarPlan() {
  const cuenta = await exigirRol('alumno');
  if (!cuenta) return;

  try {
    const plan = await cargarPlanActivo(cuenta.usuarioId);
    renderizarPlan(plan);
  } catch (err) {
    // Si la lectura remota falla, se preserva el HTML estático intacto
    console.warn('plan-ui: Usando datos estáticos del plan:', err);
  }
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlan);
} else {
  iniciarPlan();
}
