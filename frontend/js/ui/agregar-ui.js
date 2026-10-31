/* ==========================================================
   agregar-ui.js — Controlador UI para la pantalla Agregar Alimento (agregar.html)
   - Adapta dinámicamente los alimentos sugeridos del plan y títulos según
     la comida seleccionada (Desayuno, Almuerzo, Merienda o Cena).
   - Administra la selección interactiva de alimentos (aria-pressed en botones btn-agregar).
   - Recalcula en tiempo real el total de alimentos y calorías acumuladas en el pie.
   - Sincroniza el registro de ingesta con sessionStorage ('comidas-diarias-alumno').
   - Búsqueda en tiempo real con debounce: filtra alimentos locales y consulta
     la base de datos remota vía buscarAlimentos cuando no hay coincidencias locales.
   - Desacople total mediante el mapa centralizado SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { ALIMENTOS_PLAN_DEFECTO } from '../data/plan-defecto.js';
import { buscarAlimentos } from '../data/alimentos-api.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para agregar.html.
 */
export const SELECTORES = {
  encabezado: '.encabezado',
  antetituloVerde: '.encabezado__textos .antetitulo--verde',
  titulo: '.encabezado__textos .titulo',
  buscador: 'input[name="buscar"]',
  seccionPlan: '[aria-labelledby="t-plan"]',
  seccionRecientes: '[aria-labelledby="t-recientes"]',
  seccionBusqueda: '#seccion-busqueda',
  listaBusqueda: '#lista-busqueda',
  busquedaSinResultados: '#busqueda-sin-resultados',
  tplAlimentoBusqueda: '#tpl-alimento-busqueda',
  filas: '.alimento-fila',
  filaTitulo: '.alimento-fila__titulo',
  filaLinea: '.alimento-fila__linea',
  filaCantidad: '.alimento-fila__cantidad',
  filaEnlace: 'a.alimento-fila__nombre',
  btnAgregar: 'button.btn-agregar',
  pieResumen: '.pantalla > .pie .crece.sub, .pie .crece.sub',
  pieBotonListo: '.pie .btn--primario'
};

let debounceTimer = null;
let searchIdActual = 0;
let inicializado = false;

/**
 * Recalcula y actualiza el contador de alimentos y calorías totales en el pie.
 */
export function actualizarResumenPieAgregar() {
  const pieResumen = document.querySelector(SELECTORES.pieResumen);
  if (!pieResumen) return;

  const botonesPresionados = document.querySelectorAll(`${SELECTORES.btnAgregar}[aria-pressed="true"]`);
  let totalKcal = 0;

  botonesPresionados.forEach((btn) => {
    const fila = btn.closest(SELECTORES.filas);
    if (!fila) return;
    const kcalAttr = Number(fila.dataset.kcal);
    if (!Number.isNaN(kcalAttr) && kcalAttr > 0) {
      totalKcal += kcalAttr;
    } else {
      const matchKcal = fila.querySelector(SELECTORES.filaLinea)?.textContent?.match(/(\d+[\d.]*)\s*kcal/i);
      if (matchKcal) {
        totalKcal += parseInt(matchKcal[1].replace(/\./g, ''), 10);
      }
    }
  });

  const total = botonesPresionados.length;
  const textoAlimentos = `${total} ${total === 1 ? 'alimento' : 'alimentos'}`;
  const textoKcal = `${totalKcal.toLocaleString('es-AR')} kcal`;

  pieResumen.textContent = `${textoAlimentos} · `;
  const spanKcal = document.createElement('span');
  spanKcal.className = 'negrita';
  spanKcal.textContent = textoKcal;
  pieResumen.appendChild(spanKcal);
}

/**
 * Adapta el subtítulo/antetítulo y el alimento del plan en agregar.html según la comida pasada por parámetro.
 */
