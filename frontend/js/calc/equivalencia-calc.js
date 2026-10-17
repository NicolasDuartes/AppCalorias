/* ==========================================================
   equivalencia-calc.js — Motor analítico de equivalencias (Segunda Idea)
   - Cálculo cerrado en tiempo O(1) vía mediana ponderada exacta.
   - Pesos dinámicos autocalibrados según el perfil del objetivo (4P + 4C + 9G).
   - Redondeo práctico dual: masa (múltiplos de 5g) o unidades enteras.
   - Evaluación de Adherencia (%) y Similitud de Perfil (%).
   - Clasificación: 'equivalente', 'parcial', 'no'.
   Módulo puro en ES Modules: sin dependencias de DOM ni efectos secundarios.
   ========================================================== */

/**
 * Convierte un valor numérico o texto a número finito seguro (>= 0 si es positivo).
 * @param {*} valor
 * @param {number} [defecto=0]
 * @returns {number}
 */
export function aNumeroSeguro(valor, defecto = 0) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : defecto;
  }
  if (!valor || typeof valor !== 'string') return defecto;
  const limpio = valor.trim().replace(/,/g, '.');
  const num = parseFloat(limpio);
  return Number.isFinite(num) ? num : defecto;
}

/**
 * Calcula el perfil nutricional calórico relativo (fracciones entre 0 y 1).
 * Base de cálculo estándar Atwater: 4 kcal/g Proteína, 4 kcal/g Carbohidrato, 9 kcal/g Grasa.
 *
 * @param {number|string} p - Gramos de proteína.
 * @param {number|string} c - Gramos de carbohidrato.
 * @param {number|string} g - Gramos de grasa.
 * @returns {{ porcentajeP: number, porcentajeC: number, porcentajeG: number, porcentajeCH: number, energiaKcal: number }}
 */
export function calcularPerfilNutricional(p, c, g) {
  const prot = Math.max(0, aNumeroSeguro(p));
  const carb = Math.max(0, aNumeroSeguro(c));
  const gras = Math.max(0, aNumeroSeguro(g));

  const kcalP = prot * 4;
  const kcalC = carb * 4;
  const kcalG = gras * 9;
  const energiaKcal = kcalP + kcalC + kcalG;

  if (energiaKcal <= 0) {
    return {
      porcentajeP: 0,
      porcentajeC: 0,
      porcentajeG: 0,
      porcentajeCH: 0,
      energiaKcal: 0
    };
  }

  const porcentajeP = kcalP / energiaKcal;
  const porcentajeC = kcalC / energiaKcal;
  const porcentajeG = kcalG / energiaKcal;

  return {
    porcentajeP,
    porcentajeC,
    porcentajeG,
    porcentajeCH: porcentajeC,
    energiaKcal
  };
}

/**
 * Calcula los pesos de importancia dinámicos (w) a partir del perfil del objetivo A.
 * w1 = 0.20 (Energía total fija)
 * w2 = 0.80 * %P_A
 * w3 = 0.80 * %CH_A
 * w4 = 0.80 * %G_A
 * Garantiza sumatoria total w = 1.0 (cuando la suma de porcentajes es 1.0).
 *
 * @param {{ porcentajeP: number, porcentajeC: number, porcentajeG: number, porcentajeCH?: number }} perfilA
 * @returns {{ w1: number, w2: number, w3: number, w4: number, wC: number, wP: number, wCH: number, wG: number }}
 */
export function calcularPesosImportancia(perfilA) {
  const pA = perfilA && typeof perfilA === 'object' ? perfilA : {};
  const pctP = Math.max(0, aNumeroSeguro(pA.porcentajeP ?? pA.pctP ?? pA['%P_A']));
  const pctC = Math.max(0, aNumeroSeguro(pA.porcentajeC ?? pA.porcentajeCH ?? pA.pctC ?? pA.pctCH ?? pA['%CH_A']));
  const pctG = Math.max(0, aNumeroSeguro(pA.porcentajeG ?? pA.pctG ?? pA['%G_A']));

  const suma = pctP + pctC + pctG;
  let normP = pctP;
  let normC = pctC;
  let normG = pctG;

  if (suma > 0) {
    normP = pctP / suma;
    normC = pctC / suma;
    normG = pctG / suma;
  }

  const w1 = 0.20;
  const w2 = 0.80 * normP;
  const w3 = 0.80 * normC;
  const w4 = 0.80 * normG;

  return {
    w1,
    w2,
    w3,
    w4,
    wC: w1,
    wP: w2,
    wCH: w3,
    wG: w4
  };
}

