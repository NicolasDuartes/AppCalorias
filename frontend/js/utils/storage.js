// Manejo de persistencia en localStorage y utilidades de respaldo / restauración

import { INITIAL_STATE } from '../data/food-catalog.js';

const STORAGE_KEY = 'app_calorias_duartes_v1';

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return JSON.parse(JSON.stringify(INITIAL_STATE));
    }
    const parsed = JSON.parse(raw);
    // Asegurar estructura válida
    return {
      profile: { ...INITIAL_STATE.profile, ...(parsed.profile || {}) },
      macroPercentages: { ...INITIAL_STATE.macroPercentages, ...(parsed.macroPercentages || {}) },
      portionsScheme: { ...INITIAL_STATE.portionsScheme, ...(parsed.portionsScheme || {}) },
      meals: Array.isArray(parsed.meals) && parsed.meals.length > 0 ? parsed.meals : INITIAL_STATE.meals
    };
  } catch (err) {
    console.warn('Error al cargar estado de localStorage:', err);
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }
}

export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error al guardar en localStorage:', err);
  }
}

export function resetToDefaults() {
  const fresh = JSON.parse(JSON.stringify(INITIAL_STATE));
  saveAppState(fresh);
  return fresh;
}
