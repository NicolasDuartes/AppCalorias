/* ==========================================================
   planes-api.js — Gestión de planes nutricionales en Supabase
   - Obtención del plan activo del alumno y composición de comidas/items.
   - Creación, actualización (borrador), activación y archivado de planes.
   - Historial completo de planes para seguimiento longitudinal.
   - Mapeo bidireccional tolerante (nombres en español e inglés).
   Módulo ES puro: utiliza supabase.js sin dependencias externas.
   ========================================================== */

import { supabase } from './supabase.js';

/**
 * Normaliza los ítems de una comida del plan.
 * @param {Object} it
 * @param {number} idx
 * @returns {Object}
 */
export function normalizarItemPlan(it, idx) {
  return {
    id: it.id,
    plan_meal_id: it.plan_meal_id,
    alimento_id: it.alimento_id || null,
    nombre: it.food_name || it.nombre || 'Alimento',
    food_name: it.food_name || it.nombre || 'Alimento',
    categoria: it.group_code || it.categoria || null,
    group_code: it.group_code || it.categoria || null,
    porciones: Number(it.portions ?? it.porciones ?? 1),
    portions: Number(it.portions ?? it.porciones ?? 1),
    gramos: Number(it.grams ?? it.gramos ?? 100),
    grams: Number(it.grams ?? it.gramos ?? 100),
    kcal: Number(it.calories ?? it.kcal ?? 0),
    calories: Number(it.calories ?? it.kcal ?? 0),
    p: Number(it.protein ?? it.p ?? 0),
    protein: Number(it.protein ?? it.p ?? 0),
    c: Number(it.carbs ?? it.c ?? 0),
    carbs: Number(it.carbs ?? it.c ?? 0),
    g: Number(it.fat ?? it.g ?? 0),
    fat: Number(it.fat ?? it.g ?? 0),
    orden: it.sort_order ?? it.orden ?? idx,
    sort_order: it.sort_order ?? it.orden ?? idx
  };
}

/**
 * Obtiene un plan nutricional específico por su ID junto con sus comidas e ítems vinculados.
 * Consulta meal_plans por id = planId, plan_meals y plan_items vinculados (ordenados por sort_order),
 * y normaliza las comidas e ítems usando normalizarItemPlan.
 *
 * @param {string} planId - UUID del plan nutricional
 * @returns {Promise<{plan: Object, comidas: Array<{id: string, plan_id: string, nombre: string, meal_type: string, orden: number, sort_order: number, notas: string, items: Array<Object>}>} | null>} Plan estructurado o null si no existe
 */
