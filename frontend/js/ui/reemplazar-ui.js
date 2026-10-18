/* ==========================================================
   reemplazar-ui.js — Controlador UI modular de reemplazo de alimentos
   - Conecta el motor analítico de equivalencias con la interfaz del alumno.
   - Parsea parámetros de URL con fallback seguro y actualiza el encabezado.
   - Búsqueda interactiva local sobre base curada de alimentos frecuentes.
   - Clasificación visual y reactiva según niveles:
     * 'equivalente': tag verde, cantidad calculada y botón primario.
     * 'parcial': tag naranja, cantidad calculada y mensaje de divergencia explicativo.
     * 'no': tag gris, aviso educativo visible y botón secundario "Cambiar igual por [alimento]".
   - Persiste aviso en sessionStorage y redirige al dashboard.
   - Desacople total mediante mapa de selectores SELECTORES.
   Módulo ES puro: cero dependencias externas.
   ========================================================== */

import { calcularEquivalenciaDirecta, aNumeroSeguro } from '../calc/equivalencia-calc.js';
import { guardarAvisoToast, mostrarAvisoFlotante } from '../utils/navegacion.js';
import { buscarAlimentosLocales, ALIMENTOS_BASE } from '../data/alimentos-locales.js';

/**
 * Mapa centralizado de selectores del DOM.
 * Permite adaptar cualquier cambio en el HTML o en las clases en una sola línea.
 */
export const SELECTORES = {
  // Encabezado
  antetitulo: '.encabezado__textos .antetitulo',
  titulo: '.encabezado__textos .titulo',
  subtitulo: '.encabezado__textos .sub',

  // Buscador y estados visuales
  inputBuscar: 'input[name="buscar"]',
  estadoVacio: '.vacio',
  bloqueResultados: '.columna.gap-2xs',
  tituloResultados: '.columna.gap-2xs .antetitulo',
  contenedorReemplazos: '.reemplazos',
  sinResultados: '.nota-centrada',

  // Pie y confirmación
  notaNoEquivalente: '.pie .nota',
  btnConfirmar: '#btn-confirmar-reemplazo, .pie .btn--primario, .pie .btn--secundario:not([data-volver])',
  btnCancelar: '.pie [data-volver]'
};

/**
 * Alimento objetivo por defecto cuando la pantalla se abre sin parámetros en la URL.
 * Representa una porción típica de pechuga de pollo de almuerzo.
 */
export const ALIMENTO_OBJETIVO_DEFECTO = {
  nombre: 'Pechuga de pollo',
  gramos: 150,
  kcal: 180,
  p: 33.8,
  c: 0,
  g: 3.8,
  comida: 'Almuerzo'
};

/**
 * Sanitiza texto para inserción segura en el DOM previniendo ataques DOM-XSS.
 * @param {*} texto
 * @returns {string}
 */
export function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Extrae y sanitiza los parámetros del alimento objetivo desde la query string.
 * Si algún valor falta o es inválido, aplica el valor por defecto coherente.
 *
 * @param {string} [search] - Cadena de búsqueda (ej. window.location.search).
 * @returns {{
 *   nombre: string,
 *   gramos: number,
 *   kcal: number,
 *   p: number,
 *   c: number,
 *   g: number,
 *   comida: string,
 *   esAbsoluto: boolean
 * }}
 */
