/* ==========================================================
   plan-editor-ui.js — Controlador UI del Editor de Planes para Coach (plan-editor.html / plan-editor-vacio.html)
   - Permite al coach configurar comidas, porciones y notas para el plan de un alumno.
   - Cálculo reactivo e interactivo de macronutrientes y calorías por Atwater (4P + 4C + 9G).
   - Actualización en tiempo real del resumen fijo (.card--fija) con barra de progreso,
     diferencia con respecto al objetivo diario y suma acumulada de macros.
   - Eliminación reactiva de alimentos, enlaces contextuales a búsqueda y recepción MPA.
   - Control de acceso por rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { ALIMENTOS_PLAN_DEFECTO } from '../data/plan-defecto.js';
import { calcularAtwater, aNumeroSeguro } from '../calc/nutricion-calc.js';
import { mostrarAvisoFlotante, guardarAvisoToast } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plan-editor.html y plan-editor-vacio.html.
 */
export const SELECTORES = {
  acordeon: '.acordeon',
  acordeonTitulo: '.acordeon__titulo',
  acordeonLineaKcal: '.acordeon__linea .negrita',
  acordeonLineaMacros: '.acordeon__linea .sub',
  alimento: '.alimento',
  alimentoNombre: '.alimento__nombre',
  alimentoDatos: '.alimento__datos',
  alimentoInputCantidad: '.alimento__datos .input input',
  alimentoKcal: '.alimento__datos .num',
  alimentoMacros: '.alimento__macros',
  btnCambiar: '.alimento__cabecera .btn-accion[aria-label="Cambiar alimento"]',
  btnQuitar: '.alimento__cabecera .btn-accion--peligro, button[aria-label="Quitar alimento"]',
  btnAnadir: '.btn--punteado[href*="buscar-alimento.html"]',
  btnColacion: 'button.btn--punteado[data-aviso]',
  textareaNota: '.acordeon__cuerpo textarea',
  cardFija: '.card--fija',
  totalKcal: '.card--fija .num--m',
  objetivoTexto: '.card--fija .unidad',
  tagDiferencia: '.card--fija .tag',
  barraProgreso: '.card--fija .barra span',
  macroProteina: '.macros .macro:nth-child(1) .num',
  macroCarbos: '.macros .macro:nth-child(2) .num',
  macroGrasas: '.macros .macro:nth-child(3) .num',
  btnCancelar: '.grilla-2 a.btn--secundario, [data-volver]',
  btnGuardar: '.grilla-2 a.btn--primario',
  inputAgua: 'input[name="agua"]',
  textareaPautas: 'textarea[name="pautas"]',
  tplAlimentoEditor: '#tpl-alimento-editor'
};

/** Objetivo calórico estándar por defecto para calcular progresos. */
export const OBJETIVO_CALORICO_DEFECTO = 2060;

/**
 * Helper seguro para actualizar un elemento numérico con su unidad sin usar innerHTML.
 * @param {HTMLElement|null} el
 * @param {number|string} valor
 * @param {string} unidad
 */
function asignarValorConUnidad(el, valor, unidad) {
  if (!el) return;
  el.textContent = `${valor} `;
  const spanUnidad = document.createElement('span');
  spanUnidad.className = 'unidad';
  spanUnidad.textContent = unidad;
  el.appendChild(spanUnidad);
}

/**
 * Vincula los eventos reactivos de una fila de alimento (cambio de gramos y botón quitar).
 * @param {HTMLElement} filaAlimento
 */
export function vincularEventosAlimento(filaAlimento) {
  if (!filaAlimento || filaAlimento.dataset.eventosVinculados === 'true') return;
  filaAlimento.dataset.eventosVinculados = 'true';

  const inputCant = filaAlimento.querySelector(SELECTORES.alimentoInputCantidad);
  if (inputCant) {
    inputCant.addEventListener('input', () => {
      recalcularResumenPlan();
    });
  }

  const btnQuitar = filaAlimento.querySelector(SELECTORES.btnQuitar);
  if (btnQuitar) {
    btnQuitar.addEventListener('click', (evento) => {
      evento.stopPropagation();
      if (!filaAlimento.isConnected) return;
      filaAlimento.remove();
      mostrarAvisoFlotante('Alimento quitado de la comida.');
      recalcularResumenPlan();
    });
  }
}

/**
 * Inicializa los acordeones y alimentos en el editor con datos de referencia si están vacíos.
 */
