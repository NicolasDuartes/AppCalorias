/* ==========================================================
   plan-editor-ui.js — Controlador UI del Editor de Planes para Coach (plan-editor.html / plan-editor-vacio.html)
   - Permite al coach configurar comidas, porciones y notas para el plan de un alumno.
   - Cálculo reactivo e interactivo de macronutrientes y calorías por Atwater (4P + 4C + 9G).
   - Actualización en tiempo real del resumen fijo (.card--fija) con barra de progreso,
     diferencia con respecto al objetivo diario y suma acumulada de macros.
   - Eliminación reactiva de alimentos, enlaces contextuales a búsqueda y recepción MPA.
   - Persistencia real en Supabase (planes-api.js) con fallback offline en sessionStorage.
   - Control de acceso por rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { ALIMENTOS_PLAN_DEFECTO } from '../data/plan-defecto.js';
import { calcularAtwater, aNumeroSeguro } from '../calc/nutricion-calc.js';
import { mostrarAvisoFlotante, guardarAvisoToast } from '../utils/navegacion.js';
import { crearPlan, activarPlan } from '../data/planes-api.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plan-editor.html y plan-editor-vacio.html.
 */
export const SELECTORES = {
  acordeon: '.acordeon',
  acordeonTitulo: '.acordeon__titulo',
  acordeonLineaKcal: '.acordeon__linea .negrita',
  acordeonLineaMacros: '.acordeon__linea .sub',
  alimento: '.alimento',
  alimentoNombre: '.alimento__nombre',
  alimentoDatos: '.alimento__datos',
  alimentoInputCantidad: '.alimento__datos .input input',
  alimentoKcal: '.alimento__datos .num',
  alimentoMacros: '.alimento__macros',
  btnCambiar: '.alimento__cabecera .btn-accion[aria-label="Cambiar alimento"]',
  btnQuitar: '.alimento__cabecera .btn-accion--peligro, button[aria-label="Quitar alimento"]',
  btnAnadir: '.btn--punteado[href*="buscar-alimento.html"]',
  btnAnadirColacion: '#boton-anadir-colacion',
  tplComidaColacion: '#tpl-comida-colacion',
  btnQuitarComida: '.btn-quitar-comida',
  btnDuplicarComida: '.btn-duplicar-comida',
  btnColacion: '#boton-anadir-colacion',
  textareaNota: '.acordeon__cuerpo textarea',
  cardFija: '.card--fija',
  totalKcal: '.card--fija .num--m',
  objetivoTexto: '.card--fija .unidad',
  tagDiferencia: '.card--fija .tag',
  barraProgreso: '.card--fija .barra span',
  macroProteina: '.macros .macro:nth-child(1) .num',
  macroCarbos: '.macros .macro:nth-child(2) .num',
  macroGrasas: '.macros .macro:nth-child(3) .num',
  btnCancelar: '.grilla-2 a.btn--secundario, [data-volver]',
  btnGuardar: '#boton-guardar, .grilla-2 a.btn--primario',
  inputAgua: 'input[name="agua"]',
  textareaPautas: 'textarea[name="pautas"]',
  tplAlimentoEditor: '#tpl-alimento-editor'
};

/** Objetivo calórico estándar por defecto para calcular progresos. */
export const OBJETIVO_CALORICO_DEFECTO = 2060;

/**
 * Helper seguro para actualizar un elemento numérico con su unidad sin usar innerHTML.
 * @param {HTMLElement|null} el
 * @param {number|string} valor
 * @param {string} unidad
 */
function asignarValorConUnidad(el, valor, unidad) {
  if (!el) return;
  el.textContent = `${valor} `;
  const spanUnidad = document.createElement('span');
  spanUnidad.className = 'unidad';
  spanUnidad.textContent = unidad;
  el.appendChild(spanUnidad);
}

/**
 * Extrae el identificador del alumno o cliente desde la URL, hash o sesión previa.
 * Fallback seguro por defecto si no se especifica.
 * @returns {string} UUID o identificador del cliente
 */
export function extraerClienteId() {
  const params = new URLSearchParams(window.location.search);
  let clienteId = params.get('cliente') || params.get('id');

  if (!clienteId && window.location.hash) {
    const hashLimpio = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hashLimpio);
    clienteId = hashParams.get('cliente') || hashParams.get('id');
  }

  if (!clienteId) {
    try {
      clienteId = sessionStorage.getItem('clienteActual') || sessionStorage.getItem('appcalorias_cliente_actual');
    } catch {
      // Ignorar fallo de acceso a sessionStorage
    }
  }

  if (!clienteId) {
    clienteId = '00000000-0000-0000-0000-000000000001';
  }

  try {
    sessionStorage.setItem('clienteActual', clienteId);
  } catch {
    // Ignorar fallo de guardado
  }

  return clienteId;
}

/**
 * Vincula los eventos reactivos de una fila de alimento (cambio de gramos y botón quitar).
 * @param {HTMLElement} filaAlimento
 */
export function vincularEventosAlimento(filaAlimento) {
  if (!filaAlimento || filaAlimento.dataset.eventosVinculados === 'true') return;
  filaAlimento.dataset.eventosVinculados = 'true';

  const inputCant = filaAlimento.querySelector(SELECTORES.alimentoInputCantidad);
  if (inputCant) {
    inputCant.addEventListener('input', () => {
      recalcularResumenPlan();
    });
  }

  const btnQuitar = filaAlimento.querySelector(SELECTORES.btnQuitar);
  if (btnQuitar) {
    btnQuitar.addEventListener('click', (evento) => {
      evento.stopPropagation();
      if (!filaAlimento.isConnected) return;
      filaAlimento.remove();
      mostrarAvisoFlotante('Alimento quitado de la comida.');
      recalcularResumenPlan();
    });
  }
}