export function obtenerAlimentoObjetivoDesdeUrl(search = (typeof window !== 'undefined' ? window.location.search : '')) {
  const defecto = { ...ALIMENTO_OBJETIVO_DEFECTO };
  if (!search || typeof search !== 'string') {
    return { ...defecto, esAbsoluto: true };
  }

  try {
    const params = new URLSearchParams(search);
    const nombre = params.get('nombre')?.trim() || params.get('alimento')?.trim();
    const comida = params.get('comida')?.trim() || defecto.comida;

    let gramos = defecto.gramos;
    if (params.has('gramos')) {
      gramos = aNumeroSeguro(params.get('gramos'), defecto.gramos);
    } else if (params.has('cantidad_g')) {
      gramos = aNumeroSeguro(params.get('cantidad_g'), defecto.gramos);
    }

    const tieneP = params.has('p') || params.has('proteinas') || params.has('proteina');
    const p = tieneP
      ? aNumeroSeguro(params.get('p') ?? params.get('proteinas') ?? params.get('proteina'), defecto.p)
      : defecto.p;

    const tieneC = params.has('c') || params.has('carbohidratos') || params.has('carbohidrato') || params.has('carbs');
    const c = tieneC
      ? aNumeroSeguro(params.get('c') ?? params.get('carbohidratos') ?? params.get('carbohidrato') ?? params.get('carbs'), defecto.c)
      : defecto.c;

    const tieneG = params.has('g') || params.has('grasas') || params.has('grasa') || params.has('fat');
    const g = tieneG
      ? aNumeroSeguro(params.get('g') ?? params.get('grasas') ?? params.get('grasa') ?? params.get('fat'), defecto.g)
      : defecto.g;

    const tieneKcal = params.has('kcal') || params.has('calorias') || params.has('calories');
    let kcal = defecto.kcal;
    if (tieneKcal) {
      kcal = aNumeroSeguro(params.get('kcal') ?? params.get('calorias') ?? params.get('calories'), defecto.kcal);
    } else if (tieneP || tieneC || tieneG) {
      // Si se proporcionaron macronutrientes pero se omitió kcal, calcular según fórmula estándar Atwater
      kcal = Math.round((4 * Math.max(0, p)) + (4 * Math.max(0, c)) + (9 * Math.max(0, g)));
    }

    return {
      nombre: nombre || defecto.nombre,
      gramos: Math.max(1, gramos),
      kcal: Math.max(0, kcal),
      p: Math.max(0, p),
      c: Math.max(0, c),
      g: Math.max(0, g),
      comida,
      // Los macros provenientes del plan/URL ya corresponden a la porción total
      esAbsoluto: true
    };
  } catch {
    return { ...defecto, esAbsoluto: true };
  }
}

/**
 * Renderiza los datos del alimento objetivo en el encabezado de la página.
 * @param {Object} alimentoObjetivo
 * @param {Object} [mapaSelectores=SELECTORES]
 */
export function renderizarEncabezado(alimentoObjetivo, mapaSelectores = SELECTORES) {
  if (!alimentoObjetivo || typeof document === 'undefined') return;

  const elAntetitulo = document.querySelector(mapaSelectores.antetitulo);
  const elTitulo = document.querySelector(mapaSelectores.titulo);
  const elSubtitulo = document.querySelector(mapaSelectores.subtitulo);

  if (elAntetitulo) {
    elAntetitulo.textContent = `Reemplazar · ${alimentoObjetivo.comida || 'Comida'}`;
  }

  if (elTitulo) {
    elTitulo.innerHTML = `${escaparHtml(alimentoObjetivo.nombre)} <span class="texto-gris">${alimentoObjetivo.gramos} g</span>`;
  }

  if (elSubtitulo) {
    elSubtitulo.textContent = `${alimentoObjetivo.kcal} kcal · P ${alimentoObjetivo.p} · C ${alimentoObjetivo.c} · G ${alimentoObjetivo.g}`;
  }
}

/**
 * Genera el HTML semántico y accesible para una tarjeta de reemplazo individual.
 *
 * @param {Object} candidato - Alimento alternativo.
 * @param {Object} calculo - Resultado del cálculo de equivalencia directa.
 * @param {boolean} [esSeleccionado=false] - Si la opción está marcada como activa.
 * @returns {string} Markup HTML del botón con role="radio".
 */
export function renderizarTarjetaReemplazo(candidato, calculo, esSeleccionado = false) {
  const nivel = calculo.nivel || 'no';
  let tagClase = 'tag--verde';
  let nivelTexto = 'Equivalente';

  if (nivel === 'parcial') {
    tagClase = 'tag--naranja';
    nivelTexto = 'Equivalencia parcial';
  } else if (nivel === 'no') {
    tagClase = 'tag--gris';
    nivelTexto = 'No equivalente';
  }

  const macroLinea = `${calculo.aportes.kcal} kcal · P ${calculo.aportes.proteinas} · C ${calculo.aportes.carbohidratos} · G ${calculo.aportes.grasas}`;

  const divergenciaHtml = (nivel === 'parcial' && calculo.mensajeDivergencia)
    ? `<span class="sub texto-12">${escaparHtml(calculo.mensajeDivergencia)}</span>`
    : '';

  const idSeguro = escaparHtml(candidato.id || candidato.nombre);
  const nombreSeguro = escaparHtml(candidato.nombre);
  const cantidadSegura = escaparHtml(calculo.textoCantidad);

  return `
    <button class="reemplazo" type="button" role="radio" aria-checked="${esSeleccionado ? 'true' : 'false'}" tabindex="${esSeleccionado ? '0' : '-1'}" data-nivel="${nivel}" data-id="${idSeguro}">
      <span class="radio"></span>
      <span class="crece columna gap-2xs">
        <span class="alimento-fila__titulo">${nombreSeguro}</span>
        <span class="reemplazo__nivel">${nivelTexto}</span>
        <span class="alimento-fila__linea">${macroLinea}</span>
        ${divergenciaHtml}
      </span>
      <span class="reemplazo__lado">
        <span class="alimento-fila__cantidad">${cantidadSegura}</span>
        <span class="tag ${tagClase}">${calculo.adherencia}%</span>
      </span>
    </button>
  `.trim();
}

