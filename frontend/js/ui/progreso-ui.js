/* ==========================================================
   progreso-ui.js — Controlador de evolución de peso y hábitos del alumno
   - Muestra peso inicial, actual y meta, con porcentaje de avance.
   - Historial reactivo de pesajes alimentado desde sessionStorage / contextos_energeticos.
   - Resumen de adherencia calórica e hidratación diaria.
   - Cero innerHTML con datos variables (Regla de Oro 1).
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { obtenerUltimoContexto } from '../data/contexto-api.js';
import '../utils/navegacion.js';

export const SELECTORES = {
  seccionPeso: '#seccion-peso',
  seccionHabitos: '#seccion-habitos',
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
  promedioAgua: '#promedio-agua'
};

export const CLAVE_STORAGE_PESAJES = 'appcalorias_historial_pesajes';
export const CLAVE_STORAGE_PESO_ACTUAL = 'appcalorias_peso_actual';
export const CLAVE_STORAGE_AGUA = 'vasos-agua-alumno';

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

export function formatearNumero(valor, maxDecimales = 1) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', { maximumFractionDigits: maxDecimales });
}

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
      const pAct = sessionStorage.getItem(CLAVE_STORAGE_PESO_ACTUAL);
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

export function obtenerHistorialPesajes() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(CLAVE_STORAGE_PESAJES);
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

export function guardarHistorialPesajes(historial) {
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(CLAVE_STORAGE_PESAJES, JSON.stringify(historial));
    } catch (e) {
      console.warn('[progreso-ui] Error al guardar appcalorias_historial_pesajes:', e);
    }
  }
}

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
  const listaEl = document.querySelector(SELECTORES.listaPesajes);
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
}

export async function agregarPesaje(peso, fecha = new Date().toISOString(), nota = '') {
  const numPeso = Number(peso);
  if (Number.isNaN(numPeso) || numPeso <= 0) return false;

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CLAVE_STORAGE_PESO_ACTUAL, String(numPeso));
  }

  const historial = obtenerHistorialPesajes();
  historial.unshift({
    peso: numPeso,
    fecha,
    nota
  });
  guardarHistorialPesajes(historial);

  const datos = await cargarDatosProgreso(alumnoIdActual);
  datos.pesoActual = numPeso;
  renderizarProgreso(datos, historial);
  return true;
}

export async function iniciarProgresoUI() {
  const sesion = await exigirRol('alumno');
  if (!sesion) return null;

  alumnoIdActual = sesion.usuarioId;
  const datos = await cargarDatosProgreso(alumnoIdActual);
  const historial = obtenerHistorialPesajes();

  renderizarProgreso(datos, historial);
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
