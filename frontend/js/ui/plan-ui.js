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
import { obtenerPlanActivo } from '../data/planes-api.js';
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
 * Crea un elemento DOM para un ítem de comida en modo lectura (cero innerHTML inseguro).
 * @param {Object} item
 * @returns {HTMLDivElement}
 */
function crearElementoItemLectura(item) {
  const itemEl = document.createElement('div');
  itemEl.className = 'item-lectura';

  const textos = document.createElement('span');
  textos.className = 'item-lectura__textos';

  const negrita = document.createElement('span');
  negrita.className = 'negrita texto-15';
  negrita.textContent = item.nombre || item.food_name || 'Alimento';

  const sub = document.createElement('span');
  sub.className = 'sub';
  if (item.detalle) {
    sub.textContent = item.detalle;
  } else {
    const g = Number(item.gramos ?? item.grams ?? 100);
    const p = Math.round(Number(item.p ?? item.protein ?? 0));
    const c = Math.round(Number(item.c ?? item.carbs ?? 0));
    const fat = Math.round(Number(item.g ?? item.fat ?? 0));
    sub.textContent = `${g} g · P ${p} · C ${c} · G ${fat}`;
  }

  textos.appendChild(negrita);
  textos.appendChild(sub);

  const numEl = document.createElement('span');
  numEl.className = 'num num--s';
  const kcalVal = Math.round(Number(item.kcal ?? item.calories ?? 0));
  numEl.textContent = `${kcalVal} `;

  const unidad = document.createElement('span');
  unidad.className = 'unidad';
  unidad.textContent = 'kcal';
  numEl.appendChild(unidad);

  itemEl.appendChild(textos);
  itemEl.appendChild(numEl);
  return itemEl;
}

/**
 * Actualiza los acordeones del DOM con los ítems y totales de cada comida del plan.
 * @param {Array<Object>} comidas
 */
export function actualizarAcordeonesPlan(comidas) {
  if (!Array.isArray(comidas) || comidas.length === 0) return;

  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  if (acordeones.length === 0) return;

  acordeones.forEach((acordeon, idx) => {
    const tituloEl = acordeon.querySelector(SELECTORES.acordeonTitulo);
    const tituloTexto = tituloEl?.textContent?.trim().toLowerCase() || '';

    const comida = comidas.find((c) => {
      const nombreComida = (c.nombre || c.meal_type || c.titulo || '').toLowerCase();
      return nombreComida && (tituloTexto.includes(nombreComida) || nombreComida.includes(tituloTexto));
    }) || comidas[idx];

    if (!comida) return;

    const kcalEl = acordeon.querySelector(SELECTORES.acordeonKcal);
    if (kcalEl && comida.kcalTexto) {
      kcalEl.textContent = comida.kcalTexto;
    }

    const macrosEl = acordeon.querySelector(SELECTORES.acordeonMacros);
    if (macrosEl && comida.macrosTexto) {
      macrosEl.textContent = comida.macrosTexto;
    }

    const notaEl = acordeon.querySelector(SELECTORES.notaCoach);
    if (notaEl && (comida.nota || comida.notas || comida.notes)) {
      notaEl.textContent = comida.nota || comida.notas || comida.notes;
    }

    if (Array.isArray(comida.items) && comida.items.length > 0) {
      const primerItem = acordeon.querySelector(SELECTORES.itemLectura);
      const contenedor = primerItem ? primerItem.parentElement : null;
      if (contenedor) {
        contenedor.textContent = '';
        comida.items.forEach((it) => {
          contenedor.appendChild(crearElementoItemLectura(it));
        });
      }
    }
  });
}

/**
 * Consulta el plan activo asignado al alumno desde Supabase vía planes-api.js.
 * Si no hay plan en Supabase o falla la conexión, devuelve como fallback leerDatosPlanDOM().
 * @param {string} [usuarioId] ID del usuario alumno autenticado.
 * @returns {Promise<Object>} Datos del plan activo estructurados para renderizarPlan().
 */