/**
 * Estado en memoria del controlador de la página reemplazar.html.
 */
let estadoControlador = {
  alimentoObjetivo: null,
  opcionesActuales: [],
  opcionSeleccionada: null,
  iniciado: false
};

/**
 * Actualiza el estado visual del pie de página y el botón de confirmación
 * según el nivel y nombre del alimento seleccionado.
 *
 * @param {Object|null} seleccion - Objeto { candidato, calculo } o null.
 * @param {Object} [mapaSelectores=SELECTORES]
 */
export function actualizarPieConfirmacion(seleccion, mapaSelectores = SELECTORES) {
  if (typeof document === 'undefined') return;

  const elNota = document.querySelector(mapaSelectores.notaNoEquivalente);
  const btnConfirmar = document.querySelector(mapaSelectores.btnConfirmar);

  if (!btnConfirmar) return;

  if (!seleccion) {
    if (elNota) elNota.hidden = true;
    btnConfirmar.classList.remove('btn--secundario');
    btnConfirmar.classList.add('btn--primario');
    btnConfirmar.innerHTML = `<svg class="icono icono--grueso" width="18" height="18" aria-hidden="true"><use href="#reemplazar"/></svg>Reemplazar`;
    return;
  }

  const nivel = seleccion.calculo.nivel;
  const nombreCandidato = seleccion.candidato.nombre;

  if (nivel === 'no') {
    // Caso No Equivalente: aviso educativo visible y botón secundario "Cambiar igual por [alimento]"
    if (elNota) elNota.hidden = false;
    btnConfirmar.classList.remove('btn--primario');
    btnConfirmar.classList.add('btn--secundario');
    btnConfirmar.innerHTML = `<svg class="icono icono--grueso" width="18" height="18" aria-hidden="true"><use href="#reemplazar"/></svg>Cambiar igual por ${escaparHtml(nombreCandidato)}`;
  } else {
    // Casos Equivalente o Parcial: aviso oculto y botón primario "Reemplazar"
    if (elNota) elNota.hidden = true;
    btnConfirmar.classList.remove('btn--secundario');
    btnConfirmar.classList.add('btn--primario');
    btnConfirmar.innerHTML = `<svg class="icono icono--grueso" width="18" height="18" aria-hidden="true"><use href="#reemplazar"/></svg>Reemplazar`;
  }
}

/**
 * Ejecuta una búsqueda de alimentos y renderiza los resultados calculados.
 *
 * @param {string} termino - Texto ingresado en el buscador.
 * @param {Object} alimentoObjetivo - Alimento base a reemplazar.
 * @param {Object} [mapaSelectores=SELECTORES] - Selectores del DOM.
 * @param {Array<Object>} [catalogo=ALIMENTOS_BASE] - Catálogo de alimentos.
 * @returns {Array<Object>} Resultados procesados { candidato, calculo }.
 */
