/* ==========================================================
   navegacion.js — utilidades de navegación y retorno inteligente
   - Estandariza botones "Volver" y "Cerrar" usando window.history.back()
     cuando existe navegación interna previa, manteniendo el href como fallback.
     Nunca intercepta enlaces de anclaje/modal interno (#).
   - Retroalimentación accesible (aviso flotante / toast) para botones
     pendientes (barra inferior, plantillas, colaciones, etc.).
   - Micro-interacciones accesibles para chips, pestañas, opciones,
     botones segmentados, interruptores (switch) y selectores de alimentos.
   ========================================================== */

import { normalizarDecimal } from '../calc/formato-calc.js';

let temporizadorToast = null;

/**
 * Muestra un aviso flotante accesible estilo toast.
 * @param {string} mensaje Texto a comunicar al usuario.
 * @param {number} duracion Milisegundos visibles antes de ocultarse.
 */
export function mostrarAvisoFlotante(mensaje, duracion = 3000) {
  let toast = document.querySelector('.aviso-flotante--toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'aviso-flotante aviso-flotante--toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    const contenedor = document.querySelector('.pantalla') || document.body;
    contenedor.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.hidden = false;

  if (temporizadorToast) clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toast.hidden = true;
  }, duracion);
}

/**
 * Guarda un aviso flotante en sessionStorage para mostrarlo al cargar la siguiente pantalla.
 * @param {string} mensaje Texto a comunicar al usuario.
 */
export function guardarAvisoToast(mensaje) {
  try {
    sessionStorage.setItem('aviso-toast', mensaje);
  } catch {
    // Si sessionStorage no está disponible o falla, ignorar
  }
}

/**
 * Muestra y consume cualquier aviso toast pendiente en sessionStorage.
 */
function procesarAvisoToastPendiente() {
  try {
    const avisoPendiente = sessionStorage.getItem('aviso-toast');
    if (avisoPendiente) {
      sessionStorage.removeItem('aviso-toast');
      mostrarAvisoFlotante(avisoPendiente);
    }
  } catch {
    // Ignorar si sessionStorage no está disponible
  }
}

/**
 * Adapta los botones y datos de cantidad.html según si el usuario llega desde agregar.html
 * o desde dashboard.html.
 */
