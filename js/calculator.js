// Funciones matemáticas y lógicas de cálculo de calorías, TDEE, macros y tolerancias
// Basado fielmente en las fórmulas de "Calculadora Nico Duartes.xlsx"

import { FOOD_CATEGORIES, TOLERANCES } from './data.js';

/**
 * 1) Metabolismo Basal (BMR) - Ecuación Mifflin-St Jeor
 * Hombre: (10 * peso + 6.25 * altura - 5 * edad) + 5
 * Mujer:  (10 * peso + 6.25 * altura - 5 * edad) - 161
 */
export function calculateBMR(gender, weight, height, age) {
  const w = parseFloat(weight) || 0;
  const h = parseFloat(height) || 0;
  const a = parseFloat(age) || 0;

  if (w <= 0 || h <= 0 || a <= 0) return 0;

  const base = 10 * w + 6.25 * h - 5 * a;
  if (gender === 'Mujer') {
    return Math.round((base - 161) * 10) / 10;
  }
  return Math.round((base + 5) * 10) / 10;
}

/**
 * 2) Actividad diaria (NEAT)
 * NEAT = pasos * 0.04
 */
export function calculateNEAT(steps) {
  const s = parseFloat(steps) || 0;
  return Math.round(s * 0.04 * 10) / 10;
}

/**
 * 3) Gasto de entrenamiento (METs)
 * Gasto por sesión = MET * peso * horas
 * Gasto por día = (Gasto por sesión * entrenos_semana) / 7
 */
export function calculateTrainingExpenditure(met, weight, hoursPerSession, sessionsPerWeek) {
  const m = parseFloat(met) || 0;
  const w = parseFloat(weight) || 0;
  const h = parseFloat(hoursPerSession) || 0;
  const s = parseFloat(sessionsPerWeek) || 0;

  const perSession = m * w * h;
  const perDay = (perSession * s) / 7;

  return {
    perSession: Math.round(perSession * 10) / 10,
    perDay: Math.round(perDay * 10) / 10
  };
}

/**
 * 4) Gasto total diario (TDEE) y TDEE + termogénesis (TEF)
 * TDEE = BMR + NEAT + gastoEntrenamientoPorDia
 * TDEE + termogénesis = TDEE + BMR * 0.1
 */
export function calculateTDEE(bmr, neat, trainingDailyExpenditure) {
  const rawTDEE = bmr + neat + trainingDailyExpenditure;
  const tef = bmr * 0.1;
  const tdeeWithTEF = rawTDEE + tef;

  return {
    tdee: Math.round(rawTDEE * 10) / 10,
    tef: Math.round(tef * 10) / 10,
    tdeeWithTEF: Math.round(tdeeWithTEF * 10) / 10
  };
}

/**
 * 5) Objetivos calóricos según contexto
 */
export function getContextOptions(tdeeWithTEF) {
  return {
    'Déficit moderado': Math.round((tdeeWithTEF - 500) * 10) / 10,
    'Déficit leve': Math.round((tdeeWithTEF - 300) * 10) / 10,
    'Mantenimiento': Math.round(tdeeWithTEF * 10) / 10,
    'Superávit leve': Math.round((tdeeWithTEF + 300) * 10) / 10,
    'Superávit moderado': Math.round((tdeeWithTEF + 500) * 10) / 10
  };
}

/**
 * 6) Macros requeridos a consumir según calorías objetivo
 * Proteínas: % P (4 kcal/g)
 * Grasas: % G (9 kcal/g)
 * Carbohidratos: % CH (4 kcal/g)
 */
export function calculateTargetMacros(calories, percentages = { protein: 18, fat: 23, carbs: 59 }) {
  const cal = parseFloat(calories) || 0;
  const pPerc = percentages.protein / 100;
  const fPerc = percentages.fat / 100;
  const cPerc = percentages.carbs / 100;

  const proteinKcal = cal * pPerc;
  const fatKcal = cal * fPerc;
  const carbsKcal = cal * cPerc;

  const proteinGrams = proteinKcal / 4;
  const fatGrams = fatKcal / 9;
  const carbsGrams = carbsKcal / 4;

  return {
    calories: cal,
    protein: {
      kcal: Math.round(proteinKcal * 10) / 10,
      grams: Math.round(proteinGrams * 10) / 10,
      percentage: percentages.protein
    },
    fat: {
      kcal: Math.round(fatKcal * 10) / 10,
      grams: Math.round(fatGrams * 10) / 10,
      percentage: percentages.fat
    },
    carbs: {
      kcal: Math.round(carbsKcal * 10) / 10,
      grams: Math.round(carbsGrams * 10) / 10,
      percentage: percentages.carbs
    }
  };
}

/**
 * 7) Esquema de porciones a totales nutricionales
 * Porciones: { HC, F, D, P, PG, M, L, G }
 */