export function ejecutarBusqueda(termino, alimentoObjetivo, mapaSelectores = SELECTORES, catalogo = ALIMENTOS_BASE) {
  if (typeof document === 'undefined') return [];

  const elVacio = document.querySelector(mapaSelectores.estadoVacio);
  const elBloqueResultados = document.querySelector(mapaSelectores.bloqueResultados);
  const elTituloResultados = document.querySelector(mapaSelectores.tituloResultados);
  const elContenedorReemplazos = document.querySelector(mapaSelectores.contenedorReemplazos);
  const elSinResultados = document.querySelector(mapaSelectores.sinResultados);

  const textoLimpio = (termino || '').trim();

  // 1. Si el buscador está vacío: restaurar pantalla de invitación inicial
  if (!textoLimpio) {
    if (elVacio) elVacio.hidden = false;
    if (elBloqueResultados) elBloqueResultados.hidden = true;
    if (elContenedorReemplazos) {
      elContenedorReemplazos.hidden = true;
      elContenedorReemplazos.innerHTML = '';
    }
    if (elSinResultados) elSinResultados.hidden = true;

    estadoControlador.opcionesActuales = [];
    estadoControlador.opcionSeleccionada = null;
    actualizarPieConfirmacion(null, mapaSelectores);
    return [];
  }

  // 2. Buscar coincidencias en el catálogo base
  const candidatos = buscarAlimentosLocales(textoLimpio, catalogo);

  // 3. Si no hay resultados
  if (candidatos.length === 0) {
    if (elVacio) elVacio.hidden = true;
    if (elBloqueResultados) elBloqueResultados.hidden = true;
    if (elContenedorReemplazos) {
      elContenedorReemplazos.hidden = true;
      elContenedorReemplazos.innerHTML = '';
    }
    if (elSinResultados) elSinResultados.hidden = false;

    estadoControlador.opcionesActuales = [];
    estadoControlador.opcionSeleccionada = null;
    actualizarPieConfirmacion(null, mapaSelectores);
    return [];
  }

  // 4. Calcular equivalencia directa para cada candidato
  const resultados = candidatos.map((candidato) => {
    const calculo = calcularEquivalenciaDirecta(alimentoObjetivo, candidato);
    return { candidato, calculo };
  });

  // Ordenar resultados priorizando mayor adherencia y mayor similitud
  resultados.sort((a, b) => {
    if (b.calculo.adherencia !== a.calculo.adherencia) {
      return b.calculo.adherencia - a.calculo.adherencia;
    }
    return b.calculo.similitud - a.calculo.similitud;
  });

  // 5. Renderizar resultados en el DOM
  if (elVacio) elVacio.hidden = true;
  if (elSinResultados) elSinResultados.hidden = true;

  if (elTituloResultados) {
    elTituloResultados.textContent = `Resultados · ${resultados.length}`;
  }
  if (elBloqueResultados) elBloqueResultados.hidden = false;

  if (elContenedorReemplazos) {
    // La primera opción queda preseleccionada por defecto
    const htmlCards = resultados.map((item, index) => {
      const esSeleccionado = index === 0;
      return renderizarTarjetaReemplazo(item.candidato, item.calculo, esSeleccionado);
    }).join('\n');

    elContenedorReemplazos.innerHTML = htmlCards;
    elContenedorReemplazos.hidden = false;
  }

  // Guardar en el estado del controlador y actualizar el pie con la primera opción seleccionada
  estadoControlador.opcionesActuales = resultados;
  estadoControlador.opcionSeleccionada = resultados[0];
  actualizarPieConfirmacion(resultados[0], mapaSelectores);

  return resultados;
}

/**
 * Inicializa el controlador de la vista reemplazar.html.
 * Vincula eventos de búsqueda, selección y confirmación.
 *
 * @param {Object} [configuracion] - Permite sobreescribir selectores, catálogo o alimento objetivo.
 */