export async function cargarPlanActivo(usuarioId = null) {
  try {
    if (!usuarioId) {
      return leerDatosPlanDOM();
    }

    const res = await obtenerPlanActivo(usuarioId);
    if (!res || !res.plan) {
      return leerDatosPlanDOM();
    }

    const plan = res.plan;
    const comidasRaw = Array.isArray(res.comidas) ? res.comidas : [];

    let totalKcal = 0;
    let totalP = 0;
    let totalC = 0;
    let totalG = 0;

    const comidasMapeadas = comidasRaw.map((com, idx) => {
      let comKcal = 0;
      let comP = 0;
      let comC = 0;
      let comG = 0;

      const rawItems = Array.isArray(com.items) ? com.items : [];
      const items = rawItems.map((it) => {
        const k = Number(it.kcal ?? it.calories ?? 0);
        const p = Number(it.p ?? it.protein ?? 0);
        const c = Number(it.c ?? it.carbs ?? 0);
        const g = Number(it.g ?? it.fat ?? 0);
        const gramos = Number(it.gramos ?? it.grams ?? 100);

        comKcal += k;
        comP += p;
        comC += c;
        comG += g;

        return {
          nombre: it.nombre || it.food_name || 'Alimento',
          detalle: `${gramos} g · P ${Math.round(p)} · C ${Math.round(c)} · G ${Math.round(g)}`,
          kcal: String(Math.round(k)),
          gramos,
          p,
          c,
          g
        };
      });

      totalKcal += comKcal;
      totalP += comP;
      totalC += comC;
      totalG += comG;

      const titulo = com.nombre || com.meal_type || `Comida ${idx + 1}`;
      const kcalTexto = `${Math.round(comKcal)} kcal`;
      const macrosTexto = `P ${Math.round(comP)} · C ${Math.round(comC)} · G ${Math.round(comG)}`;
      const nota = com.notas || com.notes || '';

      return {
        titulo,
        kcalTexto,
        macrosTexto,
        nota,
        items
      };
    });

    if (totalKcal === 0 && (plan.target_calories || plan.kcal)) {
      totalKcal = Number(plan.target_calories ?? plan.kcal ?? 0);
      totalP = Number(plan.target_protein_g ?? plan.p ?? 0);
      totalC = Number(plan.target_carbs_g ?? plan.c ?? 0);
      totalG = Number(plan.target_fat_g ?? plan.g ?? 0);
    }

    const objetivoKcal = Number(plan.target_calories ?? plan.kcal ?? totalKcal);

    // Reparto en base a calorías (4P, 4C, 9G)
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

    // Actualizar los acordeones del DOM con los ítems y totales de cada comida
    actualizarAcordeonesPlan(comidasMapeadas);

    let vigenciaTexto = undefined;
    if (plan.created_at) {
      const d = new Date(plan.created_at);
      if (!isNaN(d.getTime())) {
        vigenciaTexto = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    return {
      totalKcal: Math.round(totalKcal),
      objetivoKcal: Math.round(objetivoKcal),
      proteinas: Math.round(totalP),
      carbohidratos: Math.round(totalC),
      grasas: Math.round(totalG),
      repartoP: pctP,
      repartoC: pctC,
      repartoG: pctG,
      modalidad: plan.name || plan.modalidad || 'Día único',
      vigencia: vigenciaTexto,
      comidas: comidasMapeadas
    };
  } catch (err) {
    console.warn('Error al cargar plan activo desde Supabase, usando datos estáticos:', err);
    return leerDatosPlanDOM();
  }
}

/**
 * Renderiza los datos de un plan en los elementos del DOM.
 * @param {Object} plan Objeto con los datos del plan a volcar.
 */
export function renderizarPlan(plan) {
  if (!plan) return;

  if (plan.totalKcal != null) {
    const elKcal = document.querySelector(SELECTORES.totalKcal);
    if (elKcal) elKcal.textContent = Math.round(Number(plan.totalKcal)).toLocaleString('es-AR');
  }

  if (plan.objetivoKcal != null) {
    const elObj = document.querySelector(SELECTORES.objetivoKcal);
    if (elObj) elObj.textContent = `Objetivo ${Math.round(Number(plan.objetivoKcal)).toLocaleString('es-AR')}`;
  }

  if (plan.repartoP != null) {
    const elP = document.querySelector(SELECTORES.repartoP);
    if (elP) elP.style.width = `${plan.repartoP}%`;
  }
  if (plan.repartoC != null) {
    const elC = document.querySelector(SELECTORES.repartoC);
    if (elC) elC.style.width = `${plan.repartoC}%`;
  }
  if (plan.repartoG != null) {
    const elG = document.querySelector(SELECTORES.repartoG);
    if (elG) elG.style.width = `${plan.repartoG}%`;
  }

  if (plan.proteinas != null) {
    const elProt = document.querySelector(SELECTORES.macroProteina);
    if (elProt) {
      if (typeof plan.proteinas === 'number') {
        elProt.textContent = `${Math.round(plan.proteinas)} `;
        const u = document.createElement('span');
        u.className = 'unidad';
        u.textContent = `g · ${plan.repartoP ?? 29} %`;
        elProt.appendChild(u);
      } else {
        elProt.textContent = String(plan.proteinas);
      }
    }
  }

  if (plan.carbohidratos != null) {
    const elCarb = document.querySelector(SELECTORES.macroCarbos);
    if (elCarb) {
      if (typeof plan.carbohidratos === 'number') {
        elCarb.textContent = `${Math.round(plan.carbohidratos)} `;
        const u = document.createElement('span');
        u.className = 'unidad';
        u.textContent = `g · ${plan.repartoC ?? 39} %`;
        elCarb.appendChild(u);
      } else {
        elCarb.textContent = String(plan.carbohidratos);
      }
    }
  }

  if (plan.grasas != null) {
    const elGras = document.querySelector(SELECTORES.macroGrasas);
    if (elGras) {
      if (typeof plan.grasas === 'number') {
        elGras.textContent = `${Math.round(plan.grasas)} `;
        const u = document.createElement('span');
        u.className = 'unidad';
        u.textContent = `g · ${plan.repartoG ?? 32} %`;
        elGras.appendChild(u);
      } else {
        elGras.textContent = String(plan.grasas);
      }
    }
  }

  if (plan.modalidad) {
    const elMod = document.querySelector(SELECTORES.modalidadTexto);
    if (elMod) elMod.textContent = plan.modalidad;
  }

  if (plan.vigencia) {
    const elVig = document.querySelector(SELECTORES.vigenciaTexto);
    if (elVig) elVig.textContent = plan.vigencia;
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