/**
 * Calcula la mediana ponderada exacta de un conjunto de puntos (x, peso).
 * Minimiza analíticamente la función de pérdida L1 sum(p_i * |x_i - x|).
 *
 * @param {Array<{ x?: number, valor?: number, peso?: number, p?: number }>} puntos
 * @returns {number} Multiplicador óptimo x*.
 */
export function calcularMedianaPonderada(puntos) {
  if (!Array.isArray(puntos) || puntos.length === 0) {
    return 0;
  }

  // Filtrar elementos válidos con peso estrictamente positivo y x finito
  const validos = [];
  for (const item of puntos) {
    if (!item || typeof item !== 'object') continue;
    const xVal = item.x !== undefined ? aNumeroSeguro(item.x) : aNumeroSeguro(item.valor);
    const pVal = item.peso !== undefined ? aNumeroSeguro(item.peso) : aNumeroSeguro(item.p);
    if (Number.isFinite(xVal) && pVal > 0) {
      validos.push({ x: xVal, peso: pVal });
    }
  }

  if (validos.length === 0) {
    return 0;
  }

  // Ordenar ascendentemente por x
  validos.sort((a, b) => a.x - b.x);

  const pesoTotal = validos.reduce((acc, curr) => acc + curr.peso, 0);
  if (pesoTotal <= 0) {
    return validos[0].x;
  }

  const umbral = pesoTotal / 2;
  let acumulado = 0;

  for (const item of validos) {
    acumulado += item.peso;
    if (acumulado >= umbral - 1e-9) {
      return item.x;
    }
  }

  return validos[validos.length - 1].x;
}

/**
 * Calcula la equivalencia directa entre una comida objetivo (A) y un alimento alternativo (B).
 *
 * @param {Object} alimentoObjetivo - Alimento planificado.
 *   Puede contener: { kcal, proteinas, carbohidratos, grasas, gramos, porcion_g }
 * @param {Object} alimentoAlternativo - Alimento de reemplazo (valores cada 100 g).
 *   Puede contener: { id, nombre, kcal, proteinas, carbohidratos, grasas, unidad_g, unidad_nombre }
 * @returns {{
 *   gramos: number,
 *   unidades: number|null,
 *   textoCantidad: string,
 *   aportes: { kcal: number, proteinas: number, carbohidratos: number, grasas: number },
 *   adherencia: number,
 *   similitud: number,
 *   nivel: 'equivalente'|'parcial'|'no',
 *   mensajeDivergencia: string,
 *   xOptimo: number
 * }}
 */