export function iniciarReemplazarUI(configuracion = {}) {
  const mapaSelectores = { ...SELECTORES, ...configuracion.selectores };
  const catalogo = configuracion.catalogo || ALIMENTOS_BASE;

  const elInputBuscar = document.querySelector(mapaSelectores.inputBuscar);
  const elContenedorReemplazos = document.querySelector(mapaSelectores.contenedorReemplazos);
  const btnConfirmar = document.querySelector(mapaSelectores.btnConfirmar);

  // Si la página no contiene los elementos mínimos de reemplazo, no inicializar
  if (!elInputBuscar && !elContenedorReemplazos) return;

  // 1. Obtener y renderizar alimento objetivo
  const alimentoObjetivo = configuracion.alimentoObjetivo || obtenerAlimentoObjetivoDesdeUrl();
  estadoControlador.alimentoObjetivo = alimentoObjetivo;
  renderizarEncabezado(alimentoObjetivo, mapaSelectores);

  // 2. Eventos del buscador (tecla Enter, evento search del teclado móvil y limpieza reactiva)
  if (elInputBuscar) {
    const dispararBusqueda = () => {
      ejecutarBusqueda(elInputBuscar.value, alimentoObjetivo, mapaSelectores, catalogo);
    };

    elInputBuscar.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        dispararBusqueda();
      }
    });

    elInputBuscar.addEventListener('search', () => {
      dispararBusqueda();
    });

    elInputBuscar.addEventListener('input', () => {
      if (!elInputBuscar.value.trim()) {
        ejecutarBusqueda('', alimentoObjetivo, mapaSelectores, catalogo);
      }
    });
  }

  // 3. Selección reactiva y navegación accesible por teclado en .reemplazos
  if (elContenedorReemplazos) {
    const seleccionarTarjeta = (tarjetaBtn) => {
      if (!tarjetaBtn) return;
      const idCandidato = tarjetaBtn.dataset.id;
      const itemElegido = estadoControlador.opcionesActuales.find((opc) => (opc.candidato.id || opc.candidato.nombre) === idCandidato);
      if (!itemElegido) return;

      estadoControlador.opcionSeleccionada = itemElegido;

      // Actualizar atributos aria-checked y tabindex en todas las tarjetas
      elContenedorReemplazos.querySelectorAll('.reemplazo').forEach((btn) => {
        const esActivo = (btn === tarjetaBtn);
        btn.setAttribute('aria-checked', esActivo ? 'true' : 'false');
        btn.setAttribute('tabindex', esActivo ? '0' : '-1');
      });

      // Actualizar nota educativa y texto dinámico del botón de confirmación
      actualizarPieConfirmacion(itemElegido, mapaSelectores);
    };

    elContenedorReemplazos.addEventListener('click', (evento) => {
      const tarjetaBtn = evento.target.closest('.reemplazo');
      seleccionarTarjeta(tarjetaBtn);
    });

    elContenedorReemplazos.addEventListener('keydown', (evento) => {
      const botones = Array.from(elContenedorReemplazos.querySelectorAll('.reemplazo'));
      if (botones.length === 0) return;

      const actualIdx = botones.indexOf(document.activeElement);
      let siguienteIdx = -1;

      if (evento.key === 'ArrowDown' || evento.key === 'ArrowRight') {
        evento.preventDefault();
        siguienteIdx = actualIdx < 0 ? 0 : (actualIdx + 1) % botones.length;
      } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowLeft') {
        evento.preventDefault();
        siguienteIdx = actualIdx < 0 ? botones.length - 1 : (actualIdx - 1 + botones.length) % botones.length;
      }

      if (siguienteIdx >= 0) {
        const targetBtn = botones[siguienteIdx];
        targetBtn.focus();
        seleccionarTarjeta(targetBtn);
      }
    });
  }

  // 4. Acción de confirmación (botón Reemplazar / Cambiar igual)
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', (evento) => {
      if (!estadoControlador.opcionSeleccionada) {
        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();
        mostrarAvisoFlotante('Buscá y seleccioná un alimento para reemplazar.');
        return;
      }

      // Guardar retroalimentación accesible en sessionStorage
      guardarAvisoToast('Alimento reemplazado');

      try {
        const registro = {
          objetivo: estadoControlador.alimentoObjetivo,
          reemplazo: {
            id: estadoControlador.opcionSeleccionada.candidato.id,
            nombre: estadoControlador.opcionSeleccionada.candidato.nombre,
            cantidad: estadoControlador.opcionSeleccionada.calculo.textoCantidad,
            gramos: estadoControlador.opcionSeleccionada.calculo.gramos,
            unidades: estadoControlador.opcionSeleccionada.calculo.unidades,
            nivel: estadoControlador.opcionSeleccionada.calculo.nivel,
            adherencia: estadoControlador.opcionSeleccionada.calculo.adherencia,
            aportes: estadoControlador.opcionSeleccionada.calculo.aportes
          },
          fecha: new Date().toISOString()
        };
        sessionStorage.setItem('alimento-reemplazado', JSON.stringify(registro));
      } catch {
        // Ignorar si sessionStorage no está disponible
      }

      // Si es un enlace nativo a dashboard.html, la navegación procede normalmente
      const href = btnConfirmar.getAttribute('href');
      if (!href || href.startsWith('#')) {
        evento.preventDefault();
        window.location.href = 'dashboard.html';
      }
    });
  }

  estadoControlador.iniciado = true;
}

// Inicialización automática al cargar el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => iniciarReemplazarUI());
  } else {
    iniciarReemplazarUI();
  }
}
