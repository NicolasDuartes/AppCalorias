/* ==========================================================
   progreso-ui.js — Controlador de evolución de peso y hábitos del alumno
   - Muestra peso inicial, actual y meta, con porcentaje de avance.
   - Historial reactivo de pesajes alimentado desde sessionStorage / contextos_energeticos.
   - Sincronización reactiva transversal y canal de eventos de pesaje.
   - Resumen de adherencia calórica e hidratación diaria.
   - Cero innerHTML con datos variables (Regla de Oro 1).
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { obtenerUltimoContexto } from '../data/contexto-api.js';
import '../utils/navegacion.js';

export const SELECTORES = {
  seccionPeso: '#seccion-peso',
  seccionHabitos: '#seccion-habitos',
  historialPesajes: '#historial-pesajes',
  objetivoSubtitulo: '#objetivo-subtitulo',
  pesoInicial: '#peso-inicial',
  pesoActual: '#peso-actual',
  pesoMeta: '#peso-meta',
  pesoDiferencia: '#peso-diferencia',
  pesoPorcentaje: '#peso-porcentaje',
  barraProgresoPeso: '#barra-progreso-peso',
  listaPesajes: '#lista-pesajes',
  tplPesajeFila: '#tpl-pesaje-fila',
  sinPesajes: '#sin-pesajes',
  btnRegistrarPeso: '#btn-registrar-peso',
  diasEnObjetivo: '#dias-en-objetivo',
  promedioKcal: '#promedio-kcal',
  promedioAgua: '#promedio-agua',
  seccionHidrataHoy: '#hidrata-hoy',
  litrosAgua: '#litros-agua',
  barraAgua: '#barra-agua',
  btnMenosAgua: '#btn-menos-agua',
  btnMasAgua: '#btn-mas-agua',
  vasosAguaTexto: '#vasos-agua-texto',
  porcentajeAgua: '#porcentaje-agua'
};

export const STORAGE_KEY_PESO_ACTUAL = 'appcalorias_peso_actual';
export const STORAGE_KEY_HISTORIAL_PESAJES = 'appcalorias_historial_pesajes';
export const CLAVE_STORAGE_PESAJES = STORAGE_KEY_HISTORIAL_PESAJES;
export const CLAVE_STORAGE_PESO_ACTUAL = STORAGE_KEY_PESO_ACTUAL;
export const CLAVE_STORAGE_AGUA = 'vasos-agua-alumno';
export const STORAGE_KEY_AGUA_HOY = 'appcalorias_agua_hoy';
export const EVENTO_PESO_ACTUALIZADO = 'appcalorias:peso_actualizado';
export const EVENTO_AGUA_ACTUALIZADA = 'appcalorias:agua_actualizada';
export const META_AGUA_DEFECTO = 2.5;
export const TOTAL_VASOS_DEFECTO = 8;

export const MOCK_HISTORIAL_PESAJES = [
  {
    peso: 72.4,
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    nota: 'Control semanal'
  },
  {
    peso: 73.8,
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    nota: 'Control semanal'
  },
  {
    peso: 75.2,
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    nota: 'Control quincenal'
  },
  {
    peso: 78.0,
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    nota: 'Pesaje inicial'
  }
];

/**
 * Formatea un valor numérico según la convención regional `es-AR` (coma decimal),
 * devolviendo un guion largo (`"—"`) cuando el dato no es un número válido.
 *
 * @param {number|*} valor - Número a formatear.
 * @param {number} [maxDecimales=1] - Cantidad máxima de decimales visibles.
 * @returns {string} Representación textual formateada o `"—"` si es inválido.
 *
 * @example
 * // Caso normal: número decimal con 1 posición fraccionaria
 * formatearNumero(72.4); // -> "72,4"
 *
 * @example
 * // Caso especial: valor NaN o tipo no numérico
 * formatearNumero(NaN);  // -> "—"
 * formatearNumero(null); // -> "—"
 *
 * @note Edge cases:
 * - Si `valor` no es `typeof 'number'` o es `Number.isNaN(valor)`, retorna `"—"` sin lanzar excepción.
 */
export function formatearNumero(valor, maxDecimales = 1) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', { maximumFractionDigits: maxDecimales });
}

/**
 * Traduce el identificador técnico de un tipo de estrategia nutricional
 * a una descripción legible para mostrar como subtítulo de objetivo.
 *
 * @param {string|null|undefined} tipo - Código de dieta (`'deficit_leve'`, `'mantenimiento'`, etc.).
 * @returns {string} Etiqueta legible en español; por defecto `'Descenso de peso'`.
 *
 * @example
 * // Caso normal: código de dieta registrado en contextos_energeticos
 * formatearTipoDieta('superavit_moderado'); // -> "Aumento de masa muscular"
 *
 * @example
 * // Caso especial: código desconocido o nulo recurre al valor por defecto
 * formatearTipoDieta(null); // -> "Descenso de peso"
 *
 * @note Edge cases:
 * - Cualquier cadena fuera del catálogo o valor `undefined`/`null` devuelve `'Descenso de peso'`.
 */
export function formatearTipoDieta(tipo) {
  const mapa = {
    deficit_leve: 'Descenso gradual de peso',
    deficit_moderado: 'Descenso de peso',
    mantenimiento: 'Mantenimiento de peso',
    superavit_leve: 'Aumento gradual de masa',
    superavit_moderado: 'Aumento de masa muscular',
    personalizado: 'Objetivo personalizado'
  };
  return mapa[tipo] || 'Descenso de peso';
}

