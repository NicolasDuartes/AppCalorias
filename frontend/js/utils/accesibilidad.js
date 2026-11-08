/* ==========================================================
   accesibilidad.js — Gestión transversal de WAI-ARIA y Trampas de Foco (WCAG 2.1 AA)
   - Trampa de foco (Focus Trap) accesible en diálogos y modales.
   - Manejo de teclas Tab, Shift+Tab (ciclado estricto) y Escape (cierre accesible).
   - Restauración automática del foco en el elemento disparador (trigger button).
   - Cumplimiento de la Regla de Oro 1: CERO innerHTML.
   ========================================================== */

export const SELECTOR_ENFOCABLES = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])'
].join(', ');

const estadoTrampas = new WeakMap();
const instanciasModales = new WeakMap();

/**
 * Obtiene todos los elementos enfocables interactivos y visibles dentro de un contenedor DOM.
 * Filtra aquellos elementos ocultos (`hidden`, `display: none`, `visibility: hidden`),
 * deshabilitados (`disabled`) o marcados con `aria-hidden="true"`.
 *
 * @param {HTMLElement|null|undefined} contenedor - Contenedor DOM donde buscar elementos enfocables.
 * @returns {HTMLElement[]} Arreglo de elementos enfocables e interactivos en orden de aparición en el DOM.
 *
 * @example
 * // Caso normal: obtener controles activos dentro de un diálogo abierto
 * const modal = document.querySelector('#modal-editar-perfil');
 * const controles = obtenerElementosEnfocables(modal);
 * // -> [button#btn-cerrar-modal-perfil, input#input-perfil-nombre, ...]
 *
 * @example
 * // Caso especial (edge case): contenedor nulo o sin elementos visibles
 * const vacio = obtenerElementosEnfocables(null);
 * // -> []
 *
 * @note Edge cases:
 * - Si `contenedor` es `null`, `undefined` o no implementa `querySelectorAll`, retorna `[]`.
 * - Si un elemento enfocable está dentro de un ancestro con atributo `[hidden]`, es descartado.
 */