function adaptarCantidadContextual() {
  const ruta = window.location.pathname;
  const esPaginaCantidad = ruta.endsWith('cantidad.html') || ruta.includes('/cantidad.html') || !!document.querySelector('.input--cantidad');
  if (!esPaginaCantidad) return;

  const pie = document.querySelector('.pantalla > .pie') || document.querySelector('.pie');
  if (!pie) return;

  const btnQuitar = pie.querySelector('.btn--peligro-texto');
  const btnGuardar = pie.querySelector('.btn--primario');
  const btnVolver = document.querySelector('a[aria-label^="Volver"]');

  const params = new URLSearchParams(window.location.search);
  const comida = params.get('comida');
  const alimento = params.get('alimento');
  const kcal = params.get('kcal');
  const p = params.get('p');
  const c = params.get('c');
  const g = params.get('g');
  const cantidad = params.get('cantidad');

  // Adaptar contexto de comida y alimento si vienen por parámetro
  if (comida) {
    const antetitulo = document.querySelector('.encabezado__textos .antetitulo--verde');
    if (antetitulo) antetitulo.textContent = comida;
  }
  if (alimento) {
    const titulo = document.querySelector('.encabezado__textos .titulo');
    if (titulo) titulo.textContent = alimento;
  }
  if (cantidad) {
    const inputCantidad = document.querySelector('.input--cantidad input');
    if (inputCantidad) {
      const matchNum = cantidad.match(/\d+/);
      if (matchNum) inputCantidad.value = matchNum[0];
    }
  }
  if (kcal || p || c || g) {
    const celdas = document.querySelectorAll('.aporte .aporte__celda .aporte__valor');
    if (celdas.length >= 4) {
      if (kcal) celdas[0].textContent = kcal;
      if (p) celdas[1].textContent = `${p} g`;
      if (c) celdas[2].textContent = `${c} g`;
      if (g) celdas[3].textContent = `${g} g`;
    }
    const valores100 = document.getElementById('valores-100');
    if (valores100 && kcal && p && c && g) {
      valores100.textContent = `Cada 100 g: ${kcal} kcal · P ${p} · C ${c} · G ${g}`;
    }
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
      // Ignorar
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

export const ALIMENTOS_PLAN_DEFECTO = {
  'Desayuno': {
    titulo: 'Avena con leche y fruta',
    linea: '464 kcal · P 31 · C 53 · G 14',
    cantidad: '1 porción (250 g)',
    kcal: 464,
    p: 31,
    c: 53,
    g: 14
  },
  'Almuerzo': {
    titulo: 'Pechuga de pollo con arroz',
    linea: '570 kcal · P 51 · C 50 · G 16',
    cantidad: '1 porción (350 g)',
    kcal: 570,
    p: 51,
    c: 50,
    g: 16
  },
  'Merienda': {
    titulo: 'Yogur griego con frutos secos',
    linea: '388 kcal · P 21 · C 38 · G 19',
    cantidad: '1 porción (200 g)',
    kcal: 388,
    p: 21,
    c: 38,
    g: 19
  },
  'Cena': {
    titulo: 'Lomo vacuno con batata',
    linea: '545 kcal · P 38 · C 52 · G 20',
    cantidad: '1 porción (300 g)',
    kcal: 545,
    p: 38,
    c: 52,
    g: 20
  }
};

/**
 * Calcula y actualiza el contador de alimentos y calorías en el pie de agregar.html.
 */
export function actualizarResumenPieAgregar() {
  const pieResumen = document.querySelector('.pantalla > .pie .crece.sub') || document.querySelector('.pie .crece.sub');
  if (!pieResumen) return;

  const botonesPresionados = document.querySelectorAll('button.btn-agregar[aria-pressed="true"]');
  let totalKcal = 0;
  botonesPresionados.forEach((btn) => {
    const fila = btn.closest('.alimento-fila');
    if (!fila) return;
    const kcalAttr = Number(fila.dataset.kcal);
    if (!Number.isNaN(kcalAttr) && kcalAttr > 0) {
      totalKcal += kcalAttr;
    } else {
      const matchKcal = fila.querySelector('.alimento-fila__linea')?.textContent?.match(/(\d+[\d.]*)\s*kcal/i);
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
function adaptarAgregarContextual() {
  const ruta = window.location.pathname;
  const esPaginaAgregar = ruta.endsWith('agregar.html') || ruta.includes('/agregar.html');
  if (!esPaginaAgregar) return;

  const params = new URLSearchParams(window.location.search);
  const comida = params.get('comida');
  if (comida) {
    const antetitulo = document.querySelector('.encabezado__textos .antetitulo--verde');
    if (antetitulo) {
      antetitulo.textContent = comida;
    }

    const info = ALIMENTOS_PLAN_DEFECTO[comida];
    if (info) {
      const seccionPlan = document.querySelector('[aria-labelledby="t-plan"]');
      const filaPlan = seccionPlan?.querySelector('.alimento-fila');
      if (filaPlan) {
        filaPlan.dataset.kcal = String(info.kcal);
        const titEl = filaPlan.querySelector('.alimento-fila__titulo');
        if (titEl) titEl.textContent = info.titulo;
        const linEl = filaPlan.querySelector('.alimento-fila__linea');
        if (linEl) linEl.textContent = info.linea;
        const cantEl = filaPlan.querySelector('.alimento-fila__cantidad');
        if (cantEl) cantEl.textContent = info.cantidad;

        const enlaceCant = filaPlan.querySelector('a.alimento-fila__nombre');
        if (enlaceCant) {
          enlaceCant.setAttribute(
            'href',
            `cantidad.html?origen=agregar&comida=${encodeURIComponent(comida)}&alimento=${encodeURIComponent(info.titulo)}&kcal=${info.kcal}&p=${info.p}&c=${info.c}&g=${info.g}&cantidad=${encodeURIComponent(info.cantidad)}`
          );
        }
      }
    }
  }

  actualizarResumenPieAgregar();
}

let navegacionIniciada = false;

/**
 * Inicializa los controladores globales de retorno inteligente, accesibilidad y retroalimentación.
 */
export function iniciarNavegacion() {
  // 0. Aviso toast inter-páginas pendiente en sessionStorage
  procesarAvisoToastPendiente();

  // 0.1 Adaptación contextual de botones en cantidad.html
  adaptarCantidadContextual();

  // 0.2 Adaptación contextual de comida en agregar.html
  adaptarAgregarContextual();

  if (navegacionIniciada) return;
  navegacionIniciada = true;

  // 1. Retorno inteligente en enlaces de Volver y Cerrar
  document.addEventListener('click', (evento) => {
    const enlaceVolver = evento.target.closest('a[aria-label^="Volver"], a[aria-label^="Cerrar"], a[data-volver]');
    if (!enlaceVolver) return;

    // Nunca interceptar enlaces de anclaje/modal interno (#)
    const href = enlaceVolver.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    if (window.history.length > 1 && document.referrer) {
      try {
        const refUrl = new URL(document.referrer, window.location.href);
        if (refUrl.origin === window.location.origin) {
          // Prevenir volver hacia pantallas secundarias/hijas que acaban de completarse
          // (ej. volver desde agregar.html no debe reabrir cantidad.html; volver desde cantidad.html no debe reabrir crear/editar)
          const esRetornoAHija =
            (window.location.pathname.includes('agregar.html') && refUrl.pathname.includes('cantidad.html')) ||
            (window.location.pathname.includes('cantidad.html') && (refUrl.pathname.includes('editar-alimento.html') || refUrl.pathname.includes('crear-alimento.html'))) ||
            (window.location.pathname.includes('plan-editor.html') && refUrl.pathname.includes('buscar-alimento.html'));

          if (!esRetornoAHija) {
            evento.preventDefault();
            window.history.back();
          }
        }
      } catch {
        // En caso de discrepancia de URL, sigue el href nativo
      }
    }
  });

  // 2. Retroalimentación en botones pendientes de la barra inferior
  document.addEventListener('click', (evento) => {
    const botonNav = evento.target.closest('button.barra-inferior__item');
    if (!botonNav) return;

    const texto = botonNav.querySelector('span')?.textContent?.trim() || 'Esta sección';
    mostrarAvisoFlotante(`${texto}: disponible próximamente.`);
  });

  // 3. Retroalimentación para elementos con atributo data-aviso
  document.addEventListener('click', (evento) => {
    const elAviso = evento.target.closest('[data-aviso]');
    if (!elAviso) return;

    const aviso = elAviso.dataset.aviso;
    if (aviso) {
      mostrarAvisoFlotante(aviso);
    }
  });

  // 3.1. Soporte para clics en elementos con atributo data-toast (inter-páginas o inmediato)
  document.addEventListener('click', (evento) => {
    const elToast = evento.target.closest('[data-toast]');
    if (!elToast) return;

    const texto = elToast.dataset.toast;
    if (!texto) return;

    const href = elToast.getAttribute('href');
    const esNavegacion = (elToast.tagName === 'A' && href && !href.startsWith('#')) ||
                         (elToast.tagName === 'BUTTON' && elToast.type === 'submit');

    if (esNavegacion) {
      guardarAvisoToast(texto);
    } else {
      mostrarAvisoFlotante(texto);
    }
  });

  // 3.2. Seguimiento de origen al navegar a cantidad.html y limpieza al salir
  document.addEventListener('click', (evento) => {
    const enlaceCantidad = evento.target.closest('a[href*="cantidad.html"], button[form="form-alimento"], form[action*="cantidad.html"] button[type="submit"]');
    if (enlaceCantidad) {
      const ruta = window.location.pathname;
      try {
        if (ruta.includes('agregar.html') || ruta.includes('crear-alimento.html')) {
          sessionStorage.setItem('origen-cantidad', 'agregar');
        } else if (ruta.includes('dashboard.html')) {
          sessionStorage.setItem('origen-cantidad', 'dashboard');
        }
      } catch {
        // Ignorar
      }
      return;
    }

    const esAccionSalidaCantidad = evento.target.closest('.pie .btn, a[aria-label^="Volver"]');
    if (esAccionSalidaCantidad && (window.location.pathname.includes('cantidad.html') || document.querySelector('.input--cantidad'))) {
      try {
        sessionStorage.removeItem('origen-cantidad');
      } catch {
        // Ignorar
      }
    }
  });

  // 4. Quitar alimento en editor de planes
  document.addEventListener('click', (evento) => {
    const btnQuitar = evento.target.closest('button[aria-label="Quitar alimento"]');
    if (!btnQuitar) return;

    const alimento = btnQuitar.closest('.alimento');
    if (alimento) {
      alimento.remove();
      mostrarAvisoFlotante('Alimento quitado de la comida.');
    }
  });

  // 5. Quitar preferencias en perfil
  document.addEventListener('click', (evento) => {
    const btnQuitarPref = evento.target.closest('.preferencia button');
    if (!btnQuitarPref) return;

    const pref = btnQuitarPref.closest('.preferencia');
    if (pref) {
      const nombre = pref.textContent.trim();
      pref.remove();
      mostrarAvisoFlotante(`Preferencia "${nombre}" quitada.`);
    }
  });

  // 6. Micro-interacción accesible: chips y botones segmentados (.segmentado)
  document.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.chips > button.chip, .chips > button, .segmentado > button');
    if (!boton) return;

    const contenedor = boton.parentElement;
    if (!contenedor) return;

    const hermanos = contenedor.querySelectorAll('button');
    const esChecked = boton.hasAttribute('aria-checked') || boton.getAttribute('role') === 'radio';
    hermanos.forEach((h) => {
      if (esChecked) {
        h.setAttribute('aria-checked', 'false');
      } else {
        h.setAttribute('aria-pressed', 'false');
      }
    });
    if (esChecked) {
      boton.setAttribute('aria-checked', 'true');
    } else {
      boton.setAttribute('aria-pressed', 'true');
    }
  });

  // 7. Micro-interacción accesible: interruptor switch (role="switch")
  document.addEventListener('click', (evento) => {
    const switchBtn = evento.target.closest('button[role="switch"]');
    if (!switchBtn) return;

    const activado = switchBtn.getAttribute('aria-checked') === 'true';
    const nuevoEstado = !activado;
    switchBtn.setAttribute('aria-checked', String(nuevoEstado));

    const controlId = switchBtn.getAttribute('aria-controls');
    if (controlId) {
      const controlado = document.getElementById(controlId);
      if (controlado) {
        controlado.hidden = !nuevoEstado;
      }
    }
  });

  // 8. Botón agregar alimento en listas (aria-pressed)
  document.addEventListener('click', (evento) => {
    const btnAgregar = evento.target.closest('button.btn-agregar');
    if (!btnAgregar) return;

    const presionado = btnAgregar.getAttribute('aria-pressed') === 'true';
    btnAgregar.setAttribute('aria-pressed', String(!presionado));
    const nombreAlimento = btnAgregar.closest('.alimento-fila')?.querySelector('.alimento-fila__titulo')?.textContent?.trim() || 'Alimento';
    mostrarAvisoFlotante(presionado ? `"${nombreAlimento}" quitado de la comida.` : `"${nombreAlimento}" agregado a la comida.`);
    actualizarResumenPieAgregar();
  });

  // 9. Micro-interacción accesible: pestañas (role="tab")
  document.addEventListener('click', (evento) => {
    const pestana = evento.target.closest('[role="tablist"] > [role="tab"]');
    if (!pestana) return;

    const contenedor = pestana.parentElement;
    if (!contenedor) return;

    const hermanos = contenedor.querySelectorAll('[role="tab"]');
    hermanos.forEach((h) => h.setAttribute('aria-selected', 'false'));
    pestana.setAttribute('aria-selected', 'true');
  });

  // 10. Micro-interacción accesible: opciones de desplegable (role="option")
  document.addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[role="listbox"] [role="option"]');
    if (!opcion) return;

    const listbox = opcion.closest('[role="listbox"]');
    if (!listbox) return;

    const opciones = listbox.querySelectorAll('[role="option"]');
    opciones.forEach((h) => h.setAttribute('aria-selected', 'false'));
    opcion.setAttribute('aria-selected', 'true');

    // Si es una opción estándar dentro de details.desplegable (no el summary de personalizar), actualiza el texto y cierra
    if (opcion.tagName !== 'SUMMARY') {
      const desplegable = opcion.closest('details.desplegable');
      if (desplegable) {
        const summaryText = desplegable.querySelector('summary .negrita');
        const opcionText = opcion.querySelector('.negrita')?.textContent;
        if (summaryText && opcionText) {
          summaryText.textContent = opcionText;
        }
        desplegable.removeAttribute('open');
      }
    }
  });

  // 11. Opciones en grupo de radio (role="radiogroup")
  document.addEventListener('click', (evento) => {
    const radio = evento.target.closest('[role="radiogroup"] [role="radio"]');
    if (!radio || radio.closest('.segmentado')) return;

    const grupo = radio.closest('[role="radiogroup"]');
    if (!grupo) return;

    grupo.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', 'false'));
    radio.setAttribute('aria-checked', 'true');
  });

  // 12. Sanitización decimal transparente en inputs móviles (inputmode="decimal")
  document.addEventListener('input', (evento) => {
    const input = evento.target;
    if (input && input.tagName === 'INPUT' && input.getAttribute('inputmode') === 'decimal') {
      const original = input.value;
      const normalizado = normalizarDecimal(original);
      if (original !== normalizado) {
        const cursor = input.selectionStart;
        input.value = normalizado;
        try {
          input.setSelectionRange(cursor, cursor);
        } catch {
          // Ignorar en inputs donde setSelectionRange no aplique
        }
      }
    }
  });

  // 13. Accesibilidad WCAG: Cerrar modales, hojas, desplegables y acordeones con tecla Escape
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;

    // A. Si hay un desplegable de selección abierto (details.desplegable[open]), cerrarlo
    const desplegableAbierto = document.querySelector('details.desplegable[open]');
    if (desplegableAbierto) {
      desplegableAbierto.removeAttribute('open');
      desplegableAbierto.querySelector('summary')?.focus();
      return;
    }

    // B. Si el foco está dentro de un acordeón abierto, cerrarlo y retornar foco a su cabecera
    const acordeonAbierto = document.activeElement?.closest('details.acordeon[open], details[open]');
    if (acordeonAbierto) {
      acordeonAbierto.removeAttribute('open');
      acordeonAbierto.querySelector('summary')?.focus();
      return;
    }

    // C. Si hay un hash activo modal (ej. #anadir-cliente), cerrarlo y restaurar foco
    if (window.location.hash && window.location.hash.length > 1) {
      const modalId = decodeURIComponent(window.location.hash.slice(1));
      const modalTarget = document.getElementById(modalId);
      if (modalTarget) {
        evento.preventDefault();
        let disparador = null;
        try {
          disparador = document.querySelector(`a[href="${window.location.hash}"]`);
        } catch {
          // Ignorar si el selector no es válido
        }
        const btnCerrar = modalTarget.querySelector('a.modal-fondo__cerrar, a[aria-label^="Cerrar"]');
        if (btnCerrar) {
          btnCerrar.click();
        } else {
          window.location.hash = '';
        }
        if (disparador) {
          disparador.focus();
        }
        return;
      }
    }

    // D. Si es una pantalla modal/hoja (ej. buscar-alimento.html), ejecutar retorno inteligente
    const esHojaModal = document.querySelector('.hoja[role="dialog"]') || document.querySelector('.fondo-oscurecido');
    if (esHojaModal) {
      const btnCerrar = document.querySelector('a[aria-label^="Cerrar"], a[data-volver]');
      if (btnCerrar) {
        btnCerrar.click();
        return;
      }
    }
  });

  // 14. Cerrar desplegables de selección al hacer click fuera
  document.addEventListener('click', (evento) => {
    const desplegables = document.querySelectorAll('details.desplegable[open]');
    desplegables.forEach((d) => {
      if (!d.contains(evento.target)) {
        d.removeAttribute('open');
      }
    });
  });
}

window.addEventListener('pageshow', () => {
  procesarAvisoToastPendiente();
  adaptarCantidadContextual();
  adaptarAgregarContextual();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarNavegacion);
} else {
  iniciarNavegacion();
}