/**
 * Convierte una cadena de fecha ISO 8601 en una etiqueta relativa (`"Hoy"`, `"Ayer"`)
 * o en formato corto `es-AR` (ej. `"15 oct"`).
 *
 * @param {string|null|undefined} fechaIso - Marca temporal en formato ISO 8601.
 * @returns {string} Fecha legible para las filas del historial de pesajes.
 *
 * @example
 * // Caso normal: fecha correspondiente al día en curso
 * formatearFechaPesaje(new Date().toISOString()); // -> "Hoy"
 *
 * @example
 * // Caso especial: cadena vacía o fecha inválida no parseable
 * formatearFechaPesaje('');          // -> "Hoy"
 * formatearFechaPesaje('no-fecha');  // -> "no-fecha"
 *
 * @note Edge cases:
 * - Si `fechaIso` es vacío o nulo retorna `"Hoy"`; si `new Date(fechaIso)` produce `NaN`, devuelve `String(fechaIso)`.
 */
export function formatearFechaPesaje(fechaIso) {
  if (!fechaIso) return 'Hoy';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return String(fechaIso);

  const hoy = new Date();
  const diffDias = Math.floor(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() -
     new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';

  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

/**
 * Calcula el porcentaje de avance [0, 100], los kilogramos restantes y el estado de cumplimiento
 * entre un peso inicial, el peso actual y la meta (soportando tanto descenso como aumento de masa).
 *
 * @param {number|string} inicial - Peso corporal de partida en kilogramos.
 * @param {number|string} actual - Peso corporal actual en kilogramos.
 * @param {number|string} meta - Peso corporal objetivo en kilogramos.
 * @returns {{ porcentaje: number, faltanKg: number, alcanzada: boolean, textoDiferencia: string }} Métricas de avance hacia la meta.
 *
 * @example
 * // Caso normal: descenso de 80 kg a 70 kg estando en 75 kg
 * calcularProgresoPeso(80, 75, 70);
 * // -> { porcentaje: 50, faltanKg: 5, alcanzada: false, textoDiferencia: "Faltan 5 kg" }
 *
 * @example
 * // Caso especial: meta alcanzada o parámetros no numéricos
 * calcularProgresoPeso(80, 69.5, 70);
 * // -> { porcentaje: 100, faltanKg: 0, alcanzada: true, textoDiferencia: "¡Meta alcanzada!" }
 * calcularProgresoPeso(NaN, 75, 70);
 * // -> { porcentaje: 0, faltanKg: 0, alcanzada: false, textoDiferencia: "—" }
 *
 * @note Edge cases:
 * - Si `inicial === meta`, `totalRecorrido` es `0` y el porcentaje se resuelve en `100%` sin dividir por cero.
 * - El porcentaje siempre se acota al intervalo cerrado `[0, 100]` aunque el alumno retroceda respecto al peso inicial.
 */
export function calcularProgresoPeso(inicial, actual, meta) {
  const pInicial = Number(inicial);
  const pActual = Number(actual);
  const pMeta = Number(meta);

  if (Number.isNaN(pInicial) || Number.isNaN(pActual) || Number.isNaN(pMeta)) {
    return { porcentaje: 0, faltanKg: 0, alcanzada: false, textoDiferencia: '—' };
  }

  const esDescenso = pInicial >= pMeta;
  let porcentaje = 0;
  let faltanKg = 0;
  let alcanzada = false;

  if (esDescenso) {
    const totalRecorrido = pInicial - pMeta;
    faltanKg = Math.max(0, pActual - pMeta);
    alcanzada = pActual <= pMeta;
    if (totalRecorrido > 0) {
      const logrado = pInicial - pActual;
      porcentaje = Math.round(Math.min(Math.max((logrado / totalRecorrido) * 100, 0), 100));
    } else {
      porcentaje = alcanzada ? 100 : 0;
    }
  } else {
    const totalRecorrido = pMeta - pInicial;
    faltanKg = Math.max(0, pMeta - pActual);
    alcanzada = pActual >= pMeta;
    if (totalRecorrido > 0) {
      const logrado = pActual - pInicial;
      porcentaje = Math.round(Math.min(Math.max((logrado / totalRecorrido) * 100, 0), 100));
    } else {
      porcentaje = alcanzada ? 100 : 0;
    }
  }

  let textoDiferencia = '';
  if (alcanzada) {
    textoDiferencia = '¡Meta alcanzada!';
  } else {
    textoDiferencia = `Faltan ${formatearNumero(faltanKg)} kg`;
  }

  return { porcentaje, faltanKg, alcanzada, textoDiferencia };
}

let alumnoIdActual = null;

/**
 * Recupera los parámetros de peso corporal (inicial, actual y meta), tipo de dieta y calorías objetivo
 * del alumno consultando `obtenerUltimoContexto` en Supabase con fallback en `sessionStorage`.
 *
 * @param {string|null} [alumnoId] - UUID del alumno a consultar; si se omite usa `alumnoIdActual`.
 * @returns {Promise<{ pesoInicial: number, pesoActual: number, pesoMeta: number, tipoDieta: string, caloriasObjetivo: number }>} Datos consolidados de progreso.
 *
 * @example
 * // Caso normal: cargar progreso de un alumno autenticado
 * const datos = await cargarDatosProgreso('00000000-0000-0000-0000-000000000001');
 * // -> { pesoInicial: 75, pesoActual: 72.4, pesoMeta: 70, tipoDieta: "mantenimiento", caloriasObjetivo: 2650 }
 *
 * @example
 * // Caso especial: ejecución sin ID ni contexto previo (usa valores semilla seguros)
 * const datosDefecto = await cargarDatosProgreso(null);
 * // -> { pesoInicial: 78, pesoActual: 72.4, pesoMeta: 70, tipoDieta: "deficit_moderado", caloriasObjetivo: 2040 }
 *
 * @note Edge cases:
 * - Si `obtenerUltimoContexto` lanza un error de red, degrada silenciosamente a `sessionStorage` o a los valores base por defecto.
 */
export async function cargarDatosProgreso(alumnoId) {
  let contexto = null;
  const idConsulta = alumnoId || alumnoIdActual;
  if (idConsulta) {
    try {
      contexto = await obtenerUltimoContexto(idConsulta);
    } catch (e) {
      console.warn('[progreso-ui] Error al obtener contexto energético:', e);
    }
  }

  if (!contexto && typeof sessionStorage !== 'undefined') {
    try {
      if (idConsulta) {
        const raw = sessionStorage.getItem(`appcalorias_contexto_ultimo_${idConsulta}`);
        if (raw) contexto = JSON.parse(raw);
      }
      if (!contexto) {
        const raw = sessionStorage.getItem('appcalorias_contexto_ultimo');
        if (raw) contexto = JSON.parse(raw);
      }
      if (!contexto) {
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('appcalorias_contexto_ultimo')) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              contexto = JSON.parse(raw);
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  const pesoInicial = Number(contexto?.peso_kg ?? 78);
  let pesoActual = pesoInicial;

  if (typeof sessionStorage !== 'undefined') {
    try {
      const pAct = sessionStorage.getItem(STORAGE_KEY_PESO_ACTUAL);
      if (pAct !== null && pAct !== '') {
        const num = Number(pAct);
        if (!Number.isNaN(num) && num > 0) {
          pesoActual = num;
        }
      } else if (contexto?.peso_actual != null) {
        pesoActual = Number(contexto.peso_actual);
      } else {
        pesoActual = 72.4;
      }
    } catch (_) {
      pesoActual = 72.4;
    }
  } else {
    pesoActual = 72.4;
  }

  const pesoMeta = Number(contexto?.peso_objetivo_kg ?? contexto?.pesoObjetivo ?? 70);
  const tipoDieta = contexto?.tipo_dieta ?? 'deficit_moderado';
  const caloriasObjetivo = Number(contexto?.calorias_objetivo ?? 2040);

  return {
    pesoInicial,
    pesoActual,
    pesoMeta,
    tipoDieta,
    caloriasObjetivo
  };
}

/**
 * Obtiene la lista cronológica de pesajes del alumno desde `sessionStorage` (`appcalorias_historial_pesajes`),
 * o retorna una copia de `MOCK_HISTORIAL_PESAJES` si aún no hay registros guardados.
 *
 * @returns {Array<{ peso: number, fecha: string, nota?: string }>} Arreglo de registros de pesaje.
 *
 * @example
 * // Caso normal: recuperar historial almacenado en la sesión
 * const historial = obtenerHistorialPesajes();
 * // -> [{ peso: 72.4, fecha: "...", nota: "Control semanal" }, ...]
 *
 * @example
 * // Caso especial: sessionStorage vacío o con JSON inválido devuelve copia de MOCK_HISTORIAL_PESAJES
 * sessionStorage.removeItem('appcalorias_historial_pesajes');
 * const porDefecto = obtenerHistorialPesajes(); // -> 4 registros semilla
 *
 * @note Edge cases:
 * - Retorna siempre una nueva instancia de arreglo (`[...MOCK_HISTORIAL_PESAJES]`) para evitar mutaciones accidentales sobre la constante exportada.
 */
export function obtenerHistorialPesajes() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_HISTORIAL_PESAJES);
      if (raw) {
        const parseado = JSON.parse(raw);
        if (Array.isArray(parseado) && parseado.length > 0) {
          return parseado;
        }
      }
    } catch (e) {
      console.warn('[progreso-ui] Error al leer appcalorias_historial_pesajes:', e);
    }
  }
  return [...MOCK_HISTORIAL_PESAJES];
}

