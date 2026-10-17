/* ==========================================================
   nutricion-calc.js — Lógica matemática pura de nutrición
   - Cálculo de energía por Factores de Atwater (4P + 4C + 9G).
   - Evaluación termodinámica de consistencia con filtro de valores absurdos.
   - Adopción calórica basada en el principio de prudencia nutricional.
   - Proporciones nutricionales por masa de referencia (100 g).
   Módulo puro: sin dependencias de DOM ni efectos secundarios.
   ========================================================== */

/** Límite físico absoluto: 100 g de grasa pura = 900 kcal. */
export const MAX_KCAL_POR_100G = 900;

/** Límite físico de masa: la suma de macros no puede exceder la masa total. */
export const MAX_GRAMOS_MACROS = 100;

/** Tolerancia porcentual para considerar coincidencia directa (Zona Verde). */
export const TOLERANCIA_VERDE_PORCENTAJE = 10;

/** Tolerancia fija en kcal para considerar coincidencia directa (Zona Verde). */
export const TOLERANCIA_VERDE_KCAL = 15;

/** Límite de discrepancia aceptable antes de considerar error de escala (Zona Naranja). */
export const TOLERANCIA_NARANJA_PORCENTAJE = 25;

/**
 * Convierte un valor numérico o texto con coma/punto a número finito seguro.
 * @param {number|string} valor - Valor a sanitizar.
 * @returns {number} Número parseado o 0 si no es válido.
 */
export function aNumeroSeguro(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }
  if (!valor || typeof valor !== 'string') return 0;
  const limpio = valor.trim().replace(',', '.');
  const num = parseFloat(limpio);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Calcula el aporte calórico teórico según los factores estándar de Atwater:
 * 4 kcal por gramo de proteína, 4 kcal por gramo de carbohidrato, 9 kcal por gramo de grasa.
 *
 * @param {number|string} p - Gramos de proteínas.
 * @param {number|string} c - Gramos de carbohidratos.
 * @param {number|string} g - Gramos de grasas.
 * @returns {{
 *   kcalCalculadas: number,
 *   kcalP: number,
 *   kcalC: number,
 *   kcalG: number,
 *   porcentajeP: number,
 *   porcentajeC: number,
 *   porcentajeG: number,
 *   masaTotalG: number
 * }}
 */
export function calcularAtwater(p, c, g) {
  const proteina = Math.max(0, aNumeroSeguro(p));
  const carbohidrato = Math.max(0, aNumeroSeguro(c));
  const grasa = Math.max(0, aNumeroSeguro(g));

  const kcalP = proteina * 4;
  const kcalC = carbohidrato * 4;
  const kcalG = grasa * 9;
  const kcalCalculadas = Math.round(kcalP + kcalC + kcalG);
  const masaTotalG = Math.round((proteina + carbohidrato + grasa) * 10) / 10;

  let porcentajeP = 0;
  let porcentajeC = 0;
  let porcentajeG = 0;

  if (kcalCalculadas > 0) {
    porcentajeP = Math.round((kcalP / kcalCalculadas) * 100);
    porcentajeC = Math.round((kcalC / kcalCalculadas) * 100);
    porcentajeG = Math.max(0, 100 - porcentajeP - porcentajeC);
  }

  return {
    kcalCalculadas,
    kcalP: Math.round(kcalP),
    kcalC: Math.round(kcalC),
    kcalG: Math.round(kcalG),
    porcentajeP,
    porcentajeC,
    porcentajeG,
    masaTotalG,
  };
}

/**
 * Evalúa la consistencia física y matemática entre las calorías declaradas en etiqueta
 * y las calculadas a partir de los macronutrientes.
 *
 * Aplica el principio de prudencia nutricional (adoptar el mayor entre declarado y calculado)
 * con guardas de plausibilidad física (bloquea valores absurdos como >900 kcal/100g o >100g de masa).
 *
 * @param {number|string} kcalDeclaradasInput - Calorías cargadas por el usuario.
 * @param {number|string} pInput - Proteínas por 100 g.
 * @param {number|string} cInput - Carbohidratos por 100 g.
 * @param {number|string} gInput - Grasas por 100 g.
 * @returns {{
 *   zona: 'vacio'|'verde'|'naranja'|'roja',
 *   valido: boolean,
 *   coincide: boolean,
 *   motivo: null|'incompleto'|'negativo'|'densidad_excesiva'|'masa_excesiva'|'discrepancia_grave',
 *   kcalDeclaradas: number,
 *   kcalCalculadas: number,
 *   kcalAdoptadas: number|null,
 *   diff: number,
 *   porcentajeDiff: number,
 *   mensaje: string
 * }}
 */
