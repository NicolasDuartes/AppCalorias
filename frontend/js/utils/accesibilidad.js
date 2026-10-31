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

/**
 * Obtiene todos los elementos enfocables interactivos y visibles dentro de un contenedor.
 * @param {HTMLElement} contenedor Contenedor donde buscar elementos enfocables.
 * @returns {HTMLElement[]} Lista de elementos enfocables visibles.
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
 * Activa la trampa de foco WAI-ARIA dentro del modal dado.
 * @param {HTMLElement|string} elementoModal Elemento DOM o selector del modal.
 * @param {Object} [opciones={}] Opciones adicionales { elementoInicial, disparador }.
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
 * Libera la trampa de foco y oculta el modal según WCAG 2.1 AA.
 * @param {HTMLElement|string} elementoModal Elemento DOM o selector del modal.
 * @param {Object} [opciones={}] Opciones { mantenerVisible: boolean }.
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
 * Configura integralmente un modal accesible con disparadores, botones de cierre,
 * trampa de foco, tecla Escape y retorno de foco.
 * @param {HTMLElement|string} elementoModal Elemento DOM o selector del modal.
 * @param {Object} [opciones={}] Opciones de configuración.
 * @param {HTMLElement|string|Array} [opciones.btnAbrir] Selector o elemento disparador.
 * @param {HTMLElement|string|Array} [opciones.btnCerrar] Selector o elemento de cierre/cancelación.
 * @param {Function} [opciones.alAbrir] Callback ejecutado al abrir { elementoModal, disparador }.
 * @param {Function} [opciones.alCerrar] Callback ejecutado al cerrar { elementoModal, disparador }.
 * @param {HTMLElement|string} [opciones.primerEnfocable] Elemento o selector a enfocar al abrir.
 * @param {boolean} [opciones.cerrarConEscape=true] Si debe cerrar con tecla Escape.
 * @param {boolean} [opciones.cerrarConFondo=true] Si debe cerrar al hacer clic en el backdrop.
 * @param {boolean} [opciones.restaurarFoco=true] Si debe retornar el foco al disparador al cerrar.
 * @returns {Object} Controladores { modal, abrir, cerrar, destruir }.
 */
export function configurarModalAccesible(elementoModal, opciones = {}) {
  const modal = typeof elementoModal === 'string' ? document.querySelector(elementoModal) : elementoModal;
  if (!modal) return null;

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

  // Delegación global si btnAbrir fue pasado como string selector (para soportar elementos dinámicos)
  if (typeof btnAbrir === 'string') {
    const fnDelegada = (e) => {
      const trigger = e.target.closest(btnAbrir);
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

  if (typeof btnCerrar === 'string') {
    const fnDelegadaCerrar = (e) => {
      const trigger = e.target.closest(btnCerrar);
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
      if (e.target === modal || e.target.classList.contains('modal-fondo__cerrar')) {
        e.preventDefault();
        cerrar();
      }
    };
    modal.addEventListener('click', fnFondo);
    listenersLimpieza.push(() => modal.removeEventListener('click', fnFondo));
  }

  return {
    modal,
    abrir,
    cerrar,
    destruir: () => {
      liberarTrampaFoco(modal);
      modal.removeEventListener('keydown', manejadorKeydown);
      document.removeEventListener('keydown', manejadorEscapeGlobal);
      listenersLimpieza.forEach((fn) => fn());
    }
  };
}
