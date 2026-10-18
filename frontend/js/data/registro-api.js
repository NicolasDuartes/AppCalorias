/* ==========================================================
   registro-api.js — Registro diario de consumo nutricional e hídrico
   - Creación y consulta de daily_logs por alumno y fecha.
   - Registro y eliminación de logged_items por momento del día.
   - Recálculo automático de macronutrientes y calorías totales.
   - Registro de consumo de agua sincronizado.
   - Formato estructurado compatible con el dashboard y fallback offline.
   Módulo ES puro: utiliza supabase.js sin dependencias extras.
   ========================================================== */

import { supabase } from './supabase.js';

/**
 * Normaliza cualquier entrada de fecha (Date, ISO, string) a formato YYYY-MM-DD.
 * @param {Date|string|null} fecha
 * @returns {string}
 */
export function normalizarFechaISO(fecha) {
  if (!fecha) {
    const ahora = new Date();
    const a = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, '0');
    const d = String(ahora.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
  }
  if (fecha instanceof Date) {
    const a = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${a}-${m}-${d}`;
  }
  if (typeof fecha === 'string') {
    return fecha.split('T')[0].trim();
  }
  return String(fecha);
}

/**
 * Normaliza un ítem consumido para su renderizado en la interfaz.
 * @param {Object} it
 * @returns {Object}
 */
function normalizarItemConsumido(it) {
  const gramos = Number(it.grams ?? it.gramos ?? 100);
  const kcal = Number(it.calories ?? it.kcal ?? 0);
  const p = Number(it.protein ?? it.p ?? 0);
  const c = Number(it.carbs ?? it.c ?? 0);
  const g = Number(it.fat ?? it.g ?? 0);
  const nombre = it.food_name || it.nombre || 'Alimento';
  const comida = it.meal_type || it.comida || 'Almuerzo';

  return {
    id: it.id,
    daily_log_id: it.daily_log_id,
    nombre,
    food_name: nombre,
    comida,
    meal_type: comida,
    gramos,
    grams: gramos,
    cantidad: it.cantidad || `${gramos} g`,
    linea: it.linea || `${kcal} kcal · P ${p} · C ${c} · G ${g}`,
    kcal,
    calories: kcal,
    p,
    protein: p,
    c,
    carbs: c,
    g,
    fat: g,
    checked: it.checked ?? true,
    orden: it.sort_order ?? 0,
    sort_order: it.sort_order ?? 0
  };
}

/**
 * Recalcula y actualiza la sumatoria de calorías y macros en daily_logs.
 * @param {string} dailyLogId - UUID del log diario
 */
async function recalcularTotalesLog(dailyLogId) {
  if (!dailyLogId) return;

  try {
    const { data: items, error } = await supabase
      .from('logged_items')
      .select('calories, protein, carbs, fat, checked, meal_type')
      .eq('daily_log_id', dailyLogId);

    if (error || !Array.isArray(items)) return;

    let cal = 0;
    let p = 0;
    let c = 0;
    let g = 0;

    for (const it of items) {
      if (it.meal_type === 'agua') continue;
      if (it.checked !== false) {
        cal += Number(it.calories) || 0;
        p += Number(it.protein) || 0;
        c += Number(it.carbs) || 0;
        g += Number(it.fat) || 0;
      }
    }

    await supabase
      .from('daily_logs')
      .update({
        total_calories: Math.round(cal),
        total_protein: Math.round(p),
        total_carbs: Math.round(c),
        total_fat: Math.round(g),
        updated_at: new Date().toISOString()
      })
      .eq('id', dailyLogId);
  } catch (err) {
    console.warn('Error al recalcular totales del log:', err);
  }
}

/**
 * Obtiene o crea el registro diario de un alumno para una fecha determinada.
 * @param {string} alumnoId - UUID del alumno
 * @param {Date|string} fecha - Fecha del día (Date o YYYY-MM-DD)
 * @returns {Promise<Object|null>} Registro en daily_logs
 */
export async function obtenerOCrearRegistroDiario(alumnoId, fecha) {
  if (!alumnoId) return null;

  try {
    const fechaISO = normalizarFechaISO(fecha);

    // 1. Intentar obtener el registro existente
    const { data: existente, error: errGet } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', alumnoId)
      .eq('log_date', fechaISO)
      .maybeSingle();

    if (!errGet && existente) {
      return existente;
    }

    // 2. Si no existe, crearlo
    const payload = {
      user_id: alumnoId,
      log_date: fechaISO,
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      adherence_pct: 0,
      status: 'incompleto',
      coach_reviewed: false
    };

    const { data: creado, error: errInsert } = await supabase
      .from('daily_logs')
      .insert([payload])
      .select()
      .single();

    if (!errInsert && creado) {
      return creado;
    }

    // En caso de conflicto concurrente, volver a consultar
    const { data: reintentado } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', alumnoId)
      .eq('log_date', fechaISO)
      .maybeSingle();

    return reintentado || null;
  } catch (err) {
    console.warn('Error en obtenerOCrearRegistroDiario:', err);
    return null;
  }
}

/**
 * Registra un alimento consumido en una comida y actualiza los totales del día.
 * @param {string} logId - UUID del daily_logs correspondiente
 * @param {Object} datos - Propiedades del alimento consumido
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function registrarAlimentoConsumido(logId, datos) {
  if (!logId || !datos) {
    return { data: null, error: new Error('ID de log y datos requeridos') };
  }

  try {
    const payload = {
      daily_log_id: logId,
      meal_type: datos.comida || datos.meal_type || 'Almuerzo',
      food_name: datos.nombre || datos.food_name || 'Alimento',
      group_code: datos.categoria || datos.group_code || null,
      portions: Number(datos.porciones ?? datos.portions ?? 1),
      grams: Number(datos.gramos ?? datos.grams ?? 100),
      calories: Math.round(Number(datos.kcal ?? datos.calories ?? 0)),
      protein: Math.round(Number(datos.p ?? datos.protein ?? datos.proteinas ?? 0)),
      carbs: Math.round(Number(datos.c ?? datos.carbs ?? datos.carbohidratos ?? 0)),
      fat: Math.round(Number(datos.g ?? datos.fat ?? datos.grasas ?? 0)),
      checked: datos.checked ?? true,
      sort_order: datos.orden ?? datos.sort_order ?? 0
    };

    const { data, error } = await supabase
      .from('logged_items')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      console.warn('Error al registrar alimento consumido:', error);
      return { data: null, error };
    }

    // Recalcular totales acumulados en segundo plano sin bloquear respuesta
    recalcularTotalesLog(logId).catch(() => {});

    const normalizado = normalizarItemConsumido(data);
    return { ...normalizado, data: normalizado, error: null };
  } catch (err) {
    console.warn('Excepción en registrarAlimentoConsumido:', err);
    return { data: null, error: err };
  }
}

/**
 * Elimina un alimento consumido y actualiza la sumatoria del log.
 * @param {string} itemId - UUID del item en logged_items
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function eliminarAlimentoConsumido(itemId) {
  if (!itemId) return { success: false, error: new Error('ID de item requerido') };

  try {
    const { data: item } = await supabase
      .from('logged_items')
      .select('id, daily_log_id')
      .eq('id', itemId)
      .maybeSingle();

    const { error } = await supabase
      .from('logged_items')
      .delete()
      .eq('id', itemId);

    if (!error && item?.daily_log_id) {
      recalcularTotalesLog(item.daily_log_id).catch(() => {});
    }

    return { success: !error, error };
  } catch (err) {
    console.warn('Error en eliminarAlimentoConsumido:', err);
    return { success: false, error: err };
  }
}

/**
 * Obtiene todos los alimentos consumidos en un día estructurados por comida.
 * @param {string} alumnoId - UUID del alumno
 * @param {Date|string} fecha - Fecha del día (Date o YYYY-MM-DD)
 * @returns {Promise<{
 *   log: Object|null,
 *   items: Array<Object>,
 *   comidas: Record<string, Array<Object>>,
 *   totales: { kcal: number, p: number, c: number, g: number },
 *   aguaLitros: number
 * }>}
 */
export async function obtenerConsumoDiario(alumnoId, fecha) {
  const estructuraVacia = {
    log: null,
    items: [],
    comidas: {
      Desayuno: [],
      Almuerzo: [],
      Merienda: [],
      Cena: []
    },
    totales: { kcal: 0, p: 0, c: 0, g: 0 },
    aguaLitros: 0
  };

  if (!alumnoId) return estructuraVacia;

  try {
    const fechaISO = normalizarFechaISO(fecha);

    const { data: log, error: errLog } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', alumnoId)
      .eq('log_date', fechaISO)
      .maybeSingle();

    if (errLog || !log) {
      return estructuraVacia;
    }

    const { data: rawItems, error: errItems } = await supabase
      .from('logged_items')
      .select('*')
      .eq('daily_log_id', log.id)
      .order('sort_order', { ascending: true });

    if (errItems || !Array.isArray(rawItems)) {
      return {
        ...estructuraVacia,
        log,
        totales: {
          kcal: Number(log.total_calories) || 0,
          p: Number(log.total_protein) || 0,
          c: Number(log.total_carbs) || 0,
          g: Number(log.total_fat) || 0
        }
      };
    }

    const comidas = {
      Desayuno: [],
      Almuerzo: [],
      Merienda: [],
      Cena: []
    };

    let aguaLitros = 0;
    const items = [];
    let sumKcal = 0;
    let sumP = 0;
    let sumC = 0;
    let sumG = 0;

    for (const it of rawItems) {
      if (it.meal_type === 'agua') {
        aguaLitros = Number(it.portions ?? (it.grams ? it.grams / 1000 : 0)) || 0;
        continue;
      }

      const itemNorm = normalizarItemConsumido(it);
      items.push(itemNorm);

      if (!comidas[itemNorm.comida]) {
        comidas[itemNorm.comida] = [];
      }
      comidas[itemNorm.comida].push(itemNorm);

      if (itemNorm.checked) {
        sumKcal += itemNorm.kcal;
        sumP += itemNorm.p;
        sumC += itemNorm.c;
        sumG += itemNorm.g;
      }
    }

    return {
      log,
      items,
      comidas,
      totales: {
        kcal: Number(log.total_calories) || sumKcal,
        p: Number(log.total_protein) || sumP,
        c: Number(log.total_carbs) || sumC,
        g: Number(log.total_fat) || sumG
      },
      aguaLitros
    };
  } catch (err) {
    console.warn('Error en obtenerConsumoDiario:', err);
    return estructuraVacia;
  }
}

/**
 * Actualiza la cantidad de agua consumida en el registro diario.
 * Almacena o actualiza un registro especial en logged_items con meal_type = 'agua'.
 * @param {string} logId - UUID del daily_logs
 * @param {number} litros - Cantidad en litros consumida
 * @returns {Promise<{success: boolean, litros: number, error: any}>}
 */
export async function actualizarAgua(logId, litros) {
  if (!logId) return { success: false, litros: 0, error: new Error('ID de log requerido') };

  const cantidadLitros = Math.max(0, Number(litros) || 0);

  try {
    const { data: itemAgua } = await supabase
      .from('logged_items')
      .select('id')
      .eq('daily_log_id', logId)
      .eq('meal_type', 'agua')
      .maybeSingle();

    if (itemAgua) {
      if (cantidadLitros <= 0) {
        await supabase.from('logged_items').delete().eq('id', itemAgua.id);
      } else {
        await supabase
          .from('logged_items')
          .update({
            portions: cantidadLitros,
            grams: Math.round(cantidadLitros * 1000),
            food_name: `Agua (${cantidadLitros} L)`
          })
          .eq('id', itemAgua.id);
      }
    } else if (cantidadLitros > 0) {
      await supabase.from('logged_items').insert([{
        daily_log_id: logId,
        meal_type: 'agua',
        food_name: `Agua (${cantidadLitros} L)`,
        group_code: 'agua',
        portions: cantidadLitros,
        grams: Math.round(cantidadLitros * 1000),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        checked: true,
        sort_order: 999
      }]);
    }

    return { success: true, litros: cantidadLitros, error: null };
  } catch (err) {
    console.warn('Error en actualizarAgua:', err);
    return { success: false, litros: cantidadLitros, error: err };
  }
}