export async function obtenerPlanPorId(planId) {
  if (!planId) return null;

  try {
    const { data: plan, error: errPlan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', planId)
      .limit(1)
      .maybeSingle();

    if (errPlan || !plan) {
      if (errPlan) {
        console.warn('Error en obtenerPlanPorId al consultar meal_plans:', errPlan);
      }
      return null;
    }

    // Consultar las comidas y sus ítems vinculados ordenados por sort_order
    const { data: meals, error: errMeals } = await supabase
      .from('plan_meals')
      .select('*, plan_items(*)')
      .eq('plan_id', plan.id)
      .order('sort_order', { ascending: true });

    if (errMeals || !Array.isArray(meals)) {
      if (errMeals) {
        console.warn('Error en obtenerPlanPorId al consultar plan_meals:', errMeals);
      }
      return { plan, comidas: [] };
    }

    const comidas = meals.map((m, mIdx) => {
      const rawItems = Array.isArray(m.plan_items) ? m.plan_items : [];
      const items = rawItems
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(normalizarItemPlan);

      return {
        id: m.id,
        plan_id: m.plan_id,
        nombre: m.meal_type,
        meal_type: m.meal_type,
        orden: m.sort_order ?? mIdx,
        sort_order: m.sort_order ?? mIdx,
        notas: m.notes || '',
        items
      };
    });

    return { plan, comidas };
  } catch (err) {
    console.warn('Excepción en obtenerPlanPorId:', err);
    return null;
  }
}

/**
 * Obtiene el plan activo de un alumno y sus comidas con alimentos configurados.
 * @param {string} alumnoId - UUID del alumno
 * @returns {Promise<{plan: Object, comidas: Array<{id: string, nombre: string, meal_type: string, notas: string, orden: number, items: Array<Object>}>} | null>}
 */
export async function obtenerPlanActivo(alumnoId) {
  if (!alumnoId) return null;

  try {
    const { data: plan, error: errPlan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('alumno_id', alumnoId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errPlan || !plan) {
      return null;
    }

    // Consultar las comidas y sus ítems vinculados
    const { data: meals, error: errMeals } = await supabase
      .from('plan_meals')
      .select('*, plan_items(*)')
      .eq('plan_id', plan.id)
      .order('sort_order', { ascending: true });

    if (errMeals || !Array.isArray(meals)) {
      return { plan, comidas: [] };
    }

    const comidas = meals.map((m, mIdx) => {
      const rawItems = Array.isArray(m.plan_items) ? m.plan_items : [];
      const items = rawItems
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(normalizarItemPlan);

      return {
        id: m.id,
        plan_id: m.plan_id,
        nombre: m.meal_type,
        meal_type: m.meal_type,
        orden: m.sort_order ?? mIdx,
        sort_order: m.sort_order ?? mIdx,
        notas: m.notes || '',
        items
      };
    });

    return { plan, comidas };
  } catch (err) {
    console.warn('Error en obtenerPlanActivo:', err);
    return null;
  }
}

/**
 * Crea un plan nuevo para un alumno con sus comidas e ítems.
 * @param {string} alumnoId - UUID del alumno
 * @param {string|null} coachId - UUID del coach o null si es autogestionado
 * @param {string|Object} modalidad - Nombre o configuración de metas del plan
 * @param {Array<Object>} [comidas=[]] - Lista de comidas con sus ítems
 * @returns {Promise<{plan: Object|null, comidas: Array<Object>, error: any}>}
 */
export async function crearPlan(alumnoId, coachId, modalidad, comidas = []) {
  if (!alumnoId) {
    return { plan: null, comidas: [], error: new Error('ID de alumno requerido') };
  }

  try {
    let name = 'Plan Nutricional';
    let targetCalories = 2000;
    let targetProtein = 140;
    let targetCarbs = 200;
    let targetFat = 65;
    let portionsScheme = null;
    let notes = '';

    if (typeof modalidad === 'string') {
      name = modalidad.trim() || name;
    } else if (modalidad && typeof modalidad === 'object') {
      name = modalidad.name || modalidad.nombre || name;
      targetCalories = modalidad.target_calories ?? modalidad.kcal ?? targetCalories;
      targetProtein = modalidad.target_protein_g ?? modalidad.p ?? targetProtein;
      targetCarbs = modalidad.target_carbs_g ?? modalidad.c ?? targetCarbs;
      targetFat = modalidad.target_fat_g ?? modalidad.g ?? targetFat;
      portionsScheme = modalidad.portions_scheme || modalidad.esquema_porciones || null;
      notes = modalidad.notes || modalidad.notas || '';
    }

    const planPayload = {
      alumno_id: alumnoId,
      coach_id: coachId || null,
      name,
      target_calories: Math.round(targetCalories),
      target_protein_g: Math.round(targetProtein),
      target_carbs_g: Math.round(targetCarbs),
      target_fat_g: Math.round(targetFat),
      portions_scheme: portionsScheme,
      active: false,
      notes
    };

    const { data: nuevoPlan, error: errPlan } = await supabase
      .from('meal_plans')
      .insert([planPayload])
      .select()
      .single();

    if (errPlan || !nuevoPlan) {
      console.warn('Error al insertar meal_plans:', errPlan);
      return { plan: null, comidas: [], error: errPlan };
    }

    const comidasCreadas = [];
    if (Array.isArray(comidas) && comidas.length > 0) {
      for (let i = 0; i < comidas.length; i += 1) {
        const com = comidas[i];
        const mealPayload = {
          plan_id: nuevoPlan.id,
          meal_type: com.nombre || com.meal_type || `Comida ${i + 1}`,
          sort_order: com.orden ?? com.sort_order ?? i
        };

        const { data: mealData, error: mealErr } = await supabase
          .from('plan_meals')
          .insert([mealPayload])
          .select()
          .single();

        if (mealErr || !mealData) continue;

        let itemsCreados = [];
        if (Array.isArray(com.items) && com.items.length > 0) {
          const itemsPayload = com.items.map((it, itIdx) => ({
            plan_meal_id: mealData.id,
            food_name: it.nombre || it.food_name || 'Alimento',
            group_code: it.categoria || it.group_code || null,
            portions: Number(it.porciones ?? it.portions ?? 1),
            grams: Number(it.gramos ?? it.grams ?? 100),
            calories: Number(it.kcal ?? it.calories ?? 0),
            protein: Number(it.p ?? it.protein ?? 0),
            carbs: Number(it.c ?? it.carbs ?? 0),
            fat: Number(it.g ?? it.fat ?? 0),
            sort_order: it.orden ?? it.sort_order ?? itIdx
          }));

          const { data: itemsData } = await supabase
            .from('plan_items')
            .insert(itemsPayload)
            .select();

          if (Array.isArray(itemsData)) {
            itemsCreados = itemsData.map(normalizarItemPlan);
          }
        }

        comidasCreadas.push({
          id: mealData.id,
          plan_id: mealData.plan_id,
          nombre: mealData.meal_type,
          meal_type: mealData.meal_type,
          orden: mealData.sort_order,
          sort_order: mealData.sort_order,
          notas: '',
          items: itemsCreados
        });
      }
    }

    return { plan: nuevoPlan, comidas: comidasCreadas, error: null };
  } catch (err) {
    console.warn('Excepción en crearPlan:', err);
    return { plan: null, comidas: [], error: err };
  }
}

/**
 * Actualiza un plan existente (reemplaza comidas e ítems del borrador).
 * @param {string} planId - UUID del plan
 * @param {Array<Object>|Object} comidas - Nuevas comidas o datos a modificar
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function actualizarPlan(planId, comidas) {
  if (!planId) return { success: false, error: new Error('ID de plan requerido') };

  try {
    if (Array.isArray(comidas)) {
      // Eliminar comidas anteriores asociadas al plan
      await supabase.from('plan_meals').delete().eq('plan_id', planId);

      for (let i = 0; i < comidas.length; i += 1) {
        const com = comidas[i];
        const mealPayload = {
          plan_id: planId,
          meal_type: com.nombre || com.meal_type || `Comida ${i + 1}`,
          sort_order: com.orden ?? com.sort_order ?? i
        };

        const { data: mealData, error: mealErr } = await supabase
          .from('plan_meals')
          .insert([mealPayload])
          .select()
          .single();

        if (mealErr || !mealData) continue;

        if (Array.isArray(com.items) && com.items.length > 0) {
          const itemsPayload = com.items.map((it, itIdx) => ({
            plan_meal_id: mealData.id,
            food_name: it.nombre || it.food_name || 'Alimento',
            group_code: it.categoria || it.group_code || null,
            portions: Number(it.porciones ?? it.portions ?? 1),
            grams: Number(it.gramos ?? it.grams ?? 100),
            calories: Number(it.kcal ?? it.calories ?? 0),
            protein: Number(it.p ?? it.protein ?? 0),
            carbs: Number(it.c ?? it.carbs ?? 0),
            fat: Number(it.g ?? it.fat ?? 0),
            sort_order: it.orden ?? it.sort_order ?? itIdx
          }));

          await supabase.from('plan_items').insert(itemsPayload);
        }
      }
    }

    const { error: updErr } = await supabase
      .from('meal_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', planId);

    return { success: !updErr, error: updErr };
  } catch (err) {
    console.warn('Error en actualizarPlan:', err);
    return { success: false, error: err };
  }
}

/**
 * Activa un plan (cambia su estado a activo y desactiva otros planes previos del alumno).
 * @param {string} planId - UUID del plan a activar
 * @returns {Promise<{success: boolean, plan: Object|null, error: any}>}
 */
export async function activarPlan(planId) {
  if (!planId) return { success: false, plan: null, error: new Error('ID de plan requerido') };

  try {
    const { data: planActual, error: errGet } = await supabase
      .from('meal_plans')
      .select('id, alumno_id')
      .eq('id', planId)
      .single();

    if (errGet || !planActual) {
      return { success: false, plan: null, error: errGet || new Error('Plan no encontrado') };
    }

    // Desactivar cualquier plan previamente activo del alumno
    await supabase
      .from('meal_plans')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('alumno_id', planActual.alumno_id)
      .eq('active', true);

    // Activar el plan elegido
    const { data: planActivado, error: errActivar } = await supabase
      .from('meal_plans')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    return { success: !errActivar, plan: planActivado, error: errActivar };
  } catch (err) {
    console.warn('Error en activarPlan:', err);
    return { success: false, plan: null, error: err };
  }
}

/**
 * Archiva un plan (establece active en false).
 * @param {string} planId - UUID del plan
 * @returns {Promise<{success: boolean, plan: Object|null, error: any}>}
 */
export async function archivarPlan(planId) {
  if (!planId) return { success: false, plan: null, error: new Error('ID de plan requerido') };

  try {
    const { data: planArchivado, error } = await supabase
      .from('meal_plans')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    return { success: !error, plan: planArchivado, error };
  } catch (err) {
    console.warn('Error en archivarPlan:', err);
    return { success: false, plan: null, error: err };
  }
}

/**
 * Obtiene el historial cronológico de todos los planes de un alumno.
 * @param {string} alumnoId - UUID del alumno
 * @returns {Promise<Array<Object>>}
 */
export async function obtenerHistorialPlanes(alumnoId) {
  if (!alumnoId) return [];

  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.warn('Error en obtenerHistorialPlanes:', err);
    return [];
  }
}