export function adaptarAgregarContextual() {
  const ruta = window.location.pathname;
  const esPaginaAgregar = ruta.endsWith('agregar.html') || ruta.includes('/agregar.html') || !!document.querySelector(SELECTORES.btnAgregar);
  if (!esPaginaAgregar) return;

  const params = new URLSearchParams(window.location.search);
  const comida = params.get('comida');
  if (comida) {
    const antetitulo = document.querySelector(SELECTORES.antetituloVerde);
    if (antetitulo) {
      antetitulo.textContent = comida;
    }

    const info = ALIMENTOS_PLAN_DEFECTO[comida];
    if (info) {
      const seccionPlan = document.querySelector(SELECTORES.seccionPlan);
      const filaPlan = seccionPlan?.querySelector(SELECTORES.filas);
      if (filaPlan) {
        filaPlan.dataset.kcal = String(info.kcal);
        filaPlan.dataset.p = String(info.p);
        filaPlan.dataset.c = String(info.c);
        filaPlan.dataset.g = String(info.g);
        filaPlan.dataset.gramos = String(info.gramos || 100);

        const titEl = filaPlan.querySelector(SELECTORES.filaTitulo);
        if (titEl) titEl.textContent = info.titulo;
        const linEl = filaPlan.querySelector(SELECTORES.filaLinea);
        if (linEl) linEl.textContent = info.linea;
        const cantEl = filaPlan.querySelector(SELECTORES.filaCantidad);
        if (cantEl) cantEl.textContent = info.cantidad;

        const enlaceCant = filaPlan.querySelector(SELECTORES.filaEnlace);
        if (enlaceCant) {
          enlaceCant.setAttribute(
            'href',
            `cantidad.html?origen=agregar&comida=${encodeURIComponent(comida)}&alimento=${encodeURIComponent(info.titulo)}&kcal=${info.kcal}&p=${info.p}&c=${info.c}&g=${info.g}&cantidad=${encodeURIComponent(info.cantidad)}&gramos=${info.gramos || 100}`
          );
        }
      }
    }

    // Sincronizar estado inicial de botones btn-agregar con sessionStorage si ya hay alimentos registrados
    try {
      const rawComidas = sessionStorage.getItem('comidas-diarias-alumno');
      if (rawComidas) {
        const comidasData = JSON.parse(rawComidas);
        const guardados = comidasData[comida] || [];
        const nombresGuardados = new Set(guardados.map((a) => a.nombre.toLowerCase().trim()));

        document.querySelectorAll(SELECTORES.filas).forEach((fila) => {
          const tit = fila.querySelector(SELECTORES.filaTitulo)?.textContent?.toLowerCase()?.trim();
          const btn = fila.querySelector(SELECTORES.btnAgregar);
          if (tit && btn && nombresGuardados.has(tit)) {
            btn.setAttribute('aria-pressed', 'true');
          }
        });
      }
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }

  actualizarResumenPieAgregar();
}

/**
 * Maneja la interacción al presionar el botón de agregar/quitar alimento en una fila.
 * @param {HTMLButtonElement} btnAgregar
 */
function manejarToggleAgregar(btnAgregar) {
  const presionado = btnAgregar.getAttribute('aria-pressed') === 'true';
  const nuevoEstado = !presionado;
  btnAgregar.setAttribute('aria-pressed', String(nuevoEstado));
  const fila = btnAgregar.closest(SELECTORES.filas);
  const nombreAlimento = fila?.querySelector(SELECTORES.filaTitulo)?.textContent?.trim() || 'Alimento';

  mostrarAvisoFlotante(nuevoEstado ? `"${nombreAlimento}" agregado a la comida.` : `"${nombreAlimento}" quitado de la comida.`);
  actualizarResumenPieAgregar();

  // Sincronizar persistencia con sessionStorage
  try {
    const params = new URLSearchParams(window.location.search);
    const comida = params.get('comida') || document.querySelector(SELECTORES.antetituloVerde)?.textContent?.trim();
    if (comida && fila) {
      const raw = sessionStorage.getItem('comidas-diarias-alumno');
      const guardadas = raw ? JSON.parse(raw) : { Desayuno: [], Almuerzo: [], Merienda: [], Cena: [] };
      if (!guardadas[comida]) guardadas[comida] = [];

      if (nuevoEstado) {
        const kcalAttr = Number(fila.dataset.kcal);
        const pAttr = Number(fila.dataset.p);
        const cAttr = Number(fila.dataset.c);
        const gAttr = Number(fila.dataset.g);
        const linea = fila.querySelector(SELECTORES.filaLinea)?.textContent?.trim() || '';
        const cantidad = fila.querySelector(SELECTORES.filaCantidad)?.textContent?.trim() || '1 porción';

        let kcal = !Number.isNaN(kcalAttr) && kcalAttr >= 0 ? kcalAttr : 0;
        let p = !Number.isNaN(pAttr) && pAttr >= 0 ? pAttr : 0;
        let c = !Number.isNaN(cAttr) && cAttr >= 0 ? cAttr : 0;
        let g = !Number.isNaN(gAttr) && gAttr >= 0 ? gAttr : 0;

        if (kcal === 0 && linea) {
          const mK = linea.match(/(\d+[\d.]*)\s*kcal/i);
          if (mK) kcal = parseInt(mK[1].replace(/\./g, ''), 10);
        }
        if (p === 0 && linea) {
          const mP = linea.match(/P\s*(\d+)/i);
          if (mP) p = parseInt(mP[1], 10);
        }
        if (c === 0 && linea) {
          const mC = linea.match(/C\s*(\d+)/i);
          if (mC) c = parseInt(mC[1], 10);
        }
        if (g === 0 && linea) {
          const mG = linea.match(/G\s*(\d+)/i);
          if (mG) g = parseInt(mG[1], 10);
        }

        const matchG = cantidad.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
        const gramos = matchG ? parseFloat(matchG[1].replace(',', '.')) : (Number(fila.dataset.gramos) || 100);

        const existe = guardadas[comida].some((it) => it.nombre.toLowerCase().trim() === nombreAlimento.toLowerCase().trim());
        if (!existe) {
          guardadas[comida].push({
            nombre: nombreAlimento,
            linea: linea || `${kcal} kcal · P ${p} · C ${c} · G ${g}`,
            cantidad,
            kcal,
            p,
            c,
            g,
            gramos
          });
        }
      } else {
        guardadas[comida] = guardadas[comida].filter((it) => it.nombre.toLowerCase().trim() !== nombreAlimento.toLowerCase().trim());
      }

      sessionStorage.setItem('comidas-diarias-alumno', JSON.stringify(guardadas));
    }
  } catch {
    // Ignorar si sessionStorage no está disponible
  }
}

/**
 * Renderiza los alimentos encontrados vía búsqueda remota en listaBusqueda utilizando tplAlimentoBusqueda.
 * @param {Array<Object>} alimentos
 */
export function renderizarResultadosBusqueda(alimentos) {
  const seccionBusqueda = document.querySelector(SELECTORES.seccionBusqueda);
  const listaBusqueda = document.querySelector(SELECTORES.listaBusqueda);
  const sinResultados = document.querySelector(SELECTORES.busquedaSinResultados);
  const tpl = document.querySelector(SELECTORES.tplAlimentoBusqueda);

  if (!listaBusqueda) return;
  listaBusqueda.replaceChildren();

  if (!alimentos || alimentos.length === 0) {
    if (seccionBusqueda) seccionBusqueda.hidden = false;
    if (sinResultados) sinResultados.hidden = false;
    return;
  }

  if (sinResultados) sinResultados.hidden = true;
  if (seccionBusqueda) seccionBusqueda.hidden = false;

  const params = new URLSearchParams(window.location.search);
  const comida = params.get('comida') || document.querySelector(SELECTORES.antetituloVerde)?.textContent?.trim() || '';

  let nombresGuardados = new Set();
  try {
    const rawComidas = sessionStorage.getItem('comidas-diarias-alumno');
    if (rawComidas && comida) {
      const comidasData = JSON.parse(rawComidas);
      const guardados = comidasData[comida] || [];
      nombresGuardados = new Set(guardados.map((a) => a.nombre.toLowerCase().trim()));
    }
  } catch {
    // Ignorar si sessionStorage no está disponible
  }

  const fragmento = document.createDocumentFragment();

  alimentos.forEach((item) => {
    let fila;
    if (tpl && tpl.content) {
      const clon = tpl.content.cloneNode(true);
      fila = clon.querySelector('.alimento-fila') || clon.firstElementChild;
    } else {
      fila = document.createElement('li');
      fila.className = 'alimento-fila';

      const enlace = document.createElement('a');
      enlace.className = 'alimento-fila__nombre';
      enlace.href = 'cantidad.html';

      const spTit = document.createElement('span');
      spTit.className = 'alimento-fila__titulo';
      spTit.dataset.ref = 'nombre';

      const spLin = document.createElement('span');
      spLin.className = 'alimento-fila__linea';
      spLin.dataset.ref = 'macros';

      enlace.append(spTit, spLin);

      const spCant = document.createElement('span');
      spCant.className = 'alimento-fila__cantidad';
      spCant.dataset.ref = 'porciones';

      const btn = document.createElement('button');
      btn.className = 'btn-agregar';
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Agregar');

      fila.append(enlace, spCant, btn);
    }

    const kcal = Number(item.kcal) || 0;
    const p = Number(item.proteinas ?? item.p ?? 0);
    const c = Number(item.carbohidratos ?? item.c ?? 0);
    const g = Number(item.grasas ?? item.g ?? 0);
    const porcionTexto = item.porcion_desc || (item.porcion_g ? `${item.porcion_g} g` : '1 porción (100 g)');
    const gramos = item.porcion_g != null ? Number(item.porcion_g) : (Number(item.gramos) || 100);

    fila.dataset.kcal = String(kcal);
    fila.dataset.p = String(p);
    fila.dataset.c = String(c);
    fila.dataset.g = String(g);
    fila.dataset.gramos = String(gramos);
    if (item.id) {
      fila.dataset.id = String(item.id);
    }

    const titEl = fila.querySelector('[data-ref="nombre"]') || fila.querySelector(SELECTORES.filaTitulo);
    if (titEl) titEl.textContent = item.nombre;

    const macrosTexto = `${kcal} kcal · P ${p} · C ${c} · G ${g}`;
    const linEl = fila.querySelector('[data-ref="macros"]') || fila.querySelector(SELECTORES.filaLinea);
    if (linEl) linEl.textContent = macrosTexto;

    const cantEl = fila.querySelector('[data-ref="porciones"]') || fila.querySelector(SELECTORES.filaCantidad);
    if (cantEl) cantEl.textContent = porcionTexto;

    const enlaceCant = fila.querySelector(SELECTORES.filaEnlace) || fila.querySelector('a.alimento-fila__nombre');
    if (enlaceCant) {
      enlaceCant.setAttribute(
        'href',
        `cantidad.html?origen=agregar&comida=${encodeURIComponent(comida)}&alimento=${encodeURIComponent(item.nombre)}&kcal=${kcal}&p=${p}&c=${c}&g=${g}&cantidad=${encodeURIComponent(porcionTexto)}&gramos=${gramos}`
      );
      enlaceCant.setAttribute('aria-label', `Elegir la cantidad de ${item.nombre}`);
    }

    const btn = fila.querySelector(SELECTORES.btnAgregar);
    if (btn) {
      const estaGuardado = nombresGuardados.has(item.nombre.toLowerCase().trim());
      btn.setAttribute('aria-pressed', estaGuardado ? 'true' : 'false');
      btn.setAttribute('aria-label', `Agregar ${item.nombre}`);
    }

    fragmento.appendChild(fila);
  });

  listaBusqueda.appendChild(fragmento);
}

/**
 * Filtra las filas locales existentes y, ante falta de coincidencias y longitud >= 2,
 * consulta la base de datos remota vía buscarAlimentos.
 * @param {string} termino
 */
export async function filtrarYBuscarAlimentos(termino) {
  const seccionPlan = document.querySelector(SELECTORES.seccionPlan);
  const seccionRecientes = document.querySelector(SELECTORES.seccionRecientes);
  const seccionBusqueda = document.querySelector(SELECTORES.seccionBusqueda);
  const listaBusqueda = document.querySelector(SELECTORES.listaBusqueda);
  const sinResultados = document.querySelector(SELECTORES.busquedaSinResultados);

  const filasLocales = document.querySelectorAll(
    `${SELECTORES.seccionPlan} ${SELECTORES.filas}, ${SELECTORES.seccionRecientes} ${SELECTORES.filas}`
  );

  // Si el campo se vacía, volver a mostrar todas las filas y ocultar resultados remotos
  if (!termino) {
    filasLocales.forEach((fila) => {
      fila.hidden = false;
      fila.style.display = '';
    });
    if (seccionPlan) seccionPlan.hidden = false;
    if (seccionRecientes) seccionRecientes.hidden = false;
    if (seccionBusqueda) seccionBusqueda.hidden = true;
    if (sinResultados) sinResultados.hidden = true;
    if (listaBusqueda) listaBusqueda.replaceChildren();
    return;
  }

  // Si el texto tiene caracteres, filtrar filas locales existentes
  let coincidenciasPlan = 0;
  let coincidenciasRecientes = 0;

  filasLocales.forEach((fila) => {
    const textoTitulo = fila.querySelector(SELECTORES.filaTitulo)?.textContent?.toLowerCase() || '';
    const textoLinea = fila.querySelector(SELECTORES.filaLinea)?.textContent?.toLowerCase() || '';
    const coincide = textoTitulo.includes(termino) || textoLinea.includes(termino);

    fila.hidden = !coincide;
    fila.style.display = '';

    if (coincide) {
      if (seccionPlan && seccionPlan.contains(fila)) {
        coincidenciasPlan++;
      }
      if (seccionRecientes && seccionRecientes.contains(fila)) {
        coincidenciasRecientes++;
      }
    }
  });

  const totalCoincidenciasLocales = coincidenciasPlan + coincidenciasRecientes;

  if (seccionPlan) {
    seccionPlan.hidden = coincidenciasPlan === 0;
  }
  if (seccionRecientes) {
    seccionRecientes.hidden = coincidenciasRecientes === 0;
  }

  // Si hay coincidencias locales, ocultar contenedor remoto y sin resultados
  if (totalCoincidenciasLocales > 0) {
    if (seccionBusqueda) seccionBusqueda.hidden = true;
    if (sinResultados) sinResultados.hidden = true;
    if (listaBusqueda) listaBusqueda.replaceChildren();
    return;
  }

  // Si no hay coincidencias locales y la búsqueda tiene menos de 2 caracteres, no invocar RPC
  if (termino.length < 2) {
    if (seccionBusqueda) seccionBusqueda.hidden = true;
    if (sinResultados) sinResultados.hidden = true;
    if (listaBusqueda) listaBusqueda.replaceChildren();
    return;
  }

  // Si no hay coincidencias locales y la búsqueda tiene >= 2 caracteres, invocar buscarAlimentos(texto)
  const idBusqueda = ++searchIdActual;
  try {
    const resultados = await buscarAlimentos(termino);
    if (idBusqueda !== searchIdActual) return;
    renderizarResultadosBusqueda(resultados);
  } catch (err) {
    console.warn('Error al buscar alimentos en base remota:', err);
    if (idBusqueda !== searchIdActual) return;
    renderizarResultadosBusqueda([]);
  }
}

/**
 * Inicializa el controlador de la pantalla Agregar Alimento.
 */
export function iniciarAgregar() {
  adaptarAgregarContextual();

  if (inicializado) return;
  inicializado = true;

  // Escuchar clics en botones de agregar delegados
  document.addEventListener('click', (evento) => {
    const btn = evento.target.closest(SELECTORES.btnAgregar);
    if (btn) {
      manejarToggleAgregar(btn);
    }
  });

  // Filtrado reactivo en el buscador de alimentos con debounce (~300ms)
  const inputBuscador = document.querySelector(SELECTORES.buscador);
  if (inputBuscador) {
    inputBuscador.addEventListener('input', () => {
      const termino = inputBuscador.value.trim().toLowerCase();
      clearTimeout(debounceTimer);

      if (!termino) {
        filtrarYBuscarAlimentos('');
        return;
      }

      debounceTimer = setTimeout(() => {
        filtrarYBuscarAlimentos(termino);
      }, 300);
    });
  }

  // Refrescar al volver desde otra pantalla vía bfcache
  window.addEventListener('pageshow', () => {
    adaptarAgregarContextual();
  });
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAgregar);
} else {
  iniciarAgregar();
}