export function evaluarConsistencia(kcalDeclaradasInput, pInput, cInput, gInput) {
  // Si todos los campos están vacíos o no numéricos
  const strKcal = String(kcalDeclaradasInput ?? '').trim();
  const strP = String(pInput ?? '').trim();
  const strC = String(cInput ?? '').trim();
  const strG = String(gInput ?? '').trim();

  if (!strKcal && !strP && !strC && !strG) {
    return {
      zona: 'vacio',
      valido: true,
      coincide: true,
      motivo: 'incompleto',
      kcalDeclaradas: 0,
      kcalCalculadas: 0,
      kcalAdoptadas: 0,
      diff: 0,
      porcentajeDiff: 0,
      mensaje: '',
    };
  }

  const rawKcal = aNumeroSeguro(strKcal);
  const rawP = aNumeroSeguro(strP);
  const rawC = aNumeroSeguro(strC);
  const rawG = aNumeroSeguro(strG);

  // 1. Guardas contra números negativos
  if (rawKcal < 0 || rawP < 0 || rawC < 0 || rawG < 0) {
    return {
      zona: 'roja',
      valido: false,
      coincide: false,
      motivo: 'negativo',
      kcalDeclaradas: rawKcal,
      kcalCalculadas: 0,
      kcalAdoptadas: null,
      diff: 0,
      porcentajeDiff: 100,
      mensaje: 'Los valores de calorías y macronutrientes no pueden ser negativos.',
    };
  }

  // 2. Guarda física de densidad calórica máxima: 100 g no pueden tener más de 900 kcal
  if (rawKcal > MAX_KCAL_POR_100G) {
    return {
      zona: 'roja',
      valido: false,
      coincide: false,
      motivo: 'densidad_excesiva',
      kcalDeclaradas: rawKcal,
      kcalCalculadas: 0,
      kcalAdoptadas: null,
      diff: rawKcal,
      porcentajeDiff: 100,
      mensaje: `100 g de alimento no pueden tener más de ${MAX_KCAL_POR_100G} kcal (límite de la grasa pura). Verificá que no hayas tipeado un número absurdo.`,
    };
  }

  // 3. Guarda física de masa total: P + C + G no pueden sumar más de 100 g
  const masaMacros = rawP + rawC + rawG;
  if (masaMacros > MAX_GRAMOS_MACROS) {
    return {
      zona: 'roja',
      valido: false,
      coincide: false,
      motivo: 'masa_excesiva',
      kcalDeclaradas: rawKcal,
      kcalCalculadas: 0,
      kcalAdoptadas: null,
      diff: Math.round(masaMacros - MAX_GRAMOS_MACROS),
      porcentajeDiff: 100,
      mensaje: `Los macros suman ${String(Math.round(masaMacros * 10) / 10).replace('.', ',')} g cada 100 g. No pueden superar los 100 g. Revisá que estés cargando valores por 100 g y no por porción.`,
    };
  }

  // 4. Cálculo de Atwater
  const atwater = calcularAtwater(rawP, rawC, rawG);
  const kcalCalc = atwater.kcalCalculadas;

  // Si los campos están incompletos (falta caloría o falta algún macronutriente)
  if (!strKcal || !strP || !strC || !strG) {
    return {
      zona: 'vacio',
      valido: true,
      coincide: true,
      motivo: 'incompleto',
      kcalDeclaradas: rawKcal,
      kcalCalculadas: kcalCalc,
      kcalAdoptadas: Math.max(rawKcal, kcalCalc),
      diff: Math.abs(rawKcal - kcalCalc),
      porcentajeDiff: 0,
      mensaje: '',
    };
  }

  const diff = Math.abs(rawKcal - kcalCalc);
  const base = Math.max(rawKcal, kcalCalc);
  const porcentajeDiff = base > 0 ? (diff / base) * 100 : 0;

  // Principio de prudencia: ante la duda, adoptar el valor mayor
  const kcalAdoptadas = Math.max(rawKcal, kcalCalc);

  // 5. ZONA VERDE: Coincidencia dentro de tolerancia legal (<= 10% o <= 15 kcal)
  if (porcentajeDiff <= TOLERANCIA_VERDE_PORCENTAJE || diff <= TOLERANCIA_VERDE_KCAL) {
    return {
      zona: 'verde',
      valido: true,
      coincide: true,
      motivo: null,
      kcalDeclaradas: rawKcal,
      kcalCalculadas: kcalCalc,
      kcalAdoptadas,
      diff,
      porcentajeDiff: Math.round(porcentajeDiff),
      mensaje: `Los macros suman ${kcalCalc} kcal: coincide con las calorías cargadas.`,
    };
  }

  // 6. ZONA NARANJA: Discrepancia moderada (10% a 25%)
  if (porcentajeDiff <= TOLERANCIA_NARANJA_PORCENTAJE) {
    return {
      zona: 'naranja',
      valido: true,
      coincide: false,
      motivo: null,
      kcalDeclaradas: rawKcal,
      kcalCalculadas: kcalCalc,
      kcalAdoptadas,
      diff,
      porcentajeDiff: Math.round(porcentajeDiff),
      mensaje: `Los macros suman ${kcalCalc} kcal y cargaste ${rawKcal} kcal. Por prudencia calórica, se adoptarán ${kcalAdoptadas} kcal.`,
    };
  }

  // 7. ZONA ROJA: Discrepancia grave (> 25%)
  return {
    zona: 'roja',
    valido: false,
    coincide: false,
    motivo: 'discrepancia_grave',
    kcalDeclaradas: rawKcal,
    kcalCalculadas: kcalCalc,
    kcalAdoptadas: null,
    diff,
    porcentajeDiff: Math.round(porcentajeDiff),
    mensaje: `Los macros suman ${kcalCalc} kcal y cargaste ${rawKcal} kcal. Hay una diferencia del ${Math.round(porcentajeDiff)}%. Revisá que los valores sean cada 100 g y no por porción.`,
  };
}

/**
 * Calcula la porción proporcional de un nutriente o caloría para una cantidad dada.
 * @param {number|string} cantidadGramos - Gramos consumidos o a calcular.
 * @param {number|string} base100g - Valor del nutriente cada 100 g.
 * @param {number} [decimales=1] - Cantidad de cifras decimales en el redondeo.
 * @returns {number} Valor proporcional redondeado.
 */
export function calcularProporcion(cantidadGramos, base100g, decimales = 1) {
  const g = Math.max(0, aNumeroSeguro(cantidadGramos));
  const base = Math.max(0, aNumeroSeguro(base100g));
  const factor = Math.pow(10, decimales);
  return Math.round(((g / 100) * base) * factor) / factor;
}