/**
 * Persiste el arreglo de pesajes del alumno en `sessionStorage` bajo la clave `appcalorias_historial_pesajes`.
 *
 * @param {Array<{ peso: number, fecha: string, nota?: string }>} historial - Colección de pesajes a guardar.
 * @returns {void}
 *
 * @example
 * // Caso normal: persistir lista actualizada con un nuevo pesaje
 * guardarHistorialPesajes([{ peso: 71.8, fecha: '2026-10-31T10:00:00.000Z', nota: 'Ayunas' }]);
 *
 * @example
 * // Caso especial: almacenamiento deshabilitado o lleno (captura la excepción sin interrumpir la UI)
 * guardarHistorialPesajes([]);
 *
 * @note Edge cases:
 * - Si `sessionStorage` lanza `QuotaExceededError` o `SecurityError`, registra una advertencia en consola y continúa.
 */
export function guardarHistorialPesajes(historial) {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY_HISTORIAL_PESAJES, JSON.stringify(historial));
    } catch (e) {
      console.warn('[progreso-ui] Error al guardar appcalorias_historial_pesajes:', e);
    }
  }
}

/**
 * Renderiza en el DOM las tarjetas de evolución de peso corporal, la lista histórica de pesajes
 * mediante clonación de `<template id="tpl-pesaje-fila">` (cero `innerHTML`) y el resumen de hábitos.
 *
 * @param {{ pesoInicial: number, pesoActual: number, pesoMeta: number, tipoDieta: string, caloriasObjetivo: number }} datos - Métricas de peso y energía del alumno.
 * @param {Array<{ peso: number, fecha: string, nota?: string }>} historial - Lista de pesajes a mostrar.
 * @returns {void}
 *
 * @example
 * // Caso normal: renderizar progreso con datos e historial
 * renderizarProgreso(
 *   { pesoInicial: 80, pesoActual: 75, pesoMeta: 70, tipoDieta: 'deficit_moderado', caloriasObjetivo: 2100 },
 *   obtenerHistorialPesajes()
 * );
 *
 * @example
 * // Caso especial: historial vacío muestra el bloque #sin-pesajes (hidden = false)
 * renderizarProgreso(
 *   { pesoInicial: 80, pesoActual: 80, pesoMeta: 70, tipoDieta: 'deficit_leve', caloriasObjetivo: 2200 },
 *   []
 * );
 *
 * @note Edge cases:
 * - Ordena una copia del historial de más reciente a más antiguo antes de calcular la variación contra el pesaje inmediato anterior.
 */