export function obtenerElementosEnfocables(contenedor) {
  if (!contenedor || typeof contenedor.querySelectorAll !== 'function') return [];
  const elementos = Array.from(contenedor.querySelectorAll(SELECTOR_ENFOCABLES));
  return elementos.filter((el) => {
    if (el.hidden || el.closest('[hidden]')) return false;
    if (el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      const estilo = window.getComputedStyle(el);
      if (estilo && (estilo.display === 'none' || estilo.visibility === 'hidden')) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Activa una trampa de foco accesible (Focus Trap WCAG 2.1 AA) dentro del modal especificado.
 * Hace visible el modal y su contenedor `.modal-fondo`, aplica atributos WAI-ARIA (`role="dialog"`,
 * `aria-modal="true"`, `aria-hidden="false"`), restringe la navegación con `Tab` y `Shift+Tab`
 * a los límites del diálogo y traslada el foco inicial al primer elemento interactivo.
 *
 * @param {HTMLElement|string} elementoModal - Nodo DOM del modal o selector CSS que lo identifica.
 * @param {Object} [opciones={}] - Configuración opcional de foco inicial y retorno.
 * @param {HTMLElement|string|null} [opciones.elementoInicial=null] - Elemento o selector interno que recibirá el foco al abrir.
 * @param {HTMLElement|null} [opciones.disparador=null] - Botón o control que disparó la apertura del modal.
 * @returns {HTMLElement|null} El nodo DOM del modal activado, o `null` si el selector no existe.
 *
 * @example
 * // Caso normal: activar trampa de foco sobre un modal indicando su disparador
 * const btn = document.querySelector('#btn-editar-perfil');
 * activarTrampaFoco('#modal-editar-perfil', {
 *   elementoInicial: '#input-perfil-nombre',
 *   disparador: btn
 * });
 *
 * @example
 * // Caso especial: modal sin controles interactivos o selector inexistente
 * activarTrampaFoco('#modal-inexistente'); // -> null
 *
 * @note Edge cases:
 * - Si el modal ya tenía una trampa activa, la libera previamente sin ocultarlo para evitar listeners duplicados.
 * - Si el modal no contiene ningún elemento enfocable, asigna `tabindex="-1"` al propio contenedor del modal y lo enfoca, bloqueando la salida con `Tab`.
 */
export function activarTrampaFoco(elementoModal, opciones = {}) {
  const modal = typeof elementoModal === 'string' ? document.querySelector(elementoModal) : elementoModal;
  if (!modal) return null;

  // Si el modal está dentro de un contenedor de fondo oscurecido (.modal-fondo), asegurar visibilidad
  const fondo = modal.closest('.modal-fondo') || (modal.classList.contains('modal-fondo') ? modal : null);
  if (fondo && fondo !== modal) {
    fondo.hidden = false;
    fondo.setAttribute('aria-hidden', 'false');
  }

  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('aria-modal', 'true');
  if (!modal.hasAttribute('role')) {
    modal.setAttribute('role', 'dialog');
  }

  // Desactivar listener previo si existía en este modal
  liberarTrampaFoco(modal, { mantenerVisible: true });

  const manejadorTab = (evento) => {
    if (evento.key !== 'Tab') return;

    const enfocables = obtenerElementosEnfocables(modal);
    if (enfocables.length === 0) {
      evento.preventDefault();
      return;
    }

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];

    if (evento.shiftKey) {
      // Shift + Tab: hacia atrás
      if (document.activeElement === primero || !modal.contains(document.activeElement)) {
        evento.preventDefault();
        ultimo.focus();
      }
    } else {
      // Tab: hacia adelante
      if (document.activeElement === ultimo || !modal.contains(document.activeElement)) {
        evento.preventDefault();
        primero.focus();
      }
    }
  };

  modal.addEventListener('keydown', manejadorTab);

  estadoTrampas.set(modal, {
    manejadorTab,
    disparadorPrevio: opciones.disparador || null
  });

  // Foco inicial accesible
  let enfocado = false;
  if (opciones.elementoInicial) {
    const elInit = typeof opciones.elementoInicial === 'string'
      ? modal.querySelector(opciones.elementoInicial)
      : opciones.elementoInicial;
    if (elInit && typeof elInit.focus === 'function') {
      elInit.focus();
      enfocado = true;
    }
  }

  if (!enfocado) {
    const conAutofocus = modal.querySelector('[autofocus]');
    if (conAutofocus && typeof conAutofocus.focus === 'function') {
      conAutofocus.focus();
      enfocado = true;
    }
  }

  if (!enfocado) {
    const enfocables = obtenerElementosEnfocables(modal);
    if (enfocables.length > 0) {
      enfocables[0].focus();
      enfocado = true;
    } else if (typeof modal.focus === 'function') {
      if (!modal.hasAttribute('tabindex')) {
        modal.setAttribute('tabindex', '-1');
      }
      modal.focus();
    }
  }

  return modal;
}

/**
 * Desactiva el listener de ciclado `Tab`/`Shift+Tab` del modal y, por defecto,
 * oculta semánticamente el diálogo y su telón de fondo (`.modal-fondo`) aplicando
 * `hidden = true` y `aria-hidden="true"`.
 *
 * @param {HTMLElement|string} elementoModal - Nodo DOM del modal o selector CSS.
 * @param {Object} [opciones={}] - Opciones de liberación.
 * @param {boolean} [opciones.mantenerVisible=false] - Si es `true`, remueve el listener de teclado sin ocultar el modal.
 * @returns {void}
 *
 * @example
 * // Caso normal: cerrar y ocultar un modal activo
 * liberarTrampaFoco('#modal-editar-perfil');
 *
 * @example
 * // Caso especial: reiniciar listener manteniendo visible el diálogo
 * liberarTrampaFoco(nodoModal, { mantenerVisible: true });
 *
 * @note Edge cases:
 * - Si `elementoModal` es `null` o no tiene una trampa registrada en `WeakMap`, finaliza de forma segura sin lanzar excepciones.
 */
export function liberarTrampaFoco(elementoModal, opciones = {}) {
  const modal = typeof elementoModal === 'string' ? document.querySelector(elementoModal) : elementoModal;
  if (!modal) return;

  const info = estadoTrampas.get(modal);
  if (info && info.manejadorTab) {
    modal.removeEventListener('keydown', info.manejadorTab);
  }
  estadoTrampas.delete(modal);

  if (!opciones.mantenerVisible) {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    const fondo = modal.closest('.modal-fondo') || (modal.classList.contains('modal-fondo') ? modal : null);
    if (fondo && fondo !== modal) {
      fondo.hidden = true;
      fondo.setAttribute('aria-hidden', 'true');
    }
  }
}

/**
 * Configura el ciclo de vida accesible completo de un diálogo modal: vinculación de botones
 * de apertura y cierre (tanto estáticos como delegados dinámicamente), trampa de foco WAI-ARIA,
 * cierre con tecla `Escape` o clic en el telón de fondo, y restitución del foco al elemento disparador.
 *
 * @param {HTMLElement|string} elementoModal - Nodo DOM o selector CSS del modal.
 * @param {Object} [opciones={}] - Parámetros de configuración del diálogo.
 * @param {HTMLElement|string|Array<HTMLElement|string>|null} [opciones.btnAbrir=null] - Selector, nodo o lista de disparadores que abren el modal.
 * @param {HTMLElement|string|Array<HTMLElement|string>|null} [opciones.btnCerrar=null] - Selector, nodo o lista de botones que cierran o cancelan el modal.
 * @param {Function|null} [opciones.alAbrir=null] - Callback invocado antes de activar la trampa `{ elementoModal, disparador }`.
 * @param {Function|null} [opciones.alCerrar=null] - Callback invocado al liberar la trampa `{ elementoModal, disparador }`.
 * @param {HTMLElement|string|null} [opciones.primerEnfocable=null] - Elemento o selector interno a enfocar prioritariamente al abrir.
 * @param {boolean} [opciones.cerrarConEscape=true] - Si permite cerrar presionando la tecla `Escape`.
 * @param {boolean} [opciones.cerrarConFondo=true] - Si permite cerrar al hacer clic fuera del cuadro del diálogo (en el backdrop).
 * @param {boolean} [opciones.restaurarFoco=true] - Si devuelve el foco automáticamente al botón disparador al cerrarse.
 * @returns {{ modal: HTMLElement, abrir: Function, cerrar: Function, destruir: Function }|null} Objeto controlador del modal o `null` si no existe.
 *
 * @example
 * // Caso normal: configurar modal con selectores de apertura, cierre y foco inicial
 * const ctrl = configurarModalAccesible('#modal-editar-perfil', {
 *   btnAbrir: '#btn-editar-perfil',
 *   btnCerrar: ['#btn-cerrar-modal-perfil', '#btn-cancelar-perfil'],
 *   primerEnfocable: '#input-perfil-nombre'
 * });
 *
 * @example
 * // Caso especial: apertura programática desde una lista dinámica y limpieza manual
 * const ctrlRevision = configurarModalAccesible('#modal-revisar', {
 *   btnAbrir: '.btn-rechazar',
 *   cerrarConFondo: false
 * });
 * ctrlRevision?.abrir(botonDinamico);
 *
 * @note Edge cases:
 * - Si `btnAbrir` o `btnCerrar` se pasan como `string` (o arreglos con selectores), registra tanto listeners directos como delegación en `document`, verificando `e.defaultPrevented` para evitar doble ejecución.
 * - Si se invoca nuevamente sobre un mismo modal, destruye previamente la instancia anterior en `WeakMap` para evitar duplicar listeners.
 * - Si el elemento disparador fue eliminado del DOM antes de cerrar el modal, `destino.focus()` captura silenciosamente cualquier error.
 */
export function configurarModalAccesible(elementoModal, opciones = {}) {
  const modal = typeof elementoModal === 'string' ? document.querySelector(elementoModal) : elementoModal;
  if (!modal) return null;

  const instanciaPrevia = instanciasModales.get(modal);
  if (instanciaPrevia && typeof instanciaPrevia.destruir === 'function') {
    instanciaPrevia.destruir({ mantenerEstadoVisual: true });
  }

  const {
    btnAbrir = null,
    btnCerrar = null,
    alAbrir = null,
    alCerrar = null,
    primerEnfocable = null,
    cerrarConEscape = true,
    cerrarConFondo = true,
    restaurarFoco = true
  } = opciones;

  let ultimoDisparador = null;

  // Atributos base WAI-ARIA
  if (!modal.hasAttribute('role')) {
    modal.setAttribute('role', 'dialog');
  }
  modal.setAttribute('aria-modal', 'true');
  if (modal.hidden) {
    modal.setAttribute('aria-hidden', 'true');
  } else {
    modal.setAttribute('aria-hidden', 'false');
  }

  function abrir(disparador = null) {
    ultimoDisparador = disparador || document.activeElement;

    if (typeof alAbrir === 'function') {
      alAbrir({ elementoModal: modal, disparador: ultimoDisparador });
    }

    activarTrampaFoco(modal, {
      elementoInicial: primerEnfocable,
      disparador: ultimoDisparador
    });
  }

  function cerrar(disparadorRetorno = null) {
    liberarTrampaFoco(modal);

    if (typeof alCerrar === 'function') {
      alCerrar({ elementoModal: modal, disparador: ultimoDisparador });
    }

    if (restaurarFoco) {
      const destino = disparadorRetorno || ultimoDisparador;
      if (destino && typeof destino.focus === 'function') {
        try {
          destino.focus();
        } catch (_) {}
      }
    }
  }

  function manejadorKeydown(evento) {
    if (cerrarConEscape && evento.key === 'Escape' && !modal.hidden) {
      evento.preventDefault();
      evento.stopPropagation();
      cerrar();
    }
  }

  modal.addEventListener('keydown', manejadorKeydown);

  // Escuchar también en document para asegurar Escape si el foco estuviera en el borde
  const manejadorEscapeGlobal = (evento) => {
    if (evento.defaultPrevented) return;
    if (cerrarConEscape && evento.key === 'Escape' && !modal.hidden) {
      evento.preventDefault();
      evento.stopPropagation();
      cerrar();
    }
  };
  document.addEventListener('keydown', manejadorEscapeGlobal);

  const aplanarElementos = (origen) => {
    if (!origen) return [];
    if (Array.isArray(origen)) return origen.flatMap(aplanarElementos);
    if (typeof origen === 'string') return Array.from(document.querySelectorAll(origen));
    if (origen instanceof NodeList || origen instanceof HTMLCollection) return Array.from(origen);
    if (origen.nodeType) return [origen];
    return [];
  };

  const extraerSelectores = (origen) => {
    if (!origen) return '';
    if (typeof origen === 'string') return origen.trim();
    if (Array.isArray(origen)) {
      return origen.map(extraerSelectores).filter(Boolean).join(', ');
    }
    return '';
  };

  const listenersLimpieza = [];

  const disparadores = aplanarElementos(btnAbrir);
  disparadores.forEach((btn) => {
    const fn = (e) => {
      e.preventDefault();
      abrir(btn);
    };
    btn.addEventListener('click', fn);
    listenersLimpieza.push(() => btn.removeEventListener('click', fn));
  });

  // Delegación global si btnAbrir contiene selectores CSS (para soportar elementos dinámicos)
  const selectorAbrir = extraerSelectores(btnAbrir);
  if (selectorAbrir) {
    const fnDelegada = (e) => {
      if (e.defaultPrevented || typeof e.target?.closest !== 'function') return;
      const trigger = e.target.closest(selectorAbrir);
      if (trigger) {
        e.preventDefault();
        abrir(trigger);
      }
    };
    document.addEventListener('click', fnDelegada);
    listenersLimpieza.push(() => document.removeEventListener('click', fnDelegada));
  }

  const cerradores = aplanarElementos(btnCerrar);
  cerradores.forEach((btn) => {
    const fn = (e) => {
      e.preventDefault();
      cerrar();
    };
    btn.addEventListener('click', fn);
    listenersLimpieza.push(() => btn.removeEventListener('click', fn));
  });

  const selectorCerrar = extraerSelectores(btnCerrar);
  if (selectorCerrar) {
    const fnDelegadaCerrar = (e) => {
      if (e.defaultPrevented || typeof e.target?.closest !== 'function') return;
      const trigger = e.target.closest(selectorCerrar);
      if (trigger && (modal.contains(trigger) || trigger.closest('.modal-fondo') === modal.closest('.modal-fondo'))) {
        e.preventDefault();
        cerrar();
      }
    };
    document.addEventListener('click', fnDelegadaCerrar);
    listenersLimpieza.push(() => document.removeEventListener('click', fnDelegadaCerrar));
  }

  // Clic en backdrop para cerrar
  if (cerrarConFondo) {
    const fnFondo = (e) => {
      if (e.target === modal || e.target?.classList?.contains('modal-fondo__cerrar')) {
        e.preventDefault();
        cerrar();
      }
    };
    modal.addEventListener('click', fnFondo);
    listenersLimpieza.push(() => modal.removeEventListener('click', fnFondo));
  }

  const controlador = {
    modal,
    abrir,
    cerrar,
    destruir: (opts = {}) => {
      liberarTrampaFoco(modal, { mantenerVisible: Boolean(opts.mantenerEstadoVisual) });
      modal.removeEventListener('keydown', manejadorKeydown);
      document.removeEventListener('keydown', manejadorEscapeGlobal);
      listenersLimpieza.forEach((fn) => fn());
      if (instanciasModales.get(modal) === controlador) {
        instanciasModales.delete(modal);
      }
    }
  };

  instanciasModales.set(modal, controlador);
  return controlador;
}
