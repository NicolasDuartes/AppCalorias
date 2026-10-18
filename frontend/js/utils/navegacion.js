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

/**
 * Inicializa los controladores globales de retorno inteligente, accesibilidad y retroalimentación.
 */
export function iniciarNavegacion() {
  // 0. Aviso toast inter-páginas pendiente en sessionStorage
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