export function renderizarProgreso(datos, historial) {
  const elSubtitulo = document.querySelector(SELECTORES.objetivoSubtitulo);
  if (elSubtitulo) {
    elSubtitulo.textContent = formatearTipoDieta(datos.tipoDieta);
  }

  const elInicial = document.querySelector(SELECTORES.pesoInicial);
  if (elInicial) elInicial.textContent = `${formatearNumero(datos.pesoInicial)} kg`;

  const elActual = document.querySelector(SELECTORES.pesoActual);
  if (elActual) elActual.textContent = `${formatearNumero(datos.pesoActual)} kg`;

  const elMeta = document.querySelector(SELECTORES.pesoMeta);
  if (elMeta) elMeta.textContent = `${formatearNumero(datos.pesoMeta)} kg`;

  const progreso = calcularProgresoPeso(datos.pesoInicial, datos.pesoActual, datos.pesoMeta);

  const elDiferencia = document.querySelector(SELECTORES.pesoDiferencia);
  if (elDiferencia) elDiferencia.textContent = progreso.textoDiferencia;

  const elPorcentaje = document.querySelector(SELECTORES.pesoPorcentaje);
  if (elPorcentaje) elPorcentaje.textContent = `${progreso.porcentaje}%`;

  const elBarra = document.querySelector(SELECTORES.barraProgresoPeso);
  if (elBarra) {
    elBarra.setAttribute('aria-valuenow', String(progreso.porcentaje));
    const relleno = elBarra.firstElementChild;
    if (relleno) relleno.style.width = `${progreso.porcentaje}%`;
  }

  // Renderizar historial de pesajes (Cero innerHTML con datos variables)
  const listaEl = document.querySelector(SELECTORES.listaPesajes) ||
                  document.querySelector('#historial-pesajes ul') ||
                  document.querySelector('#historial-pesajes');
  const tpl = document.querySelector(SELECTORES.tplPesajeFila);
  const sinPesajesEl = document.querySelector(SELECTORES.sinPesajes);

  if (listaEl && tpl) {
    while (listaEl.firstChild) {
      listaEl.removeChild(listaEl.firstChild);
    }

    if (!historial || historial.length === 0) {
      if (sinPesajesEl) sinPesajesEl.hidden = false;
    } else {
      if (sinPesajesEl) sinPesajesEl.hidden = true;

      const ordenados = [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      ordenados.forEach((item, idx) => {
        const clon = tpl.content.cloneNode(true);
        const fechaEl = clon.querySelector('[data-bind="fecha"]');
        const varEl = clon.querySelector('[data-bind="variacion"]');
        const pesoEl = clon.querySelector('[data-bind="peso"]');

        const pesoNum = Number(item.peso);
        if (fechaEl) fechaEl.textContent = formatearFechaPesaje(item.fecha);
        if (pesoEl) pesoEl.textContent = formatearNumero(pesoNum);

        if (varEl) {
          const anterior = ordenados[idx + 1];
          if (anterior && typeof anterior.peso === 'number') {
            const diff = Math.round((pesoNum - anterior.peso) * 10) / 10;
            if (diff === 0) {
              varEl.textContent = 'Mismo peso que el anterior';
            } else if (diff < 0) {
              varEl.textContent = `${formatearNumero(diff)} kg vs anterior`;
            } else {
              varEl.textContent = `+${formatearNumero(diff)} kg vs anterior`;
            }
          } else {
            varEl.textContent = item.nota || 'Inicio del registro';
          }
        }

        listaEl.append(clon);
      });
    }
  }

  // Adherencia y hábitos
  const diasObjEl = document.querySelector(SELECTORES.diasEnObjetivo);
  if (diasObjEl) {
    while (diasObjEl.firstChild) diasObjEl.removeChild(diasObjEl.firstChild);
    const spanUnidad = document.createElement('span');
    spanUnidad.className = 'unidad';
    spanUnidad.textContent = ' / 7';
    diasObjEl.append('5 ', spanUnidad);
  }

  const promKcalEl = document.querySelector(SELECTORES.promedioKcal);
  if (promKcalEl) {
    while (promKcalEl.firstChild) promKcalEl.removeChild(promKcalEl.firstChild);
    const spanUnidad = document.createElement('span');
    spanUnidad.className = 'unidad';
    spanUnidad.textContent = ' kcal';
    const kcalFormateada = formatearNumero(datos.caloriasObjetivo, 0);
    promKcalEl.append(`${kcalFormateada} `, spanUnidad);
  }

  const promAguaEl = document.querySelector(SELECTORES.promedioAgua);
  if (promAguaEl) {
    let vasosCount = 7;
    if (typeof sessionStorage !== 'undefined') {
      try {
        const rawAgua = sessionStorage.getItem(CLAVE_STORAGE_AGUA);
        if (rawAgua) {
          const arr = JSON.parse(rawAgua);
          if (Array.isArray(arr) && arr.length > 0) {
            vasosCount = arr.length;
          }
        }
      } catch (_) {}
    }
    while (promAguaEl.firstChild) promAguaEl.removeChild(promAguaEl.firstChild);
    const spanUnidad = document.createElement('span');
    spanUnidad.className = 'unidad';
    spanUnidad.textContent = ' vasos/día';
    promAguaEl.append(`${vasosCount} `, spanUnidad);
  }

  renderizarHidratacionHoy();
}

/**
 * Obtiene el estado consolidado de consumo de agua del día desde `sessionStorage`.
 * Si `appcalorias_agua_hoy` no existe, recupera la clave legada `vasos-agua-alumno`
 * y calcula los litros equivalentes según la meta diaria (`META_AGUA_DEFECTO = 2.5`).
 *
 * @returns {{ vasos: number, totalVasos: number, litros: number, metaLitros: number, fechaISO: string }} Estado hidratado del consumo hídrico diario.
 *
 * @example
 * // Caso normal: leer estado persistido del día (3 vasos sobre meta de 2.5 L)
 * const estado = obtenerEstadoAguaHoy();
 * // -> { vasos: 3, totalVasos: 8, litros: 0.9, metaLitros: 2.5, fechaISO: "2026-10-31" }
 *
 * @example
 * // Caso especial: sessionStorage vacío o inaccesible
 * sessionStorage.clear();
 * obtenerEstadoAguaHoy();
 * // -> { vasos: 0, totalVasos: 8, litros: 0, metaLitros: 2.5, fechaISO: "..." }
 *
 * @note Edge cases:
 * - Si el JSON almacenado está corrupto o `sessionStorage` no está disponible, captura la excepción y devuelve valores por defecto en cero.
 * - Soporta tanto `parsed.vasos` como arreglo de índices (`[0, 1, 2]`) o como número entero (`3`).
 */
export function obtenerEstadoAguaHoy() {
  let vasos = 0;
  let totalVasos = TOTAL_VASOS_DEFECTO;
  let litros = 0;
  let metaLitros = META_AGUA_DEFECTO;
  let fechaISO = new Date().toISOString().slice(0, 10);

  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_AGUA_HOY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (Array.isArray(parsed.vasos)) {
            vasos = parsed.vasos.length;
          } else if (typeof parsed.vasos === 'number') {
            vasos = parsed.vasos;
          }
          if (typeof parsed.totalVasos === 'number' && parsed.totalVasos > 0) {
            totalVasos = parsed.totalVasos;
          }
          if (typeof parsed.litros === 'number') {
            litros = parsed.litros;
          } else {
            litros = Math.round((vasos * (metaLitros / totalVasos)) * 10) / 10;
          }
          if (parsed.fechaISO) fechaISO = parsed.fechaISO;
        }
      } else {
        const rawAgua = sessionStorage.getItem(CLAVE_STORAGE_AGUA);
        if (rawAgua) {
          const arr = JSON.parse(rawAgua);
          if (Array.isArray(arr)) {
            vasos = arr.length;
            litros = Math.round((vasos * (metaLitros / totalVasos)) * 10) / 10;
          }
        }
      }
    } catch (_) {}
  }

  return { vasos, totalVasos, litros, metaLitros, fechaISO };
}

