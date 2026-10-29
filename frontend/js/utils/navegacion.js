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
export function procesarAvisoToastPendiente() {
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

let navegacionIniciada = false;

const SIMBOLOS_SPRITE_BASE = {
  calendario: { viewBox: '0 0 24 24', markup: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
  'flecha-derecha': { viewBox: '0 0 24 24', markup: '<path d="M9 6l6 6-6 6"/>' },
  vaso: { viewBox: '0 0 28 36', markup: '<path d="M3 3h22l-2.6 28.2A3 3 0 0 1 19.4 34H8.6a3 3 0 0 1-3-2.8z" stroke-width="2" stroke-linejoin="round"/>' },
  perfil: { viewBox: '0 0 24 24', markup: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>' },
  dashboard: { viewBox: '0 0 24 24', markup: '<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/>' },
  progreso: { viewBox: '0 0 24 24', markup: '<path d="M5 20V11M12 20V5M19 20v-6M3 20h18"/>' },
  ajustes: { viewBox: '0 0 24 24', markup: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>' },
  hecho: { viewBox: '0 0 24 24', markup: '<path d="m5 12 5 5 9-10"/>' },
  reloj: { viewBox: '0 0 24 24', markup: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/>' },
  'flecha-abajo': { viewBox: '0 0 24 24', markup: '<path d="m6 9 6 6 6-6"/>' },
  reemplazar: { viewBox: '0 0 24 24', markup: '<path d="M4 8h14M15 5l3 3-3 3M20 16H6M9 13l-3 3 3 3"/>' },
  mas: { viewBox: '0 0 24 24', markup: '<path d="M12 5v14M5 12h14"/>' },
  volver: { viewBox: '0 0 24 24', markup: '<path d="M15 18l-6-6 6-6"/>' },
  buscar: { viewBox: '0 0 24 24', markup: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>' },
  info: { viewBox: '0 0 24 24', markup: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>' },
  alerta: { viewBox: '0 0 24 24', markup: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>' },
  clientes: { viewBox: '0 0 24 24', markup: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.9.2 5 2.3 5 5.5"/>' },
  plantillas: { viewBox: '0 0 24 24', markup: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>' },
  alimentos: { viewBox: '0 0 24 24', markup: '<path d="M12 7c-1.5-1-5-1.3-6.3 1.7-1.4 3.2.3 8 2.3 10.5 1.2 1.5 2.4 1.3 4 .6 1.6.7 2.8.9 4-.6 2-2.5 3.7-7.3 2.3-10.5C17 5.7 13.5 6 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>' }
};

/**
 * Asegura que el cascarón compartido de la página (<svg class="sprite"> y <nav class="barra-inferior">)
 * cuente con todos los símbolos base registrados y los atributos de accesibilidad requeridos.
 */
export function asegurarCascaronCompartido() {
  if (typeof document === 'undefined') return;

  const sprite = document.querySelector('svg.sprite');
  if (sprite) {
    if (!sprite.hasAttribute('aria-hidden')) {
      sprite.setAttribute('aria-hidden', 'true');
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    Object.entries(SIMBOLOS_SPRITE_BASE).forEach(([id, def]) => {
      if (!sprite.querySelector(`symbol#${id}`)) {
        const symbol = document.createElementNS(svgNS, 'symbol');
        symbol.setAttribute('id', id);
        symbol.setAttribute('viewBox', def.viewBox);
        symbol.innerHTML = def.markup;
        sprite.appendChild(symbol);
      }
    });
  }

  document.querySelectorAll('.barra-inferior').forEach((barra) => {
    if (!barra.hasAttribute('aria-label')) {
      barra.setAttribute('aria-label', 'Navegación principal');
    }
    barra.querySelectorAll('svg').forEach((icono) => {
      if (!icono.hasAttribute('aria-hidden')) {
        icono.setAttribute('aria-hidden', 'true');
      }
    });
  });
}

/**
 * Inicializa los controladores globales de retorno inteligente, accesibilidad y retroalimentación.
 */
export function iniciarNavegacion() {
  // 0. Cascarón común y aviso toast inter-páginas pendiente en sessionStorage
  asegurarCascaronCompartido();
  procesarAvisoToastPendiente();

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

  // 8. Micro-interacción accesible: pestañas (role="tab")
  document.addEventListener('click', (evento) => {
    const pestana = evento.target.closest('[role="tablist"] > [role="tab"]');
    if (!pestana) return;

    const contenedor = pestana.parentElement;
    if (!contenedor) return;

    const hermanos = contenedor.querySelectorAll('[role="tab"]');
    hermanos.forEach((h) => h.setAttribute('aria-selected', 'false'));
    pestana.setAttribute('aria-selected', 'true');
  });

  // 9. Micro-interacción accesible: opciones de desplegable (role="option")
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

  // 10. Opciones en grupo de radio (role="radiogroup")
  document.addEventListener('click', (evento) => {
    const radio = evento.target.closest('[role="radiogroup"] [role="radio"]');
    if (!radio || radio.closest('.segmentado')) return;

    const grupo = radio.closest('[role="radiogroup"]');
    if (!grupo) return;

    grupo.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', 'false'));
    radio.setAttribute('aria-checked', 'true');
  });

  // 11. Sanitización decimal transparente en inputs móviles (inputmode="decimal")
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

  // 12. Accesibilidad WCAG: Cerrar modales, hojas, desplegables y acordeones con tecla Escape
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

  // 13. Cerrar desplegables de selección al hacer click fuera
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
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarNavegacion);
} else {
  iniciarNavegacion();
}
