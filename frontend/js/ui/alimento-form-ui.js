/* ==========================================================
   alimento-form-ui.js — Controlador de validación reactiva de alimentos
   - Valida la relación termodinámica entre calorías y macronutrientes (4P + 4C + 9G).
   - Bloquea valores absurdos o físicamente imposibles (>900 kcal/100g, masa >100g).
   - Aplica sanitización decimal en tiempo real.
   - Sincroniza anuncios accesibles en los bloques de mensaje y alerta.
   ========================================================== */

import { evaluarConsistencia } from '../calc/nutricion-calc.js';
import { normalizarDecimal } from '../calc/formato-calc.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para crear-alimento.html y editar-alimento.html.
 */
export const SELECTORES = {
  form: '#form-alimento',
  inputNombre: 'input[name="nombre"]',
  inputMarca: 'input[name="marca"]',
  inputKcal: 'input[name="kcal"]',
  inputP: 'input[name="p"]',
  inputC: 'input[name="c"]',
  inputG: 'input[name="g"]',
  inputGramosUnidad: 'input[name="gramosUnidad"]',
  mensajeOk: '.mensaje[data-tipo="ok"]',
  mensajeAviso: '.aviso'
};

/**
 * Inicializa la validación reactiva en el formulario de alimento (#form-alimento).
 */
export function iniciarValidadorAlimento() {
  const form = document.querySelector(SELECTORES.form);
  if (!form) return;

  const inputKcal = form.querySelector(SELECTORES.inputKcal);
  const inputP = form.querySelector(SELECTORES.inputP);
  const inputC = form.querySelector(SELECTORES.inputC);
  const inputG = form.querySelector(SELECTORES.inputG);

  const mensajeOk = form.querySelector(SELECTORES.mensajeOk);
  const mensajeAviso = form.querySelector(SELECTORES.mensajeAviso);
  const spanTextoOk = mensajeOk?.querySelector('span') || mensajeOk;
  const spanTextoAviso = mensajeAviso?.querySelector('span') || mensajeAviso;

  if (!inputKcal || !inputP || !inputC || !inputG) return;

  const inputNombre = form.querySelector(SELECTORES.inputNombre);
  const inputMarca = form.querySelector(SELECTORES.inputMarca);
  const inputGramosUnidad = form.querySelector(SELECTORES.inputGramosUnidad);

  // Si se reciben valores por query string (ej. editar-alimento.html), precargarlos
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('nombre') && inputNombre && !inputNombre.value) inputNombre.value = params.get('nombre') || '';
    if (params.has('marca') && inputMarca && !inputMarca.value) inputMarca.value = params.get('marca') || '';
    if (params.has('kcal') && !inputKcal.value) inputKcal.value = params.get('kcal') || '';
    if (params.has('p') && !inputP.value) inputP.value = params.get('p') || '';
    if (params.has('c') && !inputC.value) inputC.value = params.get('c') || '';
    if (params.has('g') && !inputG.value) inputG.value = params.get('g') || '';
    if (params.has('gramosUnidad') && inputGramosUnidad && !inputGramosUnidad.value) inputGramosUnidad.value = params.get('gramosUnidad') || '';
  } catch {
    // Ignorar si URLSearchParams falla
  }

  let ultimaEvaluacion = null;

  function validarEnTiempoReal() {
    const rawKcal = inputKcal.value.trim();
    const rawP = inputP.value.trim();
    const rawC = inputC.value.trim();
    const rawG = inputG.value.trim();

    // Si los campos están completamente vacíos, ocultar alertas
    if (!rawKcal && !rawP && !rawC && !rawG) {
      if (mensajeOk) mensajeOk.hidden = true;
      if (mensajeAviso) mensajeAviso.hidden = true;
      ultimaEvaluacion = null;
      return;
    }

    ultimaEvaluacion = evaluarConsistencia(rawKcal, rawP, rawC, rawG);

    if (ultimaEvaluacion.zona === 'vacio') {
      if (mensajeOk) mensajeOk.hidden = true;
      if (mensajeAviso) mensajeAviso.hidden = true;
      return;
    }

    if (ultimaEvaluacion.zona === 'verde') {
      if (mensajeOk) {
        if (spanTextoOk) spanTextoOk.textContent = ultimaEvaluacion.mensaje;
        mensajeOk.hidden = false;
      }
      if (mensajeAviso) mensajeAviso.hidden = true;
      return;
    }

    // Zona Naranja (discrepancia moderada) o Roja (error grave o absurdo)
    if (mensajeOk) mensajeOk.hidden = true;
    if (mensajeAviso) {
      if (spanTextoAviso) spanTextoAviso.textContent = ultimaEvaluacion.mensaje;
      mensajeAviso.hidden = false;
    }
  }

  // Sanitización y validación en cada tipeo
  const camposInputs = [inputKcal, inputP, inputC, inputG];
  if (inputGramosUnidad) camposInputs.push(inputGramosUnidad);

  camposInputs.forEach((input) => {
    input.addEventListener('input', (evento) => {
      const cursor = evento.target.selectionStart;
      const original = evento.target.value;
      const normalizado = normalizarDecimal(original);

      if (original !== normalizado) {
        evento.target.value = normalizado;
        // Restaurar posición relativa del cursor si es posible
        try {
          evento.target.setSelectionRange(cursor, cursor);
        } catch {
          // Ignorar en inputs donde setSelectionRange no aplique
        }
      }

      validarEnTiempoReal();
    });
  });

  // Validar al cargar si los campos ya vienen con datos (ej. editar-alimento.html)
  validarEnTiempoReal();

  // Validación estricta previa al envío
  form.addEventListener('submit', (evento) => {
    if (inputNombre && !inputNombre.value.trim()) {
      evento.preventDefault();
      evento.stopPropagation();
      mostrarAvisoFlotante('Ingresá el nombre del alimento.');
      inputNombre.focus();
      return;
    }

    const rawKcal = inputKcal.value.trim();
    const rawP = inputP.value.trim();
    const rawC = inputC.value.trim();
    const rawG = inputG.value.trim();

    if (!rawKcal || !rawP || !rawC || !rawG) {
      evento.preventDefault();
      evento.stopPropagation();
      mostrarAvisoFlotante('Completá las calorías y los tres macronutrientes cada 100 g.');
      if (!rawKcal) inputKcal.focus();
      else if (!rawP) inputP.focus();
      else if (!rawC) inputC.focus();
      else inputG.focus();
      return;
    }

    const evalFinal = evaluarConsistencia(rawKcal, rawP, rawC, rawG);

    if (evalFinal.zona === 'roja') {
      evento.preventDefault();
      evento.stopPropagation();

      if (mensajeAviso) {
        if (spanTextoAviso) spanTextoAviso.textContent = evalFinal.mensaje;
        mensajeAviso.hidden = false;
        mensajeAviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      mostrarAvisoFlotante('Revisá los valores: hay inconsistencias nutricionales en la carga.');
      if (evalFinal.motivo === 'densidad_excesiva') {
        inputKcal.focus();
      } else {
        inputP.focus();
      }
      return;
    }

    // Principio de prudencia nutricional: si es válido y hay calorías adoptadas,
    // reflejar el valor adoptado en el campo antes de enviar el formulario.
    if (evalFinal.valido && evalFinal.kcalAdoptadas != null && evalFinal.kcalAdoptadas >= 0) {
      inputKcal.value = String(evalFinal.kcalAdoptadas);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarValidadorAlimento);
} else {
  iniciarValidadorAlimento();
}