/**
 * Determina el siguiente nombre correlativo para una colación ('Colación 1', 'Colación 2', etc.).
 * @returns {string}
 */
export function obtenerSiguienteNombreColacion() {
  const colaciones = document.querySelectorAll('details[data-comida="colacion"]');
  const numeros = [];
  colaciones.forEach((col) => {
    const titulo = col.querySelector(SELECTORES.acordeonTitulo)?.textContent || '';
    const match = titulo.match(/Colaci[oó]n\s*(\d+)/i);
    if (match) {
      numeros.push(parseInt(match[1], 10));
    }
  });

  if (numeros.length === 0) {
    return `Colación ${colaciones.length + 1}`;
  }
  const maxNum = Math.max(...numeros);
  return `Colación ${maxNum + 1}`;
}

/**
 * Añade un nuevo acordeón de colación al plan insertándolo justo antes del botón de añadir colación.
 * @param {string|null} [nombrePersonalizado=null]
 * @returns {HTMLElement|null} El acordeón insertado
 */
export function anadirColacion(nombrePersonalizado = null) {
  const tpl = document.querySelector(SELECTORES.tplComidaColacion);
  const btnColacion = document.querySelector(SELECTORES.btnAnadirColacion);
  if (!tpl || !tpl.content || !btnColacion) return null;

  const clon = tpl.content.cloneNode(true);
  const nuevoAcordeon = clon.querySelector(SELECTORES.acordeon) || clon.firstElementChild;
  if (!nuevoAcordeon) return null;

  const nombreColacion = (nombrePersonalizado && String(nombrePersonalizado).trim()) || obtenerSiguienteNombreColacion();
  const tituloEl = nuevoAcordeon.querySelector(SELECTORES.acordeonTitulo) || nuevoAcordeon.querySelector('[data-ref="titulo"]');
  if (tituloEl) {
    tituloEl.textContent = nombreColacion;
  }

  const clienteId = extraerClienteId();
  const btnAnadir = nuevoAcordeon.querySelector('[data-ref="btn-anadir-alimento"]') || nuevoAcordeon.querySelector(SELECTORES.btnAnadir);
  if (btnAnadir) {
    const queryCliente = clienteId ? `&cliente=${encodeURIComponent(clienteId)}` : '';
    btnAnadir.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(nombreColacion)}${queryCliente}`);
  }

  const btnQuitar = nuevoAcordeon.querySelector(SELECTORES.btnQuitarComida);
  if (btnQuitar) {
    btnQuitar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      if (!nuevoAcordeon.isConnected) return;
      nuevoAcordeon.remove();
      mostrarAvisoFlotante('Comida eliminada del plan.');
      recalcularResumenPlan();
    });
  }

  const btnDuplicar = nuevoAcordeon.querySelector(SELECTORES.btnDuplicarComida);
  if (btnDuplicar) {
    btnDuplicar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      duplicarComida(nuevoAcordeon);
    });
  }

  if (btnColacion.parentNode) {
    btnColacion.parentNode.insertBefore(nuevoAcordeon, btnColacion);
  }

  recalcularResumenPlan();
  mostrarAvisoFlotante('Nueva colación agregada al plan.');

  return nuevoAcordeon;
}

/**
 * Determina el nuevo nombre al duplicar una comida:
 * Si termina en '(copia)', pasa a '(copia 2)'.
 * Si termina en '(copia N)', pasa a '(copia N+1)'.
 * En caso contrario, concatena ' (copia)'.
 * @param {string} nombreOriginal
 * @returns {string}
 */
export function generarNombreCopiaComida(nombreOriginal) {
  const nombreLimpio = String(nombreOriginal || 'Comida').trim();
  const matchCopiaNum = nombreLimpio.match(/^(.*?)\s*\(copia\s+(\d+)\)$/i);
  if (matchCopiaNum) {
    const base = matchCopiaNum[1].trim();
    const num = parseInt(matchCopiaNum[2], 10) + 1;
    return `${base} (copia ${num})`;
  }
  const matchCopia = nombreLimpio.match(/^(.*?)\s*\(copia\)$/i);
  if (matchCopia) {
    const base = matchCopia[1].trim();
    return `${base} (copia 2)`;
  }
  return `${nombreLimpio} (copia)`;
}

/**
 * Duplica una comida completa en el editor de planes:
 * - Extrae título, notas y filas de alimentos.
 * - Genera el nuevo nombre secuencial para la copia.
 * - Clona la estructura mediante tplComidaColacion (o clon limpio).
 * - Clona cada alimento con sus gramos, dataset nutricional y eventos reactivos.
 * - Vincula botones de acción (.btn-duplicar-comida, .btn-quitar-comida).
 * - Inserta el nuevo acordeón inmediatamente después del acordeón original.
 * - Abre el nuevo acordeón (open = true).
 * - Recalcula inmediatamente las calorías y macronutrientes del plan.
 * - Muestra aviso flotante de confirmación.
 * @param {HTMLElement} acordeonOriginal
 * @returns {HTMLElement|null} El acordeón duplicado e insertado en el DOM
 */
export function duplicarComida(acordeonOriginal) {
  if (!acordeonOriginal || !(acordeonOriginal instanceof HTMLElement)) return null;

  const tituloEl = acordeonOriginal.querySelector(SELECTORES.acordeonTitulo) || acordeonOriginal.querySelector('[data-ref="titulo"]');
  const nombreOriginal = tituloEl?.textContent?.trim() || 'Comida';
  const nuevoNombre = generarNombreCopiaComida(nombreOriginal);

  const textareaOriginal = acordeonOriginal.querySelector(SELECTORES.textareaNota);
  const notasOriginales = textareaOriginal?.value || '';

  const alimentosOriginales = acordeonOriginal.querySelectorAll(SELECTORES.alimento);

  const tpl = document.querySelector(SELECTORES.tplComidaColacion);
  let nuevoAcordeon = null;

  if (tpl && tpl.content) {
    const clon = tpl.content.cloneNode(true);
    nuevoAcordeon = clon.querySelector(SELECTORES.acordeon) || clon.firstElementChild;
  }

  if (!nuevoAcordeon) {
    nuevoAcordeon = acordeonOriginal.cloneNode(true);
    nuevoAcordeon.querySelectorAll(SELECTORES.alimento).forEach((f) => f.remove());
  }

  // Establecer nuevo título de la comida
  const nuevoTituloEl = nuevoAcordeon.querySelector(SELECTORES.acordeonTitulo) || nuevoAcordeon.querySelector('[data-ref="titulo"]');
  if (nuevoTituloEl) {
    nuevoTituloEl.textContent = nuevoNombre;
  }

  // Establecer notas
  const nuevoTextarea = nuevoAcordeon.querySelector(SELECTORES.textareaNota);
  if (nuevoTextarea) {
    nuevoTextarea.value = notasOriginales;
  }

  // Configurar enlace para añadir alimentos a esta comida
  const clienteId = extraerClienteId();
  const btnAnadir = nuevoAcordeon.querySelector('[data-ref="btn-anadir-alimento"]') || nuevoAcordeon.querySelector(SELECTORES.btnAnadir);
  if (btnAnadir) {
    const queryCliente = (clienteId && clienteId !== '00000000-0000-0000-0000-000000000001')
      ? `&cliente=${encodeURIComponent(clienteId)}`
      : '';
    btnAnadir.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(nuevoNombre)}${queryCliente}`);
  }

  // Clonar y vincular cada alimento del original
  const contenedorAlimentos = nuevoAcordeon.querySelector('[data-ref="contenedor-alimentos"]');
  alimentosOriginales.forEach((alimentoOriginal) => {
    const filaClonada = alimentoOriginal.cloneNode(true);
    delete filaClonada.dataset.eventosVinculados;

    // Preservar valor de gramos ingresado
    const inputOrig = alimentoOriginal.querySelector(SELECTORES.alimentoInputCantidad);
    const inputClon = filaClonada.querySelector(SELECTORES.alimentoInputCantidad);
    if (inputOrig && inputClon) {
      inputClon.value = inputOrig.value;
    }

    // Preservar metadatos nutricionales por 100g
    if (alimentoOriginal.dataset.kcal100) filaClonada.dataset.kcal100 = alimentoOriginal.dataset.kcal100;
    if (alimentoOriginal.dataset.p100) filaClonada.dataset.p100 = alimentoOriginal.dataset.p100;
    if (alimentoOriginal.dataset.c100) filaClonada.dataset.c100 = alimentoOriginal.dataset.c100;
    if (alimentoOriginal.dataset.g100) filaClonada.dataset.g100 = alimentoOriginal.dataset.g100;
    if (alimentoOriginal.dataset.categoria) filaClonada.dataset.categoria = alimentoOriginal.dataset.categoria;

    // Actualizar enlace Cambiar alimento para apuntar a la nueva comida
    const btnCambiar = filaClonada.querySelector(SELECTORES.btnCambiar);
    if (btnCambiar) {
      const queryCliente = (clienteId && clienteId !== '00000000-0000-0000-0000-000000000001')
        ? `&cliente=${encodeURIComponent(clienteId)}`
        : '';
      btnCambiar.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(nuevoNombre)}${queryCliente}&cambiar=1`);
    }

    vincularEventosAlimento(filaClonada);

    if (contenedorAlimentos) {
      contenedorAlimentos.appendChild(filaClonada);
    } else if (btnAnadir && btnAnadir.parentNode) {
      btnAnadir.parentNode.insertBefore(filaClonada, btnAnadir);
    } else {
      const cuerpo = nuevoAcordeon.querySelector('.acordeon__cuerpo') || nuevoAcordeon;
      cuerpo.appendChild(filaClonada);
    }
  });

  // Asegurar botón quitar comida si no existe
  let btnQuitar = nuevoAcordeon.querySelector(SELECTORES.btnQuitarComida);
  if (!btnQuitar) {
    btnQuitar = document.createElement('button');
    btnQuitar.className = 'btn-icono btn-quitar-comida';
    btnQuitar.type = 'button';
    btnQuitar.setAttribute('aria-label', 'Quitar esta comida');
    btnQuitar.setAttribute('title', 'Quitar comida');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icono');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#cerrar');
    svg.appendChild(use);
    btnQuitar.appendChild(svg);

    const filaAcciones = nuevoAcordeon.querySelector('.fila.gap-s') || nuevoAcordeon.querySelector('.acordeon__cabecera, summary');
    const flecha = nuevoAcordeon.querySelector('.acordeon__flecha');
    if (filaAcciones && flecha) {
      filaAcciones.insertBefore(btnQuitar, flecha);
    } else if (filaAcciones) {
      filaAcciones.appendChild(btnQuitar);
    }
  }

  if (btnQuitar) {
    btnQuitar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      if (!nuevoAcordeon.isConnected) return;
      nuevoAcordeon.remove();
      mostrarAvisoFlotante('Comida eliminada del plan.');
      recalcularResumenPlan();
    });
  }

  // Vincular botón duplicar de la nueva comida
  const btnDuplicar = nuevoAcordeon.querySelector(SELECTORES.btnDuplicarComida);
  if (btnDuplicar) {
    btnDuplicar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      duplicarComida(nuevoAcordeon);
    });
  }

  // Marcar como colación/comida serializable y limpiar identificador previo
  if (!nuevoAcordeon.dataset.comida) {
    nuevoAcordeon.dataset.comida = 'colacion';
  }
  delete nuevoAcordeon.dataset.mealId;

  // Insertar inmediatamente después del acordeón original
  if (acordeonOriginal.nextElementSibling) {
    acordeonOriginal.parentNode.insertBefore(nuevoAcordeon, acordeonOriginal.nextElementSibling);
  } else {
    acordeonOriginal.parentNode.appendChild(nuevoAcordeon);
  }

  // Abrir el acordeón duplicado
  nuevoAcordeon.open = true;

  // Recalcular comida y resumen del plan
  recalcularComida(nuevoAcordeon);
  recalcularResumenPlan();

  mostrarAvisoFlotante(`Comida "${nombreOriginal}" duplicada.`);
  return nuevoAcordeon;
}

/**
 * Inicializa los acordeones y alimentos en el editor con datos de referencia si están vacíos.
 */
export function hidratarAlimentosIniciales() {
  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  const clienteActual = extraerClienteId();

  // Precarga opcional de plantilla desde sessionStorage si se accede con ?plantilla= o plantilla seleccionada
  let plantillaActiva = null;
  const params = new URLSearchParams(window.location.search);
  const plantillaId = params.get('plantilla');

  try {
    const rawPlantilla = sessionStorage.getItem('appcalorias_plantilla_seleccionada');
    if (rawPlantilla) {
      const parsed = JSON.parse(rawPlantilla);
      if (parsed && (!plantillaId || parsed.id === plantillaId)) {
        plantillaActiva = parsed;
      }
    }
  } catch {
    // Ignorar error al leer sessionStorage
  }

  acordeones.forEach((acordeon) => {
    const titulo = acordeon.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim();
    if (!titulo) return;

    // Configurar siempre el botón "+ Añadir alimento" antes de verificar si hay filas (soporte vista vacía)
    const btnAnadir = acordeon.querySelector(SELECTORES.btnAnadir);
    if (btnAnadir) {
      const paramCliente = (clienteActual && clienteActual !== '00000000-0000-0000-0000-000000000001')
        ? `&cliente=${encodeURIComponent(clienteActual)}`
        : '';
      btnAnadir.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(titulo)}${paramCliente}`);
    }

    const btnDuplicar = acordeon.querySelector(SELECTORES.btnDuplicarComida);
    if (btnDuplicar && btnDuplicar.dataset.vinculado !== 'true') {
      btnDuplicar.dataset.vinculado = 'true';
      btnDuplicar.addEventListener('click', (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        duplicarComida(acordeon);
      });
    }

    const infoComida = (plantillaActiva && plantillaActiva.comidas && plantillaActiva.comidas[titulo])
      ? plantillaActiva.comidas[titulo]
      : ALIMENTOS_PLAN_DEFECTO[titulo];

    if (!infoComida) return;

    const filaAlimento = acordeon.querySelector(SELECTORES.alimento);
    if (!filaAlimento) return;

    // Guardar referencia por 100g para recálculo dinámico
    const factor = infoComida.gramos > 0 ? (100 / infoComida.gramos) : 1;
    filaAlimento.dataset.kcal100 = String(infoComida.kcal * factor);
    filaAlimento.dataset.p100 = String(infoComida.p * factor);
    filaAlimento.dataset.c100 = String(infoComida.c * factor);
    filaAlimento.dataset.g100 = String(infoComida.g * factor);

    const nombreEl = filaAlimento.querySelector(SELECTORES.alimentoNombre);
    if (nombreEl) {
      if (plantillaActiva || nombreEl.textContent.trim() === 'Alimento' || !nombreEl.textContent.trim()) {
        nombreEl.textContent = infoComida.titulo;
      }
    }

    const inputCant = filaAlimento.querySelector(SELECTORES.alimentoInputCantidad);
    if (inputCant) {
      if (plantillaActiva || !inputCant.value) {
        inputCant.value = String(infoComida.gramos);
      }
    }

    const kcalEl = filaAlimento.querySelector(SELECTORES.alimentoKcal);
    if (kcalEl) {
      if (plantillaActiva || kcalEl.textContent.includes('—')) {
        asignarValorConUnidad(kcalEl, infoComida.kcal, 'kcal');
      }
    }

    const macrosEl = filaAlimento.querySelector(SELECTORES.alimentoMacros);
    if (macrosEl) {
      if (plantillaActiva || macrosEl.textContent.includes('—')) {
        macrosEl.textContent = `P ${infoComida.p} · C ${infoComida.c} · G ${infoComida.g}`;
      }
    }

    const btnCambiar = filaAlimento.querySelector(SELECTORES.btnCambiar);
    if (btnCambiar) {
      btnCambiar.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(titulo)}&cambiar=1`);
    }

    vincularEventosAlimento(filaAlimento);
  });

  if (plantillaActiva) {
    const pautasEl = document.querySelector(SELECTORES.textareaPautas);
    if (pautasEl && !pautasEl.value.trim()) {
      pautasEl.value = `Basado en plantilla: ${plantillaActiva.nombre || plantillaActiva.id}`;
    }
  }
}

export { hidratarAlimentosIniciales as inicializarAcordeones };

/**
 * Procesa el alimento pendiente en sessionStorage ('appcalorias_alimento_editor_pendiente')
 * proveniente de buscar-alimento.html y lo inserta en el acordeón correspondiente.
 * @returns {boolean} true si se insertó un alimento pendiente
 */
export function procesarAlimentoPendienteSession() {
  let raw = null;
  try {
    raw = sessionStorage.getItem('appcalorias_alimento_editor_pendiente');
  } catch {
    return false;
  }

  if (!raw) return false;

  let pendiente;
  try {
    pendiente = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  if (!pendiente || typeof pendiente !== 'object') {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  const comidaBuscada = (pendiente.comida || 'Almuerzo').trim().toLowerCase();
  const acordeones = Array.from(document.querySelectorAll(SELECTORES.acordeon));
  let acordeonDestino = acordeones.find((ac) => {
    const t = ac.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim().toLowerCase();
    return t === comidaBuscada;
  });

  if (!acordeonDestino && /colaci[oó]n/i.test(comidaBuscada)) {
    acordeonDestino = anadirColacion(pendiente.comida);
  }

  if (!acordeonDestino) {
    acordeonDestino = acordeones.find((ac) => ac.querySelector(SELECTORES.acordeonLineaKcal) || ac.querySelector(SELECTORES.btnAnadir));
  }

  if (!acordeonDestino) {
    sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');
    return false;
  }

  const tpl = document.querySelector(SELECTORES.tplAlimentoEditor);
  let nuevoAlimento;

  if (tpl && tpl.content) {
    const clon = tpl.content.cloneNode(true);
    nuevoAlimento = clon.querySelector(SELECTORES.alimento) || clon.firstElementChild;
  } else {
    nuevoAlimento = document.createElement('div');
    nuevoAlimento.className = 'alimento';

    const cabecera = document.createElement('div');
    cabecera.className = 'alimento__cabecera';
    const spanNombre = document.createElement('span');
    spanNombre.className = 'alimento__nombre';
    const linkCambiar = document.createElement('a');
    linkCambiar.className = 'btn-accion';
    linkCambiar.href = 'buscar-alimento.html';
    linkCambiar.setAttribute('aria-label', 'Cambiar alimento');
    const btnQuitar = document.createElement('button');
    btnQuitar.className = 'btn-accion btn-accion--peligro';
    btnQuitar.type = 'button';
    btnQuitar.setAttribute('aria-label', 'Quitar alimento');
    cabecera.append(spanNombre, linkCambiar, btnQuitar);

    const datos = document.createElement('div');
    datos.className = 'alimento__datos';
    const wrapInput = document.createElement('span');
    wrapInput.className = 'input input--derecha';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', 'Cantidad');
    const unidadG = document.createElement('span');
    unidadG.className = 'unidad';
    unidadG.textContent = 'g';
    wrapInput.append(input, unidadG);

    const spanKcal = document.createElement('span');
    spanKcal.className = 'num num--s';
    const spanMacros = document.createElement('span');
    spanMacros.className = 'alimento__macros';
    datos.append(wrapInput, spanKcal, spanMacros);

    nuevoAlimento.append(cabecera, datos);
  }

  nuevoAlimento.dataset.kcal100 = String(aNumeroSeguro(pendiente.kcal100));
  nuevoAlimento.dataset.p100 = String(aNumeroSeguro(pendiente.p100));
  nuevoAlimento.dataset.c100 = String(aNumeroSeguro(pendiente.c100));
  nuevoAlimento.dataset.g100 = String(aNumeroSeguro(pendiente.g100));

  const nombreEl = nuevoAlimento.querySelector(SELECTORES.alimentoNombre);
  if (nombreEl) {
    nombreEl.textContent = pendiente.nombre || 'Alimento';
  }

  const inputCant = nuevoAlimento.querySelector(SELECTORES.alimentoInputCantidad);
  if (inputCant) {
    inputCant.value = String(Math.max(1, aNumeroSeguro(pendiente.gramos || 100)));
  }

  const tituloComida = acordeonDestino.querySelector(SELECTORES.acordeonTitulo)?.textContent?.trim() || pendiente.comida || 'Almuerzo';
  const btnCambiar = nuevoAlimento.querySelector(SELECTORES.btnCambiar);
  if (btnCambiar) {
    btnCambiar.setAttribute('href', `buscar-alimento.html?comida=${encodeURIComponent(tituloComida)}&cambiar=1`);
  }

  const btnAnadir = acordeonDestino.querySelector(SELECTORES.btnAnadir);
  const cuerpo = acordeonDestino.querySelector('.acordeon__cuerpo') || acordeonDestino;
  const contenedorAlimentos = acordeonDestino.querySelector('[data-ref="contenedor-alimentos"]');
  if (contenedorAlimentos) {
    contenedorAlimentos.appendChild(nuevoAlimento);
  } else if (btnAnadir && btnAnadir.parentNode) {
    btnAnadir.parentNode.insertBefore(nuevoAlimento, btnAnadir);
  } else {
    cuerpo.appendChild(nuevoAlimento);
  }

  acordeonDestino.open = true;
  vincularEventosAlimento(nuevoAlimento);

  sessionStorage.removeItem('appcalorias_alimento_editor_pendiente');

  recalcularComida(acordeonDestino);
  recalcularResumenPlan();
  return true;
}

/**
 * Recalcula los macros de un alimento específico en base a los gramos ingresados.
 * @param {HTMLElement} alimentoEl Contenedor del alimento
 * @returns {{kcal: number, p: number, c: number, g: number}}
 */
export function recalcularFilaAlimento(alimentoEl) {
  const inputCant = alimentoEl.querySelector(SELECTORES.alimentoInputCantidad);
  const cantGramos = Math.max(0, aNumeroSeguro(inputCant?.value || 0));

  const p100 = aNumeroSeguro(alimentoEl.dataset.p100 || 0);
  const c100 = aNumeroSeguro(alimentoEl.dataset.c100 || 0);
  const g100 = aNumeroSeguro(alimentoEl.dataset.g100 || 0);

  const factor = cantGramos / 100;
  const pActual = Math.round(p100 * factor);
  const cActual = Math.round(c100 * factor);
  const gActual = Math.round(g100 * factor);

  // Cálculo Atwater puro
  const atwater = calcularAtwater(pActual, cActual, gActual);
  const kcalActual = atwater.kcalCalculadas;

  const kcalEl = alimentoEl.querySelector(SELECTORES.alimentoKcal);
  asignarValorConUnidad(kcalEl, kcalActual, 'kcal');

  const macrosEl = alimentoEl.querySelector(SELECTORES.alimentoMacros);
  if (macrosEl) {
    macrosEl.textContent = `P ${pActual} · C ${cActual} · G ${gActual}`;
  }

  return { kcal: kcalActual, p: pActual, c: cActual, g: gActual };
}

/**
 * Recalcula la cabecera de una comida (acordeón) sumando todos sus alimentos.
 * @param {HTMLElement} acordeonEl
 * @returns {{kcal: number, p: number, c: number, g: number}}
 */
export function recalcularComida(acordeonEl) {
  const alimentos = acordeonEl.querySelectorAll(SELECTORES.alimento);
  let sumaKcal = 0;
  let sumaP = 0;
  let sumaC = 0;
  let sumaG = 0;

  alimentos.forEach((alim) => {
    const res = recalcularFilaAlimento(alim);
    sumaKcal += res.kcal;
    sumaP += res.p;
    sumaC += res.c;
    sumaG += res.g;
  });

  const lineaKcalEl = acordeonEl.querySelector(SELECTORES.acordeonLineaKcal);
  if (lineaKcalEl) {
    lineaKcalEl.textContent = `${sumaKcal} kcal`;
  }

  const lineaMacrosEl = acordeonEl.querySelector(SELECTORES.acordeonLineaMacros);
  if (lineaMacrosEl) {
    lineaMacrosEl.textContent = alimentos.length > 0
      ? `P ${sumaP} · C ${sumaC} · G ${sumaG}`
      : (acordeonEl.dataset.comida === 'colacion' ? '0P · 0C · 0G' : 'Sin alimentos');
  }

  return { kcal: sumaKcal, p: sumaP, c: sumaC, g: sumaG };
}

/**
 * Recalcula el resumen fijo completo del plan (.card--fija).
 * @returns {{totalKcal: number, totalP: number, totalC: number, totalG: number, objetivoKcal: number, dif: number}}
 */
export function recalcularResumenPlan() {
  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  let totalKcal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalG = 0;

  acordeones.forEach((ac) => {
    // Solo procesar acordeones de comidas (que tengan acordeonLineaKcal)
    if (ac.querySelector(SELECTORES.acordeonLineaKcal)) {
      const res = recalcularComida(ac);
      totalKcal += res.kcal;
      totalP += res.p;
      totalC += res.c;
      totalG += res.g;
    }
  });

  // 1. Total Kcal
  const totalKcalEl = document.querySelector(SELECTORES.totalKcal);
  if (totalKcalEl) {
    totalKcalEl.textContent = totalKcal.toLocaleString('es-AR');
  }

  // 2. Objetivo
  const objTexto = document.querySelector(SELECTORES.objetivoTexto)?.textContent || '';
  const matchObj = objTexto.match(/\d+[\d.]*/);
  const objetivoKcal = matchObj ? parseInt(matchObj[0].replace(/\./g, ''), 10) : OBJETIVO_CALORICO_DEFECTO;

  // 3. Tag diferencia
  const dif = objetivoKcal - totalKcal;
  const tagDif = document.querySelector(SELECTORES.tagDiferencia);
  if (tagDif) {
    if (dif > 0) {
      tagDif.className = 'tag tag--naranja';
      tagDif.textContent = `Faltan ${dif} kcal`;
    } else if (dif === 0) {
      tagDif.className = 'tag tag--verde';
      tagDif.textContent = 'Objetivo cumplido';
    } else {
      tagDif.className = 'tag tag--naranja';
      tagDif.textContent = `Exceso de ${Math.abs(dif)} kcal`;
    }
  }

  // 4. Barra de progreso
  const barra = document.querySelector(SELECTORES.barraProgreso);
  if (barra) {
    const porcentaje = objetivoKcal > 0 ? Math.min(100, Math.round((totalKcal / objetivoKcal) * 100)) : 0;
    barra.style.width = `${porcentaje}%`;
  }

  // 5. Macros acumulados
  asignarValorConUnidad(document.querySelector(SELECTORES.macroProteina), totalP, 'g');
  asignarValorConUnidad(document.querySelector(SELECTORES.macroCarbos), totalC, 'g');
  asignarValorConUnidad(document.querySelector(SELECTORES.macroGrasas), totalG, 'g');

  return { totalKcal, totalP, totalC, totalG, objetivoKcal, dif };
}

/**
 * Extrae los datos numéricos y nutricionales de una fila de alimento en el DOM.
 * @param {HTMLElement} filaAlimento
 * @param {number} idx
 * @returns {Object}
 */
export function extraerDatosAlimentoDOM(filaAlimento, idx = 0) {
  const nombreEl = filaAlimento.querySelector(SELECTORES.alimentoNombre);
  const nombre = nombreEl?.textContent?.trim() || 'Alimento';

  const inputCant = filaAlimento.querySelector(SELECTORES.alimentoInputCantidad);
  const gramos = Math.max(0, aNumeroSeguro(inputCant?.value || 0)) || 100;

  let { kcal, p, c, g } = recalcularFilaAlimento(filaAlimento);

  if (kcal === 0 && p === 0 && c === 0 && g === 0) {
    const kcalTexto = filaAlimento.querySelector(SELECTORES.alimentoKcal)?.textContent || '';
    const matchKcal = kcalTexto.match(/\d+/);
    if (matchKcal) kcal = parseInt(matchKcal[0], 10);

    const macrosTexto = filaAlimento.querySelector(SELECTORES.alimentoMacros)?.textContent || '';
    const matchP = macrosTexto.match(/P\s*(\d+)/i);
    const matchC = macrosTexto.match(/C\s*(\d+)/i);
    const matchG = macrosTexto.match(/G\s*(\d+)/i);
    if (matchP) p = parseInt(matchP[1], 10);
    if (matchC) c = parseInt(matchC[1], 10);
    if (matchG) g = parseInt(matchG[1], 10);
  }

  return {
    id: filaAlimento.dataset.itemId || `local-item-${idx}`,
    nombre,
    food_name: nombre,
    gramos,
    grams: gramos,
    porciones: 1,
    portions: 1,
    kcal,
    calories: kcal,
    p,
    protein: p,
    c,
    carbs: c,
    g,
    fat: g,
    categoria: filaAlimento.dataset.categoria || null,
    group_code: filaAlimento.dataset.categoria || null,
    orden: idx,
    sort_order: idx
  };
}

/**
 * Serializa todas las comidas configuradas en el DOM recorriendo cada acordeón que contenga alimentos.
 * @returns {Array<Object>}
 */
export function serializarComidasDOM() {
  const acordeones = document.querySelectorAll(SELECTORES.acordeon);
  const comidas = [];
  let ordenComida = 0;

  acordeones.forEach((acordeon) => {
    const esComida = Boolean(
      acordeon.dataset.comida ||
      acordeon.querySelector(SELECTORES.acordeonLineaKcal) ||
      acordeon.querySelector(SELECTORES.btnAnadir)
    );
    if (!esComida) return;

    const filasAlimento = acordeon.querySelectorAll(SELECTORES.alimento);
    const esColacion = acordeon.dataset.comida === 'colacion' || acordeon.classList.contains('acordeon--colacion');

    if (filasAlimento.length === 0 && !esColacion) return;

    const tituloEl = acordeon.querySelector(SELECTORES.acordeonTitulo) || acordeon.querySelector('[data-ref="titulo"]');
    const nombreComida = tituloEl?.textContent?.trim() || `Comida ${ordenComida + 1}`;

    const notaEl = acordeon.querySelector(SELECTORES.textareaNota);
    const notas = notaEl?.value?.trim() || '';

    const items = [];
    filasAlimento.forEach((fila, idx) => {
      items.push(extraerDatosAlimentoDOM(fila, idx));
    });

    comidas.push({
      id: acordeon.dataset.mealId || `local-meal-${ordenComida}`,
      nombre: nombreComida,
      meal_type: nombreComida,
      notas,
      notes: notas,
      orden: ordenComida,
      sort_order: ordenComida,
      items
    });

    ordenComida += 1;
  });

  return comidas;
}

/**
 * Guarda el plan nutricional en Supabase (o almacén local resiliente), lo activa
 * y redirige al coach a la vista de plan activo con confirmación toast.
 * @param {string|null} [coachId=null]
 * @returns {Promise<{plan: Object, comidas: Array<Object>}>}
 */
export async function guardarYAsignarPlan(coachId = null) {
  const clienteId = extraerClienteId();
  const resumen = recalcularResumenPlan();
  const totalKcal = resumen.totalKcal;
  const totalP = resumen.totalP;
  const totalC = resumen.totalC;
  const totalG = resumen.totalG;

  const textareaPautasEl = document.querySelector(SELECTORES.textareaPautas);
  const pautas = textareaPautasEl?.value?.trim() || '';

  const comidas = serializarComidasDOM();

  let planGuardado = null;
  try {
    const res = await crearPlan(
      clienteId,
      coachId,
      {
        name: 'Plan Nutricional',
        target_calories: totalKcal,
        target_protein_g: totalP,
        target_carbs_g: totalC,
        target_fat_g: totalG,
        notes: pautas
      },
      comidas
    );
    if (res && res.plan) {
      planGuardado = res.plan;
    }
  } catch (errCrear) {
    console.warn('Excepción al crear plan en planes-api:', errCrear);
  }

  if (planGuardado && planGuardado.id) {
    try {
      await activarPlan(planGuardado.id, clienteId);
    } catch (errActivar) {
      console.warn('Error al activar plan en planes-api:', errActivar);
    }
  } else {
    // Plan local de contingencia offline
    planGuardado = {
      id: `local-plan-${Date.now()}`,
      alumno_id: clienteId,
      coach_id: coachId,
      name: 'Plan Nutricional',
      target_calories: totalKcal,
      target_protein_g: totalP,
      target_carbs_g: totalC,
      target_fat_g: totalG,
      notes: pautas,
      active: true,
      created_at: new Date().toISOString()
    };
  }

  // Guardar en sessionStorage como fallback resiliente offline
  const datosNormalizados = {
    plan: planGuardado,
    comidas
  };

  try {
    sessionStorage.setItem(`appcalorias_plan_activo_${clienteId}`, JSON.stringify(datosNormalizados));
  } catch (errStorage) {
    console.warn('No se pudo guardar appcalorias_plan_activo en sessionStorage:', errStorage);
  }

  guardarAvisoToast('Plan guardado y asignado con éxito.');
  window.location.href = `plan-activo.html?cliente=${encodeURIComponent(clienteId)}`;
  return { plan: planGuardado, comidas };
}

/**
 * Inicializa el controlador del editor de planes.
 */
export async function iniciarPlanEditor() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const clienteId = extraerClienteId();
  if (clienteId && clienteId !== '00000000-0000-0000-0000-000000000001') {
    // Propagar clienteId a enlaces de volver o cancelar si no lo tienen
    const enlacesVolver = document.querySelectorAll('.encabezado a.btn-icono[aria-label="Volver"], [data-volver]');
    enlacesVolver.forEach((enlace) => {
      const href = enlace.getAttribute('href');
      if (href && !href.includes('cliente=')) {
        const sep = href.includes('?') ? '&' : '?';
        enlace.setAttribute('href', `${href}${sep}cliente=${encodeURIComponent(clienteId)}`);
      }
    });
  }

  hidratarAlimentosIniciales();
  procesarAlimentoPendienteSession();
  recalcularResumenPlan();

  // Escuchar cambios reactivos en inputs de gramos (delegación de respaldo)
  document.addEventListener('input', (evento) => {
    if (evento.target.closest(SELECTORES.alimentoInputCantidad)) {
      recalcularResumenPlan();
    }
  });

  // Manejar eliminación de alimentos (delegación de respaldo)
  document.addEventListener('click', (evento) => {
    const btnQuitar = evento.target.closest(SELECTORES.btnQuitar);
    if (!btnQuitar) return;

    const filaAlimento = btnQuitar.closest(SELECTORES.alimento);
    if (filaAlimento && filaAlimento.isConnected) {
      filaAlimento.remove();
      mostrarAvisoFlotante('Alimento quitado de la comida.');
      recalcularResumenPlan();
    }
  });

  // Evento interactivo para Añadir colación / comida extra
  const btnAnadirColacion = document.querySelector(SELECTORES.btnAnadirColacion);
  if (btnAnadirColacion) {
    btnAnadirColacion.addEventListener('click', (evento) => {
      evento.preventDefault();
      anadirColacion();
    });
  }

  // Delegación de eventos para eliminación de comidas (colaciones)
  document.addEventListener('click', (evento) => {
    const btnQuitarComida = evento.target.closest(SELECTORES.btnQuitarComida);
    if (!btnQuitarComida) return;

    evento.preventDefault();
    evento.stopPropagation();
    const acordeon = btnQuitarComida.closest(SELECTORES.acordeon);
    if (acordeon && acordeon.isConnected) {
      acordeon.remove();
      mostrarAvisoFlotante('Comida eliminada del plan.');
      recalcularResumenPlan();
    }
  });

  // Delegación de eventos para duplicación de comidas
  document.addEventListener('click', (evento) => {
    const btnDuplicar = evento.target.closest(SELECTORES.btnDuplicarComida);
    if (!btnDuplicar) return;

    evento.preventDefault();
    evento.stopPropagation();
    const acordeon = btnDuplicar.closest(SELECTORES.acordeon);
    if (acordeon) {
      duplicarComida(acordeon);
    }
  });

  // Confirmación al guardar y asignar plan con persistencia real
  const btnGuardar = document.querySelector(SELECTORES.btnGuardar);
  if (btnGuardar) {
    btnGuardar.addEventListener('click', async (evento) => {
      evento.preventDefault();
      if (btnGuardar.getAttribute('aria-busy') === 'true') return;
      btnGuardar.setAttribute('aria-busy', 'true');

      try {
        await guardarYAsignarPlan(cuenta.usuarioId);
      } catch (err) {
        console.error('Error al guardar y asignar el plan:', err);
        mostrarAvisoFlotante('Ocurrió un error al guardar el plan.');
        btnGuardar.removeAttribute('aria-busy');
      }
    });
  }
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlanEditor);
} else {
  iniciarPlanEditor();
}
