/* ==========================================================
   agregar-ui.js — Controlador UI para la pantalla Agregar Alimento (agregar.html)
   - Adapta dinámicamente los alimentos sugeridos del plan y títulos según
     la comida seleccionada (Desayuno, Almuerzo, Merienda o Cena).
   - Administra la selección interactiva de alimentos (aria-pressed en botones btn-agregar).
   - Recalcula en tiempo real el total de alimentos y calorías acumuladas en el pie.
   - Sincroniza el registro de ingesta con sessionStorage ('comidas-diarias-alumno').
   - Desacople total mediante el mapa centralizado SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { ALIMENTOS_PLAN_DEFECTO } from '../data/plan-defecto.js';
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
  filas: '.alimento-fila',
  filaTitulo: '.alimento-fila__titulo',
  filaLinea: '.alimento-fila__linea',
  filaCantidad: '.alimento-fila__cantidad',
  filaEnlace: 'a.alimento-fila__nombre',
  btnAgregar: 'button.btn-agregar',
  pieResumen: '.pantalla > .pie .crece.sub, .pie .crece.sub',
  pieBotonListo: '.pie .btn--primario'
};

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
  pieResumen.innerHTML = `${textoAlimentos} · <span class="negrita">${textoKcal}</span>`;
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
 * Inicializa el controlador de la pantalla Agregar Alimento.
 */
export function iniciarAgregar() {
  adaptarAgregarContextual();

  // Escuchar clics en botones de agregar delegados
  document.addEventListener('click', (evento) => {
    const btn = evento.target.closest(SELECTORES.btnAgregar);
    if (btn) {
      manejarToggleAgregar(btn);
    }
  });

  // Filtrado reactivo en el buscador de alimentos
  const inputBuscador = document.querySelector(SELECTORES.buscador);
  if (inputBuscador) {
    inputBuscador.addEventListener('input', () => {
      const termino = inputBuscador.value.trim().toLowerCase();
      const filas = document.querySelectorAll(SELECTORES.filas);
      filas.forEach((fila) => {
        const textoTitulo = fila.querySelector(SELECTORES.filaTitulo)?.textContent?.toLowerCase() || '';
        const textoLinea = fila.querySelector(SELECTORES.filaLinea)?.textContent?.toLowerCase() || '';
        const coincide = !termino || textoTitulo.includes(termino) || textoLinea.includes(termino);
        fila.style.display = coincide ? '' : 'none';
      });
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