/**
 * Actualiza los indicadores visuales de hidratación diaria (litros, barra de progreso ARIA,
 * conteo de vasos y promedio en tarjeta de hábitos) usando manipulación DOM pura sin `innerHTML`.
 *
 * @param {Object} [estadoAgua] - Estado de hidratación a renderizar; si se omite, consulta `obtenerEstadoAguaHoy()`.
 * @param {number} [estadoAgua.vasos=0] - Cantidad de vasos consumidos.
 * @param {number} [estadoAgua.totalVasos=8] - Total de vasos objetivo del día.
 * @param {number} [estadoAgua.litros=0] - Litros acumulados.
 * @param {number} [estadoAgua.metaLitros=2.5] - Meta diaria expresada en litros.
 * @returns {void}
 *
 * @example
 * // Caso normal: renderizar un estado explícito de 4 vasos (1.3 L sobre 2.5 L)
 * renderizarHidratacionHoy({ vasos: 4, totalVasos: 8, litros: 1.3, metaLitros: 2.5 });
 *
 * @example
 * // Caso especial: invocación sin argumentos (hidrata automáticamente desde sessionStorage)
 * renderizarHidratacionHoy();
 *
 * @note Edge cases:
 * - Si `metaLitros <= 0`, el porcentaje se fija en `0%` evitando divisiones por cero (`NaN`/`Infinity`).
 * - Limita el porcentaje visual de la barra a un máximo de `100%`.
 */
export function renderizarHidratacionHoy(estadoAgua) {
  const estado = estadoAgua || obtenerEstadoAguaHoy();
  const litrosConsumidos = Number(estado.litros ?? 0);
  const metaLitros = Number(estado.metaLitros ?? META_AGUA_DEFECTO);
  const totalVasos = Number(estado.totalVasos ?? TOTAL_VASOS_DEFECTO);
  const vasosCount = Number(estado.vasos ?? 0);

  const pct = metaLitros > 0 ? Math.min(100, Math.round((litrosConsumidos / metaLitros) * 100)) : 0;

  const elLitros = document.querySelector(SELECTORES.litrosAgua);
  if (elLitros) {
    elLitros.textContent = `${formatearNumero(litrosConsumidos, 1)} L / ${formatearNumero(metaLitros, 1)} L`;
  }

  const elBarra = document.querySelector(SELECTORES.barraAgua);
  if (elBarra) {
    elBarra.setAttribute('aria-valuenow', String(pct));
    const relleno = elBarra.firstElementChild;
    if (relleno) relleno.style.width = `${pct}%`;
  }

  const elVasosTexto = document.querySelector(SELECTORES.vasosAguaTexto);
  if (elVasosTexto) {
    elVasosTexto.textContent = `${vasosCount} de ${totalVasos} vasos`;
  }

  const elPorcentaje = document.querySelector(SELECTORES.porcentajeAgua);
  if (elPorcentaje) {
    elPorcentaje.textContent = `${pct}%`;
  }

  const promAguaEl = document.querySelector(SELECTORES.promedioAgua);
  if (promAguaEl) {
    while (promAguaEl.firstChild) promAguaEl.removeChild(promAguaEl.firstChild);
    const spanUnidad = document.createElement('span');
    spanUnidad.className = 'unidad';
    spanUnidad.textContent = ' vasos/día';
    promAguaEl.append(`${vasosCount} `, spanUnidad);
  }
}

let temporizadorSyncAgua = null;
let tareaSyncAguaPendiente = null;
let emitiendoAguaInterna = false;
let emitiendoPesoInterno = false;

