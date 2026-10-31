/* ==========================================================
   contexto-api.js — Gestión de contexto energético y permisos de alumno en Supabase
   - Persistencia de mediciones y cálculos metabólicos (TMB, NEAT, TDEE, objetivo calórico).
   - Consulta del último contexto registrado con fallback transparente en sessionStorage.
   - Administración de permisos granulares por sección concedidos por el coach.
   Módulo ES nativo puro: importa { supabase } from './supabase.js'.
   ========================================================== */

import { supabase } from './supabase.js';

/**
 * Normaliza el valor de sexo a 'M' o 'F'.
 * @param {string} [sexo]
 * @returns {'M'|'F'}
 */
function normalizarSexo(sexo) {
  if (!sexo) return 'M';
  const s = String(sexo).trim().toUpperCase();
  return s.startsWith('F') ? 'F' : 'M';
}

/**
 * Normaliza el tipo de dieta a uno de los valores válidos de la base de datos.
 * @param {string} [tipo]
 * @returns {'deficit_leve'|'deficit_moderado'|'mantenimiento'|'superavit_leve'|'superavit_moderado'|'personalizado'}
 */
function normalizarTipoDieta(tipo) {
  if (!tipo) return 'mantenimiento';
  const normalizado = String(tipo).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[\s-]+/g, '_');

  const permitidos = [
    'deficit_leve',
    'deficit_moderado',
    'mantenimiento',
    'superavit_leve',
    'superavit_moderado',
    'personalizado'
  ];

  if (permitidos.includes(normalizado)) {
    return normalizado;
  }
  if (normalizado.includes('leve') && normalizado.includes('def')) return 'deficit_leve';
  if (normalizado.includes('mod') && normalizado.includes('def')) return 'deficit_moderado';
  if (normalizado.includes('leve') && normalizado.includes('sup')) return 'superavit_leve';
  if (normalizado.includes('mod') && normalizado.includes('sup')) return 'superavit_moderado';
  if (normalizado.includes('person')) return 'personalizado';

  return 'mantenimiento';
}

/**
 * Obtiene de forma tolerante el ID del usuario actualmente autenticado.
 * @returns {Promise<string|null>}
 */
async function obtenerUsuarioActualId() {
  try {
    if (typeof supabase?.auth?.user === 'function') {
      const u = supabase.auth.user();
      if (u?.id) return u.id;
    }
    if (typeof supabase?.auth?.getSession === 'function') {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) return data.session.user.id;
    }
    if (typeof supabase?.auth?.getUser === 'function') {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    }
  } catch (_) {}
  return null;
}

/**
 * Inserta en la tabla public.contextos_energeticos los datos cargados y calculados en JS.
 * Si Supabase falla o no hay conexión a internet, persiste el contexto como fallback en sessionStorage
 * bajo la clave 'appcalorias_contexto_ultimo_' + alumnoId.
 *
 * @param {string} alumnoId - UUID del perfil del alumno
 * @param {Object} datosContexto - Datos biométricos, entrenamiento y resultados de cálculo
 * @param {'M'|'F'|string} datosContexto.sexo - Sexo biológico ('M' o 'F')
 * @param {number} datosContexto.edad_anios - Edad en años (10 - 110)
 * @param {number} datosContexto.peso_kg - Peso corporal actual en kg (20 - 400)
 * @param {number} datosContexto.altura_cm - Estatura en cm (80 - 260)
 * @param {number} [datosContexto.pasos_diarios=0] - Pasos diarios estimados
 * @param {number} [datosContexto.met=0] - Equivalente metabólico MET de la sesión
 * @param {number} [datosContexto.duracion_horas=0] - Duración de cada sesión en horas
 * @param {number} [datosContexto.sesiones_semana=0] - Cantidad de sesiones de entreno por semana
 * @param {string} datosContexto.tipo_dieta - 'deficit_leve' | 'deficit_moderado' | 'mantenimiento' | 'superavit_leve' | 'superavit_moderado' | 'personalizado'
 * @param {number|null} [datosContexto.peso_objetivo_kg] - Peso objetivo en kg (requerido si es personalizado)
 * @param {number|null} [datosContexto.plazo_semanas] - Plazo en semanas (requerido si es personalizado)
 * @param {number} [datosContexto.bmr_kcal] - Tasa metabólica basal calculada
 * @param {number} [datosContexto.neat_kcal] - Gasto por actividad no asociada a ejercicio
 * @param {number} [datosContexto.gasto_sesion_kcal] - Gasto energético de cada sesión
 * @param {number} [datosContexto.gastoSesion_kcal] - Alias alternativo para gasto_sesion_kcal
 * @param {number} [datosContexto.entreno_diario_kcal] - Promedio diario del gasto de entrenamiento
 * @param {number} [datosContexto.tdee_kcal] - Gasto energético total diario base
 * @param {number} [datosContexto.tdee_termogenesis_kcal] - TDEE + efecto termogénico de los alimentos
 * @param {number} [datosContexto.ajuste_kcal] - Ajuste calórico diario (+/- kcal)
 * @param {number} datosContexto.calorias_objetivo - Ingesta diaria recomendada final
 * @param {string} [datosContexto.version_calculo='1'] - Versión de la fórmula aplicada
 * @returns {Promise<{success: boolean, data: Object|null, error: any}>}
 */