export function hidratarAlimentosIniciales() {
  const acordeones = document.querySelectorAll(SELECTORES.acordeon);

  acordeones.forEach((acordeon) => {
    const titulo = acordeon.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim();
    if (!titulo) return;

    // Configurar siempre el botón "+ Añadir alimento" antes de verificar si hay filas (soporte vista vacía)
    const btnAnadir = acordeon.querySelector(SELECTORES.btnAnadir);
    if (btnAnadir) {
      btnAnadir.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(titulo)}`);
    }

    const infoDefecto = ALIMENTOS_PLAN_DEFECTO[titulo];
    if (!infoDefecto) return;

    const filaAlimento = acordeon.querySelector(SELECTORES.alimento);
    if (!filaAlimento) return;

    // Guardar referencia por 100g para recálculo dinámico
    const factor = infoDefecto.gramos > 0 ? (100 / infoDefecto.gramos) : 1;
    filaAlimento.dataset.kcal100 = String(infoDefecto.kcal * factor);
    filaAlimento.dataset.p100 = String(infoDefecto.p * factor);
    filaAlimento.dataset.c100 = String(infoDefecto.c * factor);
    filaAlimento.dataset.g100 = String(infoDefecto.g * factor);

    const nombreEl = filaAlimento.querySelector(SELECTORES.alimentoNombre);
    if (nombreEl && (nombreEl.textContent.trim() === 'Alimento' || !nombreEl.textContent.trim())) {
      nombreEl.textContent = infoDefecto.titulo;
    }

    const inputCant = filaAlimento.querySelector(SELECTORES.alimentoInputCantidad);
    if (inputCant && !inputCant.value) {
      inputCant.value = String(infoDefecto.gramos);
    }

    const kcalEl = filaAlimento.querySelector(SELECTORES.alimentoKcal);
    if (kcalEl && kcalEl.textContent.includes('—')) {
      asignarValorConUnidad(kcalEl, infoDefecto.kcal, 'kcal');
    }

    const macrosEl = filaAlimento.querySelector(SELECTORES.alimentoMacros);
    if (macrosEl && macrosEl.textContent.includes('—')) {
      macrosEl.textContent = `P ${infoDefecto.p} · C ${infoDefecto.c} · G ${infoDefecto.g}`;
    }

    const btnCambiar = filaAlimento.querySelector(SELECTORES.btnCambiar);
    if (btnCambiar) {
      btnCambiar.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(titulo)}&cambiar=1`);
    }

    vincularEventosAlimento(filaAlimento);
  });
}

export { hidratarAlimentosIniciales as inicializarAcordeones };

/**
 * Procesa el alimento pendiente en sessionStorage ('appcalorias_alimento_editor_pendiente')
 * proveniente de buscar-alimento.html y lo inserta en el acordeón correspondiente.
 * @returns {boolean} true si se insertó un alimento pendiente
 */
