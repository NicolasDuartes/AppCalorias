/* ==========================================================
   historial-ui.js — Controlador UI para el Historial de Planes del Coach (historial.html / historial-vacio.html)
   - Permite al coach consultar la línea de tiempo de planes archivados de un cliente.
   - Conectado a planes-api.js para obtener historial de planes.
   - Permite reutilizar planes anteriores como plantilla para nuevos planes.
   - Autenticado con rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { obtenerHistorialPlanes } from '../data/planes-api.js';
import { mostrarAvisoFlotante } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para historial.html y historial-vacio.html.
 */
export const SELECTORES = {
  subtituloCliente: '.encabezado__textos .sub',
  lineaTiempo: '.linea-tiempo',
  itemsLineaTiempo: '.linea-tiempo__item',
  tarjetaPlan: '.linea-tiempo__tarjeta',
  tagArchivado: '.linea-tiempo__tarjeta .tag--gris',
  tituloPlan: '.linea-tiempo__tarjeta .seccion-titulo',
  kcalPlan: '.linea-tiempo__tarjeta .num--m',
  fechasPlan: '.linea-tiempo__tarjeta .sub',
  btnVerDetalle: '.linea-tiempo__tarjeta a.btn--secundario',
  btnReutilizar: '.linea-tiempo__tarjeta a.btn--suave',
  seccionVacio: '.vacio',
  btnCrearDesdeVacio: '.vacio a.btn--primario'
};

/**
 * Inicializa el controlador de historial de planes.
 */
export async function iniciarHistorial() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('cliente');

  if (clienteId) {
    try {
      const planes = await obtenerHistorialPlanes(clienteId);
      if (planes && planes.length === 0 && !document.querySelector(SELECTORES.seccionVacio)) {
        // Si no hay planes archivados, podemos sugerir o alternar vista
        const sub = document.querySelector(SELECTORES.subtituloCliente);
        if (sub) {
          sub.textContent = `${sub.textContent.split('·')[0].trim()} · 0 planes archivados`;
        }
      }
    } catch {
      // Fallback local a datos renderizados
    }
  }

  // Interceptar botones de reutilizar como plantilla para cargar parámetros en el editor
  document.querySelectorAll(SELECTORES.btnReutilizar).forEach((btn) => {
    btn.addEventListener('click', () => {
      mostrarAvisoFlotante('Cargando plantilla en el editor...');
    });
  });
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarHistorial);
} else {
  iniciarHistorial();
}