export async function guardarContextoEnergetico(alumnoId, datosContexto) {
  if (!alumnoId) {
    return { success: false, data: null, error: new Error('ID de alumno requerido') };
  }

  const datos = datosContexto || {};
  const tipoDieta = normalizarTipoDieta(datos.tipo_dieta);
  const esPersonalizado = tipoDieta === 'personalizado';

  const gastoSesion = Math.round(Number(datos.gasto_sesion_kcal ?? datos.gastoSesion_kcal ?? 0));

  const pesoObj = esPersonalizado && datos.peso_objetivo_kg != null
    ? Number(datos.peso_objetivo_kg)
    : (esPersonalizado && datos.pesoObjetivo != null ? Number(datos.pesoObjetivo) : null);

  const plazoSem = esPersonalizado && datos.plazo_semanas != null
    ? Math.round(Number(datos.plazo_semanas))
    : (esPersonalizado && datos.semanas != null ? Math.round(Number(datos.semanas)) : null);

  const payload = {
    alumno_id: alumnoId,
    sexo: normalizarSexo(datos.sexo),
    edad_anios: Math.round(Number(datos.edad_anios ?? datos.edad ?? 30)),
    peso_kg: Number(datos.peso_kg ?? datos.peso ?? 70),
    altura_cm: Number(datos.altura_cm ?? datos.altura ?? 170),
    pasos_diarios: Math.round(Number(datos.pasos_diarios ?? datos.pasos ?? 0)),
    met: Number(datos.met ?? 0),
    duracion_horas: Number(datos.duracion_horas ?? datos.duracion ?? 0),
    sesiones_semana: Math.round(Number(datos.sesiones_semana ?? datos.entrenos ?? 0)),
    tipo_dieta: tipoDieta,
    peso_objetivo_kg: esPersonalizado ? pesoObj : null,
    plazo_semanas: esPersonalizado ? plazoSem : null,
    bmr_kcal: Math.round(Number(datos.bmr_kcal ?? datos.bmr ?? 0)),
    neat_kcal: Math.round(Number(datos.neat_kcal ?? datos.neat ?? 0)),
    gasto_sesion_kcal: gastoSesion,
    entreno_diario_kcal: Math.round(Number(datos.entreno_diario_kcal ?? datos.promedioEntreno ?? 0)),
    tdee_kcal: Math.round(Number(datos.tdee_kcal ?? datos.tdee ?? 0)),
    tdee_termogenesis_kcal: Math.round(Number(datos.tdee_termogenesis_kcal ?? datos.tdeeTermo ?? 0)),
    ajuste_kcal: Math.round(Number(datos.ajuste_kcal ?? datos.ajuste ?? 0)),
    calorias_objetivo: Math.round(Number(datos.calorias_objetivo ?? datos.caloriasObjetivo ?? 2000)),
    version_calculo: String(datos.version_calculo || '1')
  };

  const claveFallback = `appcalorias_contexto_ultimo_${alumnoId}`;

  try {
    const { data, error } = await supabase
      .from('contextos_energeticos')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      console.warn('[contexto-api] Error insertando en Supabase, guardando en sessionStorage:', error);
      const fallbackData = {
        ...payload,
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(claveFallback, JSON.stringify(fallbackData));
        } catch (stErr) {
          console.warn('[contexto-api] Error escribiendo en sessionStorage:', stErr);
        }
      }
      return { success: false, data: fallbackData, error };
    }

    // Guardado exitoso: actualizar también el caché local
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(claveFallback, JSON.stringify(data));
      } catch (_) {}
    }

    return { success: true, data, error: null };
  } catch (err) {
    console.warn('[contexto-api] Excepción en guardarContextoEnergetico, aplicando fallback local:', err);
    const fallbackData = {
      ...payload,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(claveFallback, JSON.stringify(fallbackData));
      } catch (stErr) {
        console.warn('[contexto-api] Error escribiendo en sessionStorage:', stErr);
      }
    }
    return { success: false, data: fallbackData, error: err };
  }
}