export function calculatePortionsTotals(portions) {
  let totalCH = 0;
  let totalP = 0;
  let totalG = 0;
  let totalKcal = 0;

  const details = {};

  for (const [code, cat] of Object.entries(FOOD_CATEGORIES)) {
    const qty = parseFloat(portions[code]) || 0;
    const ch = qty * cat.macrosPerPortion.ch;
    const p = qty * cat.macrosPerPortion.p;
    const g = qty * cat.macrosPerPortion.g;
    const kcal = ch * 4 + p * 4 + g * 9;

    totalCH += ch;
    totalP += p;
    totalG += g;
    totalKcal += kcal;

    details[code] = {
      portions: qty,
      ch: Math.round(ch * 10) / 10,
      p: Math.round(p * 10) / 10,
      g: Math.round(g * 10) / 10,
      kcal: Math.round(kcal * 10) / 10
    };
  }

  return {
    ch: Math.round(totalCH * 10) / 10,
    p: Math.round(totalP * 10) / 10,
    g: Math.round(totalG * 10) / 10,
    kcal: Math.round(totalKcal * 10) / 10,
    details
  };
}

/**
 * 8) Nutrientes de un alimento individual en una comida
 * Fórmula idéntica a la fila de Excel:
 * CH: HC=40, F=20, D=20, M=20, L=20
 * P:  P=25, PG=8.5, M=8, L=10, HC=5, F=1
 * G:  PG=10, G=15, P=3, HC=1
 * Kcal = CH*4 + P*4 + G*9
 */
export function calculateFoodItemNutrients(categoryCode, portions) {
  const qty = parseFloat(portions) || 0;
  let ch = 0;
  let p = 0;
  let g = 0;

  switch (categoryCode) {
    case 'HC':
      ch = qty * 40;
      p = qty * 5;
      g = qty * 1;
      break;
    case 'F':
      ch = qty * 20;
      p = qty * 1;
      g = 0;
      break;
    case 'D':
      ch = qty * 20;
      p = 0;
      g = 0;
      break;
    case 'P':
      ch = 0;
      p = qty * 25;
      g = qty * 3;
      break;
    case 'PG':
      ch = 0;
      p = qty * 8.5;
      g = qty * 10;
      break;
    case 'M':
      ch = qty * 20;
      p = qty * 8;
      g = 0;
      break;
    case 'L':
      ch = qty * 20;
      p = qty * 10;
      g = 0;
      break;
    case 'G':
      ch = 0;
      p = 0;
      g = qty * 15;
      break;
    default:
      break;
  }

  const kcal = ch * 4 + p * 4 + g * 9;

  return {
    ch: Math.round(ch * 10) / 10,
    p: Math.round(p * 10) / 10,
    g: Math.round(g * 10) / 10,
    kcal: Math.round(kcal * 10) / 10
  };
}

/**
 * 9) Subtotal de una comida completa
 */
export function calculateMealSubtotal(mealItems) {
  let ch = 0;
  let p = 0;
  let g = 0;
  let kcal = 0;

  for (const item of mealItems) {
    const nutrients = calculateFoodItemNutrients(item.category, item.portions);
    ch += nutrients.ch;
    p += nutrients.p;
    g += nutrients.g;
    kcal += nutrients.kcal;
  }

  return {
    ch: Math.round(ch * 10) / 10,
    p: Math.round(p * 10) / 10,
    g: Math.round(g * 10) / 10,
    kcal: Math.round(kcal * 10) / 10
  };
}

/**
 * 10) Total del día sumando todas las comidas
 */
export function calculateTotalDayMeals(meals) {
  let ch = 0;
  let p = 0;
  let g = 0;
  let kcal = 0;

  const mealTotals = [];

  for (const meal of meals) {
    const sub = calculateMealSubtotal(meal.items);
    mealTotals.push({ id: meal.id, name: meal.name, ...sub });
    ch += sub.ch;
    p += sub.p;
    g += sub.g;
    kcal += sub.kcal;
  }

  return {
    ch: Math.round(ch * 10) / 10,
    p: Math.round(p * 10) / 10,
    g: Math.round(g * 10) / 10,
    kcal: Math.round(kcal * 10) / 10,
    byMeal: mealTotals
  };
}

/**
 * 11) Validación de tolerancia (Verificación 1 y Verificación 2)
 * Compara valor requerido vs valor real y devuelve badge de estado, diferencia y texto
 */
export function evaluateTolerance(required, actual, toleranceKey) {
  const tol = TOLERANCES[toleranceKey];
  const req = parseFloat(required) || 0;
  const act = parseFloat(actual) || 0;
  const diff = Math.round((act - req) * 10) / 10;

  const inRange = diff >= tol.min && diff <= tol.max;
  const sign = diff > 0 ? '+' : '';

  let status = 'optimal'; // optimal, warning, danger
  let label = 'En rango coherente';

  if (inRange) {
    status = 'optimal';
    label = 'En rango coherente';
  } else if (Math.abs(diff) <= Math.abs(tol.max) * 1.6) {
    status = 'warning';
    label = 'Leve desvío';
  } else {
    status = 'danger';
    label = 'Fuere de rango';
  }

  return {
    required: req,
    actual: act,
    diff,
    diffFormatted: `${sign}${diff} ${tol.unit}`,
    inRange,
    status,
    label,
    toleranceText: tol.text
  };
}
