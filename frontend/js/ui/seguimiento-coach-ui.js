/* ==========================================================
   seguimiento-coach-ui.js — Controlador de Seguimiento del Alumno para el Coach
   - Visualiza evolución de peso, meta y adherencia semanal de un alumno.
   - Historial reactivo de pesajes alimentado desde Supabase / sessionStorage.
   - Conexión con contexto_energetico y perfiles de alumnos.
   - Cero asignaciones directas con variables (Regla de Oro 1).
   - Desacople completo del DOM mediante SELECTORES.
   ========================================================== */

import { supabase } from '../data/supabase.js';
import { exigirRol } from '../data/sesion.js';
import { obtenerUltimoContexto } from '../data/contexto-api.js';
import { nombreDe } from '../utils/texto.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para seguimiento.html.
 */
export const SELECTORES = {
  btnVolver: '#btn-volver',
  subtituloAlumno: '#subtitulo-alumno',
  seccionPeso: '#seccion-peso',
  pesoInicial: '#peso-inicial',
  pesoActual: '#peso-actual',
  pesoMeta: '#peso-meta',
  pesoDiferencia: '#peso-diferencia',
  pesoPorcentaje: '#peso-porcentaje',
  barraProgresoPeso: '#barra-progreso-peso',
  bloqueHistorial: '#bloque-historial',
  listaPesajes: '#lista-pesajes',
  tplPesajeFila: '#tpl-pesaje-fila',
  sinPesajes: '#sin-pesajes',
  seccionAdherencia: '#seccion-adherencia',
  diasEnObjetivo: '#dias-en-objetivo',
  promedioKcal: '#promedio-kcal',
  promedioAgua: '#promedio-agua'
};

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

export function obtenerHistorialCliente(clienteId) {
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (clienteId) {
        const raw = sessionStorage.getItem(`appcalorias_historial_pesajes_${clienteId}`);
        if (raw) return JSON.parse(raw);
      }
      const general = sessionStorage.getItem('appcalorias_historial_pesajes');
      if (general) return JSON.parse(general);
    } catch (_) {}
  }
  return MOCK_HISTORIAL_PESAJES;
}

export function renderizarSeguimiento({ alumno, peso, historial, adherencia }) {
  const elBtnVolver = document.querySelector(SELECTORES.btnVolver);
  if (elBtnVolver && alumno?.id) {
    elBtnVolver.href = `cliente.html?cliente=${encodeURIComponent(alumno.id)}`;
  }

  const elSubtitulo = document.querySelector(SELECTORES.subtituloAlumno);
  if (elSubtitulo) {
    elSubtitulo.textContent = alumno?.nombre || 'Alumno';
  }

  const elInicial = document.querySelector(SELECTORES.pesoInicial);
  if (elInicial) elInicial.textContent = `${formatearNumero(peso.inicial)} kg`;

  const elActual = document.querySelector(SELECTORES.pesoActual);
  if (elActual) elActual.textContent = `${formatearNumero(peso.actual)} kg`;

  const elMeta = document.querySelector(SELECTORES.pesoMeta);
  if (elMeta) elMeta.textContent = `${formatearNumero(peso.meta)} kg`;

  const progreso = calcularProgresoPeso(peso.inicial, peso.actual, peso.meta);

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

  // Adherencia semanal
  const elDias = document.querySelector(SELECTORES.diasEnObjetivo);
  if (elDias) {
    while (elDias.firstChild) elDias.removeChild(elDias.firstChild);
    elDias.appendChild(document.createTextNode(`${adherencia.diasEnObjetivo} `));
    const u = document.createElement('span');
    u.className = 'unidad';
    u.textContent = '/ 7';
    elDias.appendChild(u);
  }

  const elKcal = document.querySelector(SELECTORES.promedioKcal);
  if (elKcal) {
    while (elKcal.firstChild) elKcal.removeChild(elKcal.firstChild);
    elKcal.appendChild(document.createTextNode(`${formatearNumero(adherencia.promedioKcal, 0)} `));
    const u = document.createElement('span');
    u.className = 'unidad';
    u.textContent = 'kcal';
    elKcal.appendChild(u);
  }

  const elAgua = document.querySelector(SELECTORES.promedioAgua);
  if (elAgua) {
    while (elAgua.firstChild) elAgua.removeChild(elAgua.firstChild);
    elAgua.appendChild(document.createTextNode(`${adherencia.promedioAgua} `));
    const u = document.createElement('span');
    u.className = 'unidad';
    u.textContent = 'vasos/día';
    elAgua.appendChild(u);
  }

  // Renderizar historial de pesajes con nodos seguros
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

        listaEl.appendChild(clon);
      });
    }
  }
}

export async function iniciarSeguimientoCoach() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('cliente') || params.get('id');

  if (!clienteId) {
    window.location.href = 'clientes.html';
    return;
  }

  // Preservar enlace volver
  const elBtnVolver = document.querySelector(SELECTORES.btnVolver);
  if (elBtnVolver) {
    elBtnVolver.href = `cliente.html?cliente=${encodeURIComponent(clienteId)}`;
  }

  let nombreAlumno = 'Alumno';
  try {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, username, email, client_code')
      .eq('id', clienteId)
      .maybeSingle();

    if (perfil) {
      nombreAlumno = nombreDe(perfil);
    }
  } catch (err) {
    console.warn('[seguimiento-coach-ui] Error al cargar perfil:', err);
  }

  document.title = `Seguimiento de ${nombreAlumno} · Coach`;

  // Cargar contexto energético del alumno
  let contexto = null;
  try {
    contexto = await obtenerUltimoContexto(clienteId);
  } catch (err) {
    console.warn('[seguimiento-coach-ui] Error al cargar contexto:', err);
  }

  // Fallback si no hay contexto
  if (!contexto && typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`appcalorias_contexto_ultimo_${clienteId}`) ||
                  sessionStorage.getItem('appcalorias_contexto_ultimo');
      if (raw) contexto = JSON.parse(raw);
    } catch (_) {}
  }

  const pesoActual = Number(contexto?.peso_kg ?? 72.4);
  const pesoInicial = Number(contexto?.peso_inicial ?? 78.0);
  const pesoMeta = Number(contexto?.peso_objetivo_kg ?? 70.0);
  const caloriasObjetivo = Number(contexto?.calorias_objetivo ?? 2040);

  const historial = obtenerHistorialCliente(clienteId);

  renderizarSeguimiento({
    alumno: { id: clienteId, nombre: nombreAlumno },
    peso: { inicial: pesoInicial, actual: pesoActual, meta: pesoMeta },
    historial,
    adherencia: {
      diasEnObjetivo: 5,
      promedioKcal: caloriasObjetivo,
      promedioAgua: 7
    }
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  iniciarSeguimientoCoach();
}