/**
 * Consulta el registro más reciente de contexto energético para un alumno en public.contextos_energeticos.
 * Si la base de datos falla o no hay conexión, recupera la información desde sessionStorage ('appcalorias_contexto_ultimo_' + alumnoId).
 *
 * @param {string} alumnoId - UUID del perfil del alumno
 * @returns {Promise<Object|null>} El registro más reciente de contexto energético o null si no se encuentra
 */
export async function obtenerUltimoContexto(alumnoId) {
  if (!alumnoId) return null;

  const claveFallback = `appcalorias_contexto_ultimo_${alumnoId}`;

  try {
    const { data, error } = await supabase
      .from('contextos_energeticos')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(claveFallback, JSON.stringify(data));
        } catch (_) {}
      }
      return data;
    }

    if (error) {
      console.warn('[contexto-api] Error al consultar contextos_energeticos en Supabase:', error);
    }
  } catch (err) {
    console.warn('[contexto-api] Excepción al consultar contextos_energeticos en Supabase:', err);
  }

  // Fallback a almacenamiento local si falla Supabase o no hay registros remotos
  if (typeof sessionStorage !== 'undefined') {
    try {
      const serializado = sessionStorage.getItem(claveFallback);
      if (serializado) {
        return JSON.parse(serializado);
      }
    } catch (storageErr) {
      console.warn('[contexto-api] Error al leer fallback de sessionStorage:', storageErr);
    }
  }

  return null;
}

/**
 * Consulta las secciones habilitadas para un alumno en public.permisos_alumno.
 *
 * @param {string} alumnoId - UUID del perfil del alumno
 * @returns {Promise<Array<string>>} Array de nombres de secciones habilitadas (ej. ['contexto', 'plan'])
 */
export async function obtenerPermisosAlumno(alumnoId) {
  if (!alumnoId) return [];

  try {
    const { data, error } = await supabase
      .from('permisos_alumno')
      .select('seccion')
      .eq('alumno_id', alumnoId);

    if (error || !Array.isArray(data)) {
      if (error) {
        console.warn('[contexto-api] Error al consultar permisos_alumno:', error);
      }
      return [];
    }

    return data.map((fila) => fila.seccion).filter(Boolean);
  } catch (err) {
    console.warn('[contexto-api] Excepción al consultar permisos_alumno:', err);
    return [];
  }
}

/**
 * Actualiza el permiso de edición de una sección para un alumno.
 * Si habilitar es true, inserta en public.permisos_alumno { alumno_id: alumnoId, seccion, habilitado_por: coachId }.
 * Si habilitar es false, elimina de public.permisos_alumno donde alumno_id = alumnoId y seccion = seccion.
 *
 * @param {string} alumnoId - UUID del perfil del alumno
 * @param {'contexto'|'antropometria'|'plan'|string} seccion - Nombre de la sección a modificar
 * @param {boolean} habilitar - True para otorgar el permiso, false para revocarlo
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function actualizarPermisoAlumno(alumnoId, seccion, habilitar) {
  if (!alumnoId || !seccion) {
    return { success: false, error: new Error('alumnoId y seccion son requeridos') };
  }

  try {
    if (habilitar) {
      let coachId = null;
      if (typeof supabase?.auth?.user === 'function') {
        coachId = supabase.auth.user()?.id;
      }
      if (!coachId) {
        coachId = await obtenerUsuarioActualId();
      }

      const { error } = await supabase
        .from('permisos_alumno')
        .upsert(
          [
            {
              alumno_id: alumnoId,
              seccion,
              habilitado_por: coachId || null
            }
          ],
          { onConflict: 'alumno_id,seccion' }
        );

      return { success: !error, error: error || null };
    } else {
      const { error } = await supabase
        .from('permisos_alumno')
        .delete()
        .eq('alumno_id', alumnoId)
        .eq('seccion', seccion);

      return { success: !error, error: error || null };
    }
  } catch (err) {
    console.warn('[contexto-api] Excepción al actualizar permisos_alumno:', err);
    return { success: false, error: err };
  }
}
