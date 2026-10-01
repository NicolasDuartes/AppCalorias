// Calculadora y buscador de equivalencias nutricionales entre alimentos
// Basado en las porciones estándar del modelo de Nico Duartes

import { FOOD_CATEGORIES } from '../data/food-catalog.js';

/**
 * Devuelve una lista plana de todos los alimentos con su categoría
 */
export function getAllFoods() {
  const list = [];
  for (const [catCode, cat] of Object.entries(FOOD_CATEGORIES)) {
    for (const item of cat.items) {
      list.push({
        ...item,
        categoryCode: catCode,
        categoryName: cat.name,
        categoryColor: cat.color,
        macros: cat.macrosPerPortion
      });
    }
  }
  return list;
}

/**
 * Busca un alimento por nombre
 */
export function findFood(foodName) {
  const norm = foodName.trim().toLowerCase();
  for (const [catCode, cat] of Object.entries(FOOD_CATEGORIES)) {
    for (const item of cat.items) {
      if (item.name.toLowerCase().includes(norm) || norm.includes(item.name.toLowerCase())) {
        return {
          ...item,
          categoryCode: catCode,
          categoryName: cat.name,
          categoryColor: cat.color,
          macros: cat.macrosPerPortion
        };
      }
    }
  }
  return null;
}

/**
 * Calcula la cantidad de gramos o medidas caseras para una cantidad dada de porciones
 */
export function getServingForPortions(food, portions) {
  const qty = parseFloat(portions) || 0;
  if (!food) return { grams: 0, text: '' };

  const totalGrams = Math.round(food.servingGrams * qty * 10) / 10;
  return {
    grams: totalGrams,
    text: `${totalGrams} ${food.unit} (${qty} porc.)`
  };
}

/**
 * Convierte una cantidad de un alimento A a su equivalente en el alimento B
 * - Si pertenecen a la misma categoría, la equivalencia es directa por porciones!
 * - Si pertenecen a distintas categorías, calcula según macronutriente principal o calorías.
 */
export function calculateFoodConversion({
  foodFrom,
  amountFrom,
  unitFrom = 'gr',
  foodTo
}) {
  if (!foodFrom || !foodTo) return null;

  // Determinar cuántas porciones representa la cantidad del alimento origen
  let portionsFrom = 1;
  const numAmount = parseFloat(amountFrom) || 0;

  if (numAmount > 0 && foodFrom.servingGrams > 0) {
    portionsFrom = numAmount / foodFrom.servingGrams;
  }

  // Calcular la cantidad equivalente del alimento destino
  const equivalentGrams = Math.round(portionsFrom * foodTo.servingGrams * 10) / 10;
  const roundPortions = Math.round(portionsFrom * 100) / 100;

  const sameCategory = foodFrom.categoryCode === foodTo.categoryCode;

  return {
    portions: roundPortions,
    equivalentGrams,
    unit: foodTo.unit,
    servingDescTo: foodTo.servingDesc,
    sameCategory,
    summaryText: `${numAmount} ${foodFrom.unit} de "${foodFrom.name}" equivale a ${equivalentGrams} ${foodTo.unit} de "${foodTo.name}" (${roundPortions} porciones)`
  };
}