export function calcularEquivalenciaDirecta(alimentoObjetivo, alimentoAlternativo) {
  const obj = alimentoObjetivo && typeof alimentoObjetivo === 'object' ? alimentoObjetivo : {};
  const alt = alimentoAlternativo && typeof alimentoAlternativo === 'object' ? alimentoAlternativo : {};

  // Determinar cantidad base de la comida objetivo (gramos)
  const qA = aNumeroSeguro(obj.gramos ?? obj.cantidad_g ?? obj.porcion_g ?? 100, 100);

  // Valores base de A: si se pasan gramos y los valores son cada 100g (o si es absoluto)
  const esAbsoluto = Boolean(obj.esAbsoluto || obj.absoluto || obj.es_absoluto);
  const factorEscalaA = esAbsoluto ? 1 : (qA / 100);

  let cA = Math.max(0, aNumeroSeguro(obj.cA ?? obj.C_A ?? (aNumeroSeguro(obj.kcal ?? obj.calorias ?? obj.calories) * factorEscalaA)));
  const pA = Math.max(0, aNumeroSeguro(obj.pA ?? obj.P_A ?? (aNumeroSeguro(obj.proteinas ?? obj.proteina ?? obj.protein ?? obj.p) * factorEscalaA)));
  const chA = Math.max(0, aNumeroSeguro(obj.chA ?? obj.CH_A ?? (aNumeroSeguro(obj.carbohidratos ?? obj.carbohidrato ?? obj.carbs ?? obj.c ?? obj.ch) * factorEscalaA)));
  const gA = Math.max(0, aNumeroSeguro(obj.gA ?? obj.G_A ?? (aNumeroSeguro(obj.grasas ?? obj.grasa ?? obj.fat ?? obj.g) * factorEscalaA)));

  // Fallback si kcal no vino pero hay macros en A
  if (cA === 0 && (pA > 0 || chA > 0 || gA > 0)) {
    cA = (4 * pA) + (4 * chA) + (9 * gA);
  }

  // Valores cada 100g del alimento alternativo B
  let cB = Math.max(0, aNumeroSeguro(alt.cB ?? alt.C_B ?? alt.kcal ?? alt.calorias ?? alt.calories));
  const pB = Math.max(0, aNumeroSeguro(alt.pB ?? alt.P_B ?? alt.proteinas ?? alt.proteina ?? alt.protein ?? alt.p));
  const chB = Math.max(0, aNumeroSeguro(alt.chB ?? alt.CH_B ?? alt.carbohidratos ?? alt.carbohidrato ?? alt.carbs ?? alt.c ?? alt.ch));
  const gB = Math.max(0, aNumeroSeguro(alt.gB ?? alt.G_B ?? alt.grasas ?? alt.grasa ?? alt.fat ?? alt.g));

  // Fallback si kcal no vino pero hay macros en B
  if (cB === 0 && (pB > 0 || chB > 0 || gB > 0)) {
    cB = (4 * pB) + (4 * chB) + (9 * gB);
  }

  const unidadG = Math.max(0, aNumeroSeguro(alt.unidad_g ?? alt.peso_unidad ?? alt.unidadG));
  const tieneUnidad = unidadG > 0;

  // 1. Perfiles nutricionales
  const perfilA = calcularPerfilNutricional(pA, chA, gA);
  const perfilB = calcularPerfilNutricional(pB, chB, gB);

  // 2. Pesos de importancia dinámicos (w)
  const pesos = calcularPesosImportancia(perfilA);

  // 3. Multiplicadores y ponderaciones para la Mediana Ponderada
  const puntos = [];

  // Componente Calórico (w1 = 0.20)
  if (cB > 0 && pesos.w1 > 0) {
    puntos.push({
      x: cA / cB,
      peso: pesos.w1 * cB
    });
  }

  // Componente Proteico (w2)
  if (pB > 0 && pesos.w2 > 0) {
    puntos.push({
      x: pA / pB,
      peso: pesos.w2 * (4 * pB)
    });
  }

  // Componente Carbohidratos (w3)
  if (chB > 0 && pesos.w3 > 0) {
    puntos.push({
      x: chA / chB,
      peso: pesos.w3 * (4 * chB)
    });
  }

  // Componente Grasas (w4)
  if (gB > 0 && pesos.w4 > 0) {
    puntos.push({
      x: gA / gB,
      peso: pesos.w4 * (9 * gB)
    });
  }

  // Si no se pudo armar ningún punto (ej. ambos alimentos vacíos o 0 macros)
  let xOptimo = 0;
  if (puntos.length > 0) {
    xOptimo = Math.max(0, calcularMedianaPonderada(puntos));
  } else if (cB > 0 && cA > 0) {
    xOptimo = cA / cB;
  }

  // 4. Redondeo Práctico
  let gramosFinales = 0;
  let unidadesFinales = null;
  let textoCantidad = '';

  const gramosTeoricos = xOptimo * 100;

  if (tieneUnidad) {
    // Redondeo a unidades enteras más cercanas (mínimo 1 si xOptimo > 0)
    unidadesFinales = gramosTeoricos > 0 ? Math.max(1, Math.round(gramosTeoricos / unidadG)) : 0;
    gramosFinales = unidadesFinales * unidadG;
    textoCantidad = `${unidadesFinales} u (${gramosFinales} g)`;
  } else {
    // Redondeo a múltiplos de 5g
    gramosFinales = gramosTeoricos > 0 ? Math.max(5, 5 * Math.round(gramosTeoricos / 5)) : 0;
    textoCantidad = `${gramosFinales} g`;
  }

  // 5. Aportes calculados con la cantidad final redondeada
  const factorAporte = gramosFinales / 100;
  const aportes = {
    kcal: Math.round(cB * factorAporte * 10) / 10,
    proteinas: Math.round(pB * factorAporte * 10) / 10,
    carbohidratos: Math.round(chB * factorAporte * 10) / 10,
    grasas: Math.round(gB * factorAporte * 10) / 10
  };

  // 6. Error Total Ponderado y Adherencia (%)
  // Error = sum( w_k * factor_k * |Objetivo_k - Aporte_k| ) / C_A
  let errorTotal = 0;
  const baseKcalObj = cA > 0 ? cA : (perfilA.energiaKcal > 0 ? perfilA.energiaKcal : 0);

  if (baseKcalObj > 0) {
    const errC = pesos.w1 * (Math.abs(cA - aportes.kcal) / baseKcalObj);
    const errP = pesos.w2 * ((4 * Math.abs(pA - aportes.proteinas)) / baseKcalObj);
    const errCH = pesos.w3 * ((4 * Math.abs(chA - aportes.carbohidratos)) / baseKcalObj);
    const errG = pesos.w4 * ((9 * Math.abs(gA - aportes.grasas)) / baseKcalObj);
    errorTotal = errC + errP + errCH + errG;
  } else {
    errorTotal = aportes.kcal > 0 ? 1 : 0;
  }

  const adherencia = Math.max(0, Math.min(100, Math.round((1 - errorTotal) * 100)));

  // 7. Similitud de Perfil (%)
  // Similitud = (1 - 0.5 * (|%P_A - %P_B| + |%CH_A - %CH_B| + |%G_A - %G_B|)) * 100
  let similitud = 100;
  if (perfilA.energiaKcal > 0 && perfilB.energiaKcal > 0) {
    const diffP = Math.abs(perfilA.porcentajeP - perfilB.porcentajeP);
    const diffC = Math.abs(perfilA.porcentajeC - perfilB.porcentajeC);
    const diffG = Math.abs(perfilA.porcentajeG - perfilB.porcentajeG);
    const l1Diff = diffP + diffC + diffG;
    similitud = Math.max(0, Math.min(100, Math.round((1 - 0.5 * l1Diff) * 100)));
  } else if (perfilA.energiaKcal === 0 && perfilB.energiaKcal === 0) {
    similitud = 100;
  } else {
    similitud = 0;
  }

  // 8. Determinación del Nivel de Equivalencia
  let nivel = 'no';
  if (adherencia >= 90 && similitud >= 75) {
    nivel = 'equivalente';
  } else if (adherencia >= 75 && similitud >= 60) {
    nivel = 'parcial';
  } else {
    nivel = 'no';
  }

  // 9. Mensaje de Divergencia explicativo
  let mensajeDivergencia = '';
  if (nivel === 'equivalente') {
    mensajeDivergencia = 'Excelente equivalencia nutricional con el alimento del plan.';
  } else if (nivel === 'parcial') {
    // Detectar nutriente con mayor discrepancia calórica
    const deltaKcalP = 4 * (aportes.proteinas - pA);
    const deltaKcalC = 4 * (aportes.carbohidratos - chA);
    const deltaKcalG = 9 * (aportes.grasas - gA);

    const divergencias = [
      { macro: 'proteína', diff: deltaKcalP, abs: Math.abs(deltaKcalP) },
      { macro: 'carbohidratos', diff: deltaKcalC, abs: Math.abs(deltaKcalC) },
      { macro: 'grasa', diff: deltaKcalG, abs: Math.abs(deltaKcalG) }
    ];
    divergencias.sort((a, b) => b.abs - a.abs);
    const principal = divergencias[0];

    if (principal.diff > 0) {
      mensajeDivergencia = `Esta opción aporta más ${principal.macro} que el plan original.`;
    } else {
      mensajeDivergencia = `Esta opción aporta menos ${principal.macro} que el plan original.`;
    }
  } else {
    mensajeDivergencia = 'Son alimentos con perfiles nutricionales muy diferentes. Conviene elegir una opción más parecida a la planificada.';
  }

  return {
    gramos: gramosFinales,
    unidades: unidadesFinales,
    textoCantidad,
    aportes,
    adherencia,
    similitud,
    nivel,
    mensajeDivergencia,
    xOptimo: Math.round(xOptimo * 1000) / 1000
  };
}