/**
 * Ejecuta de inmediato cualquier sincronización remota de hidratación pendiente en el temporizador
 * de micro-debounce (por ejemplo, al cambiar de pestaña o abandonar la página en menos de 250 ms).
 *
 * @returns {Promise<boolean>} `true` si había una sincronización pendiente y se ejecutó; `false` en caso contrario.
 *
 * @example
 * // Caso normal: forzar el volcado inmediato antes de navegar a otra vista MPA
 * await vaciarSyncAguaPendiente();
 *
 * @example
 * // Caso especial: invocación cuando no existen escrituras encoladas
 * const ejecutado = await vaciarSyncAguaPendiente(); // -> false
 *
 * @note Edge cases:
 * - Cancela el `setTimeout` activo y limpia `tareaSyncAguaPendiente` antes de ejecutar la promesa para garantizar idempotencia.
 */
export async function vaciarSyncAguaPendiente() {
  if (temporizadorSyncAgua) {
    clearTimeout(temporizadorSyncAgua);
    temporizadorSyncAgua = null;
  }
  if (typeof tareaSyncAguaPendiente === 'function') {
    const fn = tareaSyncAguaPendiente;
    tareaSyncAguaPendiente = null;
    await fn();
    return true;
  }
  return false;
}

/**
 * Modifica en forma incremental el consumo de agua diario (`+1` o `-1` vaso),
 * actualiza de inmediato `sessionStorage`, el DOM local y el canal global de eventos
 * `appcalorias:agua_actualizada`, y sincroniza asíncronamente con Supabase aplicando
 * un micro-debounce de 250 ms para coalescer pulsaciones rápidas consecutivas.
 *
 * @param {number} [delta=1] - Variación de vasos a aplicar (`+1` para sumar, `-1` para restar).
 * @returns {Promise<{ vasos: number[], litros: number, totalVasos: number, fechaISO: string }>} Estado consolidado tras el ajuste.
 *
 * @example
 * // Caso normal: incrementar un vaso de agua (pasando de 2 a 3 vasos con meta de 2.5 L)
 * const estado = await registrarAguaRapida(1);
 * // -> { vasos: [0, 1, 2], litros: 0.9, totalVasos: 8, fechaISO: "2026-10-31" }
 *
 * @example
 * // Caso especial (límite inferior): restar un vaso cuando el contador ya está en 0
 * const estadoMin = await registrarAguaRapida(-1);
 * // -> { vasos: [], litros: 0, totalVasos: 8, fechaISO: "2026-10-31" } (acotado en [0, totalVasos])
 *
 * @note Edge cases:
 * - El número de vasos resultante siempre se acota al rango cerrado `[0, totalVasos]`.
 * - Múltiples clics rápidos actualizan la interfaz en 0 ms y unifican la escritura remota en una sola petición a Supabase tras 250 ms de inactividad (o al instante ante `pagehide`/`visibilitychange`).
 */
export async function registrarAguaRapida(delta = 1) {
  const actual = obtenerEstadoAguaHoy();
  const totalVasos = actual.totalVasos || TOTAL_VASOS_DEFECTO;
  const metaLitros = actual.metaLitros || META_AGUA_DEFECTO;
  const litrosPorVaso = metaLitros / totalVasos;

  const nuevoVasos = Math.max(0, Math.min(totalVasos, actual.vasos + delta));
  const nuevoLitros = Math.round(nuevoVasos * litrosPorVaso * 10) / 10;
  const indices = Array.from({ length: nuevoVasos }, (_, i) => i);
  const fechaISO = actual.fechaISO || new Date().toISOString().slice(0, 10);

  const consolidado = {
    vasos: indices,
    litros: nuevoLitros,
    totalVasos,
    fechaISO
  };

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY_AGUA_HOY, JSON.stringify(consolidado));
      sessionStorage.setItem(CLAVE_STORAGE_AGUA, JSON.stringify(indices));
    } catch (_) {}
  }

  renderizarHidratacionHoy({
    vasos: nuevoVasos,
    totalVasos,
    litros: nuevoLitros,
    metaLitros,
    fechaISO
  });

  if (typeof window !== 'undefined') {
    emitiendoAguaInterna = true;
    try {
      window.dispatchEvent(new CustomEvent(EVENTO_AGUA_ACTUALIZADA, {
        detail: {
          vasos: nuevoVasos,
          total: totalVasos,
          litros: nuevoLitros,
          fechaISO
        }
      }));
    } finally {
      emitiendoAguaInterna = false;
    }
  }

  if (alumnoIdActual) {
    if (temporizadorSyncAgua) {
      clearTimeout(temporizadorSyncAgua);
    }
    const idAlumnoSync = alumnoIdActual;
    tareaSyncAguaPendiente = async () => {
      try {
        const { obtenerOCrearRegistroDiario, actualizarAgua } = await import('../data/registro-api.js');
        const log = await obtenerOCrearRegistroDiario(idAlumnoSync, fechaISO);
        if (log && log.id) {
          await actualizarAgua(log.id, nuevoLitros);
        }
      } catch (err) {
        console.warn('[progreso-ui] Error al sincronizar agua con Supabase:', err);
      }
    };
    temporizadorSyncAgua = setTimeout(() => {
      vaciarSyncAguaPendiente().catch(() => {});
    }, 250);
  }

  return consolidado;
}

/**
 * Vincula de forma idempotente los eventos de clic en los botones de ajuste rápido (`#btn-mas-agua` y `#btn-menos-agua`).
 *
 * @returns {void}
 *
 * @example
 * // Caso normal: enlazar botones al inicializar la pantalla de progreso
 * inicializarEventosAgua();
 *
 * @example
 * // Caso especial: llamadas repetidas no duplican listeners gracias a la bandera __agua_bound
 * inicializarEventosAgua();
 * inicializarEventosAgua();
 *
 * @note Edge cases:
 * - Si los botones `#btn-mas-agua` o `#btn-menos-agua` no existen en el DOM actual, finaliza sin errores.
 */