export function procesarAlimentoPendienteSession() {
  let raw = null;
  try {
    raw = sessionStorage.getItem('appcalorias_alimento_editor_pendiente');
  } catch {
    return false;
  }

  if (!raw) return false;

  let pendiente;
  try {
    pendiente = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  if (!pendiente || typeof pendiente !== 'object') {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  const comidaBuscada = (pendiente.comida || 'Almuerzo').trim().toLowerCase();
  const acordeones = Array.from(document.querySelectorAll(SELECTORES.acordeon));
  let acordeonDestino = acordeones.find((ac) => {
    const t = ac.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim().toLowerCase();
    return t === comidaBuscada;
  });

  if (!acordeonDestino) {
    acordeonDestino = acordeones.find((ac) => ac.querySelector(SELECTORES.acordeonLineaKcal) || ac.querySelector(SELECTORES.btnAnadir));
  }

  if (!acordeonDestino) {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  const tpl = document.querySelector(SELECTORES.tplAlimentoEditor);
  let nuevoAlimento;

  if (tpl && tpl.content) {
    const clon = tpl.content.cloneNode(true);
    nuevoAlimento = clon.querySelector(SELECTORES.alimento) || clon.firstElementChild;
  } else {
    nuevoAlimento = document.createElement('div');
    nuevoAlimento.className = 'alimento';

    const cabecera = document.createElement('div');
    cabecera.className = 'alimento__cabecera';
    const spanNombre = document.createElement('span');
    spanNombre.className = 'alimento__nombre';
    const linkCambiar = document.createElement('a');
    linkCambiar.className = 'btn-accion';
    linkCambiar.href = 'buscar-alimento.html';
    linkCambiar.setAttribute('aria-label', 'Cambiar alimento');
    const btnQuitar = document.createElement('button');
    btnQuitar.className = 'btn-accion btn-accion--peligro';
    btnQuitar.type = 'button';
    btnQuitar.setAttribute('aria-label', 'Quitar alimento');
    cabecera.append(spanNombre, linkCambiar, btnQuitar);

    const datos = document.createElement('div');
    datos.className = 'alimento__datos';
    const wrapInput = document.createElement('span');
    wrapInput.className = 'input input--derecha';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', 'Cantidad');
    const unidadG = document.createElement('span');
    unidadG.className = 'unidad';
    unidadG.textContent = 'g';
    wrapInput.append(input, unidadG);

    const spanKcal = document.createElement('span');
    spanKcal.className = 'num num--s';
    const spanMacros = document.createElement('span');
    spanMacros.className = 'alimento__macros';
    datos.append(wrapInput, spanKcal, spanMacros);

    nuevoAlimento.append(cabecera, datos);
  }

  nuevoAlimento.dataset.kcal100 = String(aNumeroSeguro(pendiente.kcal100));
  nuevoAlimento.dataset.p100 = String(aNumeroSeguro(pendiente.p100));
  nuevoAlimento.dataset.c100 = String(aNumeroSeguro(pendiente.c100));
  nuevoAlimento.dataset.g100 = String(aNumeroSeguro(pendiente.g100));

  const nombreEl = nuevoAlimento.querySelector(SELECTORES.alimentoNombre);
  if (nombreEl) {
    nombreEl.textContent = pendiente.nombre || 'Alimento';
  }

  const inputCant = nuevoAlimento.querySelector(SELECTORES.alimentoInputCantidad);
  if (inputCant) {
    inputCant.value = String(Math.max(1, aNumeroSeguro(pendiente.gramos || 100)));
  }

  const tituloComida = acordeonDestino.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim() || pendiente.comida || 'Almuerzo';
  const btnCambiar = nuevoAlimento.querySelector(SELECTORES.btnCambiar);
  if (btnCambiar) {
    btnCambiar.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(tituloComida)}&cambiar=1`);
  }

  const btnAnadir = acordeonDestino.querySelector(SELECTORES.btnAnadir);
  const cuerpo = acordeonDestino.querySelector('.acordeon__cuerpo') || acordeonDestino;
  if (btnAnadir && btnAnadir.parentNode) {
    btnAnadir.parentNode.insertBefore(nuevoAlimento, btnAnadir);
  } else {
    cuerpo.appendChild(nuevoAlimento);
  }

  acordeonDestino.open = true;
  vincularEventosAlimento(nuevoAlimento);

  sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');

  recalcularComida(acordeonDestino);
  recalcularResumenPlan();
  return true;
}

/**
 * Recalcula los macros de un alimento específico en base a los gramos ingresados.
 * @param {HTMLElement} alimentoEl Contenedor del alimento
 * @returns {{kcal: number, p: number, c: number, g: number}}
 */
export function recalcularFilaAlimento(alimentoEl) {
  const inputCant = alimentoEl.querySelector(SELECTORES.alimentoInputCantidad);
  const cantGramos = Math.max(0, aNumeroSeguro(inputCant?.value || 0));

  const p100 = aNumeroSeguro(alimentoEl.dataset.p100 || 0);
  const c100 = aNumeroSeguro(alimentoEl.dataset.c100 || 0);
  const g100 = aNumeroSeguro(alimentoEl.dataset.g100 || 0);

  const factor = cantGramos / 100;
  const pActual = Math.round(p100 * factor);
  const cActual = Math.round(c100 * factor);
  const gActual = Math.round(g100 * factor);

  // Cálculo Atwater puro
  const atwater = calcularAtwater(pActual, cActual, gActual);
  const kcalActual = atwater.kcalCalculadas;

  const kcalEl = alimentoEl.querySelector(SELECTORES.alimentoKcal);
  asignarValorConUnidad(kcalEl, kcalActual, 'kcal');

  const macrosEl = alimentoEl.querySelector(SELECTORES.alimentoMacros);
  if (macrosEl) {
    macrosEl.textContent = `P ${pActual} · C ${cActual} · G ${gActual}`;
  }

  return { kcal: kcalActual, p: pActual, c: cActual, g: gActual };
}

/**
 * Recalcula la cabecera de una comida (acordeón) sumando todos sus alimentos.
 * @param {HTMLElement} acordeonEl
 */
export function recalcularComida(acordeonEl) {
  const alimentos = acordeonEl.querySelectorAll(SELECTORES.alimento);
  let sumaKcal = 0;
  let sumaP = 0;
  let sumaC = 0;
  let sumaG = 0;

  alimentos.forEach((alim) => {
    const res = recalcularFilaAlimento(alim);
    sumaKcal += res.kcal;
    sumaP += res.p;
    sumaC += res.c;
    sumaG += res.g;
  });

  const lineaKcalEl = acordeonEl.querySelector(SELECTORES.acordeonLineaKcal);
  if (lineaKcalEl) {
    lineaKcalEl.textContent = `${sumaKcal} kcal`;
  }

  const lineaMacrosEl = acordeonEl.querySelector(SELECTORES.acordeonLineaMacros);
  if (lineaMacrosEl) {
    lineaMacrosEl.textContent = alimentos.length > 0
      ? `P ${sumaP} · C ${sumaC} · G ${sumaG}`
      : 'Sin alimentos';
  }

  return { kcal: sumaKcal, p: sumaP, c: sumaC, g: sumaG };
}

/**
 * Recalcula el resumen fijo completo del plan (.card--fija).
 */
export function recalcularResumenPlan() {
  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  let totalKcal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalG = 0;

  acordeones.forEach((ac) => {
    // Solo procesar acordeones de comidas (que tengan acordeonLineaKcal)
    if (ac.querySelector(SELECTORES.acordeonLineaKcal)) {
      const res = recalcularComida(ac);
      totalKcal += res.kcal;
      totalP += res.p;
      totalC += res.c;
      totalG += res.g;
    }
  });

  // 1. Total Kcal
  const totalKcalEl = document.querySelector(SELECTORES.totalKcal);
  if (totalKcalEl) {
    totalKcalEl.textContent = totalKcal.toLocaleString('es-AR');
  }

  // 2. Objetivo
  const objTexto = document.querySelector(SELECTORES.objetivoTexto)?.textContent || '';
  const matchObj = objTexto.match(/\d+[\d.]*/);
  const objetivoKcal = matchObj ? parseInt(matchObj[0].replace(/\./g, ''), 10) : OBJETIVO_CALORICO_DEFECTO;

  // 3. Tag diferencia
  const tagDif = document.querySelector(SELECTORES.tagDiferencia);
  if (tagDif) {
    const dif = objetivoKcal - totalKcal;
    if (dif > 0) {
      tagDif.className = 'tag tag--naranja';
      tagDif.textContent = `Faltan ${dif} kcal`;
    } else if (dif === 0) {
      tagDif.className = 'tag tag--verde';
      tagDif.textContent = 'Objetivo cumplido';
    } else {
      tagDif.className = 'tag tag--naranja';
      tagDif.textContent = `Exceso de ${Math.abs(dif)} kcal`;
    }
  }

  // 4. Barra de progreso
  const barra = document.querySelector(SELECTORES.barraProgreso);
  if (barra) {
    const porcentaje = objetivoKcal > 0 ? Math.min(100, Math.round((totalKcal / objetivoKcal) * 100)) : 0;
    barra.style.width = `${porcentaje}%`;
  }

  // 5. Macros acumulados
  asignarValorConUnidad(document.querySelector(SELECTORES.macroProteina), totalP, 'g');
  asignarValorConUnidad(document.querySelector(SELECTORES.macroCarbos), totalC, 'g');
  asignarValorConUnidad(document.querySelector(SELECTORES.macroGrasas), totalG, 'g');
}

/**
 * Inicializa el controlador del editor de planes.
 */
export async function iniciarPlanEditor() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  hidratarAlimentosIniciales();
  procesarAlimentoPendienteSession();
  recalcularResumenPlan();

  // Escuchar cambios reactivos en inputs de gramos (delegación de respaldo)
  document.addEventListener('input', (evento) => {
    if (evento.target.closest(SELECTORES.alimentoInputCantidad)) {
      recalcularResumenPlan();
    }
  });

  // Manejar eliminación de alimentos (delegación de respaldo)
  document.addEventListener('click', (evento) => {
    const btnQuitar = evento.target.closest(SELECTORES.btnQuitar);
    if (!btnQuitar) return;

    const filaAlimento = btnQuitar.closest(SELECTORES.alimento);
    if (filaAlimento && filaAlimento.isConnected) {
      filaAlimento.remove();
      mostrarAvisoFlotante('Alimento quitado de la comida.');
      recalcularResumenPlan();
    }
  });

  // Confirmación al guardar y asignar plan
  const btnGuardar = document.querySelector(SELECTORES.btnGuardar);
  if (btnGuardar) {
    btnGuardar.addEventListener('click', () => {
      guardarAvisoToast('Plan guardado y asignado con éxito.');
    });
  }
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlanEditor);
} else {
  iniciarPlanEditor();
}
