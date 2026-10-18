/* ==========================================================
   cantidad-ui.js — Controlador UI para la pantalla de Cantidad (cantidad.html)
   - Adapta dinámicamente títulos, botón Quitar y destino de Guardar según
     el origen de navegación (desde agregar.html o desde dashboard.html).
   - Recalcula de manera reactiva en tiempo real las calorías y macronutrientes
     aportados por los gramos ingresados en el input.
   - Gestiona la persistencia de alimentos en sessionStorage ('comidas-diarias-alumno').
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para cantidad.html.
 */
export const SELECTORES = {
  inputCantidad: '.input--cantidad input',
  aporteValor: '.aporte__valor',
  btnGuardar: '.pie .btn--primario',
  btnQuitar: '.pie .btn--peligro-texto',
  btnVolver: 'a[aria-label^="Volver"]',
  valores100: '#valores-100',
  antetitulo: '.encabezado__textos .antetitulo--verde',
  titulo: '.encabezado__textos .titulo',
  pie: '.pantalla > .pie, .pie'
};

/**
 * Adapta los botones, referencias por 100g y datos de cantidad.html según
 * si el usuario llega desde agregar.html o desde dashboard.html.
 */
export function adaptarCantidadContextual() {
  const ruta = window.location.pathname;
  const esPaginaCantidad = ruta.endsWith('cantidad.html') || ruta.includes('/cantidad.html') || !!document.querySelector(SELECTORES.inputCantidad);
  if (!esPaginaCantidad) return;

  const pie = document.querySelector(SELECTORES.pie);
  if (!pie) return;

  const btnQuitar = pie.querySelector(SELECTORES.btnQuitar);
  const btnGuardar = pie.querySelector(SELECTORES.btnGuardar);
  const btnVolver = document.querySelector(SELECTORES.btnVolver);

  const params = new URLSearchParams(window.location.search);
  const comida = params.get('comida');
  const alimento = params.get('alimento');
  const kcal = params.get('kcal');
  const p = params.get('p');
  const c = params.get('c');
  const g = params.get('g');
  const cantidad = params.get('cantidad');
  const gramos = params.get('gramos');

  // Adaptar contexto de comida y alimento si vienen por parámetro
  if (comida) {
    const antetitulo = document.querySelector(SELECTORES.antetitulo);
    if (antetitulo) antetitulo.textContent = comida;
  }
  if (alimento) {
    const titulo = document.querySelector(SELECTORES.titulo);
    if (titulo) titulo.textContent = alimento;
  }

  // Extraer gramos base
  let baseGramos = 100;
  if (gramos) {
    baseGramos = parseFloat(gramos) || 100;
  } else if (cantidad) {
    const matchG = cantidad.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
    if (matchG) {
      baseGramos = parseFloat(matchG[1].replace(',', '.')) || 100;
    } else {
      const matchNum = cantidad.match(/\d+(?:[.,]\d+)?/);
      if (matchNum) baseGramos = parseFloat(matchNum[0].replace(',', '.')) || 100;
    }
  }

  const inputCantidad = document.querySelector(SELECTORES.inputCantidad);
  if (inputCantidad) {
    inputCantidad.value = String(baseGramos);
  }

  const baseKcal = kcal ? (Number(kcal) || 0) : 0;
  const baseP = p ? (Number(p) || 0) : 0;
  const baseC = c ? (Number(c) || 0) : 0;
  const baseG = g ? (Number(g) || 0) : 0;

  const factor100 = baseGramos > 0 ? (100 / baseGramos) : 1;
  const kcal100 = baseKcal * factor100;
  const p100 = baseP * factor100;
  const c100 = baseC * factor100;
  const g100 = baseG * factor100;

  function recalcularAportes(cantGramos) {
    const gActual = Math.max(0, cantGramos);
    const f = gActual / 100;
    const kAct = Math.round(kcal100 * f);
    const pAct = Math.round(p100 * f);
    const cAct = Math.round(c100 * f);
    const gAct = Math.round(g100 * f);

    const celdas = document.querySelectorAll(SELECTORES.aporteValor);
    if (celdas.length >= 4) {
      celdas[0].textContent = String(kAct);
      celdas[1].textContent = `${pAct} g`;
      celdas[2].textContent = `${cAct} g`;
      celdas[3].textContent = `${gAct} g`;
    }
  }

  if (kcal || p || c || g) {
    recalcularAportes(baseGramos);

    const valores100 = document.querySelector(SELECTORES.valores100);
    if (valores100) {
      valores100.textContent = `Cada 100 g: ${Math.round(kcal100)} kcal · P ${Math.round(p100)} · C ${Math.round(c100)} · G ${Math.round(g100)}`;
    }
  }

  if (inputCantidad && !inputCantidad.dataset.listenerCantidad) {
    inputCantidad.dataset.listenerCantidad = 'true';
    inputCantidad.addEventListener('input', () => {
      const val = parseFloat(inputCantidad.value.replace(',', '.')) || 0;
      recalcularAportes(val);
    });
  }

  let origen = params.get('origen');
  if (!origen && document.referrer) {
    try {
      const refUrl = new URL(document.referrer, window.location.href);
      if (refUrl.pathname.includes('agregar.html') || refUrl.pathname.includes('crear-alimento.html')) {
        origen = 'agregar';
      } else if (refUrl.pathname.includes('dashboard.html')) {
        origen = 'dashboard';
      }
    } catch {
      if (document.referrer.includes('agregar.html') || document.referrer.includes('crear-alimento.html')) origen = 'agregar';
      else if (document.referrer.includes('dashboard.html')) origen = 'dashboard';
    }
  }
  if (!origen) {
    try {
      origen = sessionStorage.getItem('origen-cantidad');
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
  }

  const destinoAgregar = comida ? `agregar.html?comida=${encodeURIComponent(comida)}` : 'agregar.html';

  if (origen === 'agregar') {
    if (btnQuitar) {
      btnQuitar.hidden = true;
    }
    if (btnGuardar) {
      btnGuardar.textContent = 'Agregar a la comida';
      btnGuardar.setAttribute('href', destinoAgregar);
      btnGuardar.dataset.toast = 'Alimento agregado a la comida';
    }
    if (btnVolver) {
      btnVolver.setAttribute('href', destinoAgregar);
    }
  } else {
    if (btnQuitar) {
      btnQuitar.hidden = false;
      btnQuitar.setAttribute('href', 'dashboard.html');
      btnQuitar.dataset.toast = 'Alimento quitado de la comida';
    }
    if (btnGuardar) {
      btnGuardar.textContent = 'Guardar';
      btnGuardar.setAttribute('href', 'dashboard.html');
      btnGuardar.dataset.toast = 'Cantidad guardada';
    }
    if (btnVolver) {
      btnVolver.setAttribute('href', 'dashboard.html');
    }
  }
}

/**
 * Inicializa el controlador de la pantalla de cantidad.
 */
export function iniciarCantidad() {
  adaptarCantidadContextual();

  // Limpiar tracking de origen al pulsar Volver o botones de acción
  document.addEventListener('click', (evento) => {
    const esAccionSalidaCantidad = evento.target.closest(`${SELECTORES.pie} .btn, ${SELECTORES.btnVolver}`);
    if (esAccionSalidaCantidad) {
      try {
        sessionStorage.removeItem('origen-cantidad');
      } catch {
        // Ignorar
      }
    }

    const esBtnQuitar = evento.target.closest(SELECTORES.btnQuitar);
    if (esBtnQuitar) {
      try {
        const params = new URLSearchParams(window.location.search);
        const comida = params.get('comida') || document.querySelector(SELECTORES.antetitulo)?.textContent?.trim();
        const alimento = params.get('alimento') || document.querySelector(SELECTORES.titulo)?.textContent?.trim();
        if (comida && alimento) {
          const raw = sessionStorage.getItem('comidas-diarias-alumno');
          if (raw) {
            const guardadas = JSON.parse(raw);
            if (guardadas[comida]) {
              guardadas[comida] = guardadas[comida].filter((it) => it.nombre.toLowerCase() !== alimento.toLowerCase());
              sessionStorage.setItem('comidas-diarias-alumno', JSON.stringify(guardadas));
            }
          }
        }
      } catch {
        // Ignorar
      }
    }

    const esBtnGuardarCantidad = evento.target.closest(SELECTORES.btnGuardar);
    if (esBtnGuardarCantidad) {
      try {
        const params = new URLSearchParams(window.location.search);
        const comida = params.get('comida') || document.querySelector(SELECTORES.antetitulo)?.textContent?.trim();
        const alimento = params.get('alimento') || document.querySelector(SELECTORES.titulo)?.textContent?.trim();
        const inputCant = document.querySelector(SELECTORES.inputCantidad);
        const celdas = document.querySelectorAll(SELECTORES.aporteValor);

        if (comida && alimento) {
          const raw = sessionStorage.getItem('comidas-diarias-alumno');
          const guardadas = raw ? JSON.parse(raw) : { Desayuno: [], Almuerzo: [], Merienda: [], Cena: [] };
          if (!guardadas[comida]) guardadas[comida] = [];

          const cantVal = parseFloat(inputCant?.value?.replace(',', '.')) || (Number(params.get('gramos')) || 100);
          const kcalVal = celdas[0] ? parseInt(celdas[0].textContent.replace(/\D/g, ''), 10) || 0 : (Number(params.get('kcal')) || 0);
          const pVal = celdas[1] ? parseInt(celdas[1].textContent.replace(/\D/g, ''), 10) || 0 : (Number(params.get('p')) || 0);
          const cVal = celdas[2] ? parseInt(celdas[2].textContent.replace(/\D/g, ''), 10) || 0 : (Number(params.get('c')) || 0);
          const gVal = celdas[3] ? parseInt(celdas[3].textContent.replace(/\D/g, ''), 10) || 0 : (Number(params.get('g')) || 0);
          const textoCant = `${cantVal} g`;

          const item = {
            nombre: alimento,
            linea: `${kcalVal} kcal · P ${pVal} · C ${cVal} · G ${gVal}`,
            cantidad: textoCant,
            kcal: kcalVal,
            p: pVal,
            c: cVal,
            g: gVal,
            gramos: cantVal
          };

          const idx = guardadas[comida].findIndex((it) => it.nombre.toLowerCase().trim() === alimento.toLowerCase().trim());
          if (idx >= 0) {
            guardadas[comida][idx] = item;
          } else {
            guardadas[comida].push(item);
          }
          sessionStorage.setItem('comidas-diarias-alumno', JSON.stringify(guardadas));
        }
      } catch {
        // Ignorar
      }
    }
  });

  // Re-evaluar si se vuelve mediante bfcache
  window.addEventListener('pageshow', () => {
    adaptarCantidadContextual();
  });
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarCantidad);
} else {
  iniciarCantidad();
}