export function inicializarEventosAgua() {
  const btnMas = document.querySelector(SELECTORES.btnMasAgua);
  if (btnMas && !btnMas.__agua_bound) {
    btnMas.__agua_bound = true;
    btnMas.addEventListener('click', () => {
      registrarAguaRapida(1).catch((e) => console.warn('[progreso-ui] Error en +1 vaso:', e));
    });
  }

  const btnMenos = document.querySelector(SELECTORES.btnMenosAgua);
  if (btnMenos && !btnMenos.__agua_bound) {
    btnMenos.__agua_bound = true;
    btnMenos.addEventListener('click', () => {
      registrarAguaRapida(-1).catch((e) => console.warn('[progreso-ui] Error en -1 vaso:', e));
    });
  }
}

/**
 * Procesa eventos `appcalorias:agua_actualizada` emitidos desde otros componentes (ej. Dashboard)
 * y sincroniza el estado en `sessionStorage` y la vista de Progreso.
 *
 * @param {CustomEvent<{ vasos: number|number[], total?: number, litros?: number, fechaISO?: string }>} evento - Evento personalizado de hidratación.
 * @returns {void}
 *
 * @example
 * // Caso normal: escuchar evento disparado en window
 * window.addEventListener('appcalorias:agua_actualizada', sincronizarAguaReactiva);
 *
 * @example
 * // Caso especial: evento sin detail (se ignora de forma segura)
 * sincronizarAguaReactiva(new CustomEvent('appcalorias:agua_actualizada'));
 *
 * @note Edge cases:
 * - Acepta `detail.vasos` tanto en formato numérico (`6`) como de arreglo de índices (`[0, 1, 2]`), o infiere los vasos a partir de `detail.litros`.
 */
export function sincronizarAguaReactiva(evento) {
  const detail = evento?.detail;
  if (!detail) return;

  const actual = obtenerEstadoAguaHoy();
  const totalVasos = detail.total || actual.totalVasos || TOTAL_VASOS_DEFECTO;
  const metaLitros = actual.metaLitros || META_AGUA_DEFECTO;
  const litrosPorVaso = metaLitros / totalVasos;

  let count = 0;
  let indices = [];
  if (Array.isArray(detail.vasos)) {
    indices = detail.vasos;
    count = indices.length;
  } else if (typeof detail.vasos === 'number') {
    count = Math.max(0, Math.min(totalVasos, detail.vasos));
    indices = Array.from({ length: count }, (_, i) => i);
  } else if (typeof detail.litros === 'number') {
    count = Math.min(totalVasos, Math.round(detail.litros / litrosPorVaso));
    indices = Array.from({ length: count }, (_, i) => i);
  }

  const litros = typeof detail.litros === 'number'
    ? detail.litros
    : Math.round(count * litrosPorVaso * 10) / 10;

  const fechaISO = detail.fechaISO || actual.fechaISO;

  try {
    sessionStorage.setItem(STORAGE_KEY_AGUA_HOY, JSON.stringify({
      vasos: indices,
      litros,
      totalVasos,
      fechaISO
    }));
    sessionStorage.setItem(CLAVE_STORAGE_AGUA, JSON.stringify(indices));
  } catch (_) {}

  renderizarHidratacionHoy({
    vasos: count,
    totalVasos,
    litros,
    metaLitros,
    fechaISO
  });
}

/**
 * Registra un nuevo pesaje corporal del alumno, lo persiste en `sessionStorage`
 * (`appcalorias_peso_actual` e historial), actualiza la vista de progreso y emite
 * el evento global `appcalorias:peso_actualizado`.
 *
 * @param {number|string} peso - Peso corporal medido en kilogramos (debe ser `> 0`).
 * @param {string} [fecha=new Date().toISOString()] - Marca de tiempo ISO 8601 del registro.
 * @param {string} [nota=''] - Observación opcional asociada al pesaje.
 * @returns {Promise<boolean>} `true` si el pesaje es válido y fue registrado; `false` si es inválido.
 *
 * @example
 * // Caso normal: registrar un nuevo control de peso con nota
 * const ok = await agregarPesaje(72.5, '2026-10-31T08:30:00.000Z', 'Control semanal');
 * // -> true
 *
 * @example
 * // Caso especial: peso negativo, cero o no numérico es rechazado
 * await agregarPesaje(-5);   // -> false
 * await agregarPesaje('abc'); // -> false
 *
 * @note Edge cases:
 * - Si `peso <= 0` o `Number.isNaN(Number(peso))`, retorna `false` inmediatamente sin tocar `sessionStorage` ni emitir eventos.
 */
export async function agregarPesaje(peso, fecha = new Date().toISOString(), nota = '') {
  const numPeso = Number(peso);
  if (Number.isNaN(numPeso) || numPeso <= 0) return false;

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY_PESO_ACTUAL, String(numPeso));
    } catch (_) {}
  }

  const historial = obtenerHistorialPesajes();
  historial.unshift({
    peso: numPeso,
    fecha,
    nota
  });
  guardarHistorialPesajes(historial);

  // Sincronizar contexto si está presente en sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      const idActual = alumnoIdActual;
      if (idActual) {
        const raw = sessionStorage.getItem(`appcalorias_contexto_ultimo_${idActual}`);
        if (raw) {
          const ctx = JSON.parse(raw);
          ctx.peso_actual = numPeso;
          sessionStorage.setItem(`appcalorias_contexto_ultimo_${idActual}`, JSON.stringify(ctx));
        }
      }
      const rawGen = sessionStorage.getItem('appcalorias_contexto_ultimo');
      if (rawGen) {
        const ctxGen = JSON.parse(rawGen);
        ctxGen.peso_actual = numPeso;
        sessionStorage.setItem('appcalorias_contexto_ultimo', JSON.stringify(ctxGen));
      }
    } catch (_) {}
  }

  const datos = await cargarDatosProgreso(alumnoIdActual);
  datos.pesoActual = numPeso;
  renderizarProgreso(datos, historial);

  // Emitir evento reactivo oficial en window
  if (typeof window !== 'undefined') {
    const timestamp = (fecha ? new Date(fecha).getTime() : Date.now()) || Date.now();
    emitiendoPesoInterno = true;
    try {
      window.dispatchEvent(new CustomEvent(EVENTO_PESO_ACTUALIZADO, {
        detail: { peso: numPeso, fecha, timestamp, ...(nota ? { nota } : {}) }
      }));
    } finally {
      emitiendoPesoInterno = false;
    }
  }

  return true;
}

/**
 * Procesa el evento reactivo `appcalorias:peso_actualizado` emitido desde otros módulos
 * (como la regla deslizable de `objetivo-ui.js`), deduplicando registros con menos de 2 segundos
 * de diferencia y refrescando el DOM de progreso sin recargar la página.
 *
 * @param {CustomEvent<{ peso: number|string, fecha?: string, nota?: string }>} evento - Evento personalizado de pesaje.
 * @returns {Promise<void>}
 *
 * @example
 * // Caso normal: sincronizar pesaje recibido desde el selector de perfil
 * await sincronizarPesajeReactivo(new CustomEvent('appcalorias:peso_actualizado', {
 *   detail: { peso: 71.9, fecha: '2026-10-31T09:00:00.000Z', nota: 'Regla perfil' }
 * }));
 *
 * @example
 * // Caso especial: evento sin detail o con peso inválido se ignora de forma segura
 * await sincronizarPesajeReactivo(new CustomEvent('appcalorias:peso_actualizado'));
 *
 * @note Edge cases:
 * - Evita duplicar filas en el historial si ya existe un pesaje con el mismo valor y una diferencia temporal menor a 2000 ms.
 */
export async function sincronizarPesajeReactivo(evento) {
  const detail = evento?.detail;
  if (!detail || detail.peso === undefined) return;
  const numPeso = Number(detail.peso);
  if (Number.isNaN(numPeso) || numPeso <= 0) return;

  const fecha = detail.fecha || new Date().toISOString();
  const nota = detail.nota || '';

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY_PESO_ACTUAL, String(numPeso));
    } catch (_) {}
  }

  const historial = obtenerHistorialPesajes();
  const yaExiste = historial.some((item) => {
    if (Number(item.peso) !== numPeso) return false;
    if (item.fecha === fecha) return true;
    const tItem = new Date(item.fecha).getTime();
    const tEvent = new Date(fecha).getTime();
    return !Number.isNaN(tItem) && !Number.isNaN(tEvent) && Math.abs(tItem - tEvent) < 2000;
  });

  if (!yaExiste) {
    historial.unshift({
      peso: numPeso,
      fecha,
      nota
    });
    guardarHistorialPesajes(historial);
  }

  // Sincronizar contexto local
  if (typeof sessionStorage !== 'undefined') {
    try {
      const idActual = alumnoIdActual;
      if (idActual) {
        const raw = sessionStorage.getItem(`appcalorias_contexto_ultimo_${idActual}`);
        if (raw) {
          const ctx = JSON.parse(raw);
          ctx.peso_actual = numPeso;
          sessionStorage.setItem(`appcalorias_contexto_ultimo_${idActual}`, JSON.stringify(ctx));
        }
      }
      const rawGen = sessionStorage.getItem('appcalorias_contexto_ultimo');
      if (rawGen) {
        const ctxGen = JSON.parse(rawGen);
        ctxGen.peso_actual = numPeso;
        sessionStorage.setItem('appcalorias_contexto_ultimo', JSON.stringify(ctxGen));
      }
    } catch (_) {}
  }

  const datos = await cargarDatosProgreso(alumnoIdActual);
  datos.pesoActual = numPeso;
  renderizarProgreso(datos, historial);
}

// Escuchar eventos reactivos globales en window
if (typeof window !== 'undefined') {
  window.addEventListener(EVENTO_PESO_ACTUALIZADO, (e) => {
    if (emitiendoPesoInterno) return;
    sincronizarPesajeReactivo(e).catch((err) => {
      console.warn('[progreso-ui] Error al procesar appcalorias:peso_actualizado:', err);
    });
  });

  window.addEventListener(EVENTO_AGUA_ACTUALIZADA, (e) => {
    if (emitiendoAguaInterna) return;
    try {
      sincronizarAguaReactiva(e);
    } catch (err) {
      console.warn('[progreso-ui] Error al procesar appcalorias:agua_actualizada:', err);
    }
  });

  window.addEventListener('pagehide', () => {
    vaciarSyncAguaPendiente().catch(() => {});
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      vaciarSyncAguaPendiente().catch(() => {});
    }
  });
}

/**
 * Inicializa la pantalla de Progreso del Alumno verificando su sesión (`exigirRol('alumno')`),
 * cargando sus datos antropométricos e historial de pesajes, renderizando el DOM y enlazando los botones de agua.
 *
 * @returns {Promise<{ sesion: Object, datos: Object, historial: Array }|null>} Estado inicializado de la vista o `null` si no hay sesión válida.
 *
 * @example
 * // Caso normal: inicialización completa al cargar progreso.html
 * const estado = await iniciarProgresoUI();
 *
 * @example
 * // Caso especial: usuario sin sesión activa es redirigido por exigirRol y retorna null
 * const sinSesion = await iniciarProgresoUI(); // -> null
 *
 * @note Edge cases:
 * - Si `exigirRol('alumno')` devuelve `null`, aborta el renderizado sin modificar el DOM.
 */
export async function iniciarProgresoUI() {
  const sesion = await exigirRol('alumno');
  if (!sesion) return null;

  alumnoIdActual = sesion.usuarioId;
  const datos = await cargarDatosProgreso(alumnoIdActual);
  const historial = obtenerHistorialPesajes();

  renderizarProgreso(datos, historial);
  renderizarHidratacionHoy();
  inicializarEventosAgua();
  return { sesion, datos, historial };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      iniciarProgresoUI().catch((e) => console.error('[progreso-ui] Error al iniciar:', e));
    });
  } else {
    iniciarProgresoUI().catch((e) => console.error('[progreso-ui] Error al iniciar:', e));
  }
}
