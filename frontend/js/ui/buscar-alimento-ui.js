/* ==========================================================
   buscar-alimento-ui.js — Controlador UI del Buscador de Alimentos para Coach (buscar-alimento.html)
   - Búsqueda interactiva y filtrado por categoría (proteínas, cereales, lácteos, grasas, frutas/verduras).
   - Motor de búsqueda local con catálogo curado (alimentos-locales.js).
   - Preparado para integración RPC Supabase (buscar_alimentos) con fallback local.
   - Selección dinámica de alimento con recálculo en tiempo real de aporte calórico según gramos.
   - Control de acceso por rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { buscarAlimentosLocales, ALIMENTOS_BASE } from '../data/alimentos-locales.js';
import { calcularAtwater, aNumeroSeguro } from '../calc/nutricion-calc.js';
import { guardarAvisoToast, mostrarAvisoFlotante } from '../utils/navegacion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para buscar-alimento.html.
 */
export const SELECTORES = {
  hoja: '.hoja',
  tagComida: '.hoja__cabecera .tag',
  btnCerrar: '.hoja__cabecera a[aria-label="Cerrar"]',
  inputBuscar: 'input[name="buscar"]',
  chipsCategoria: '.chips .chip',
  pestanasOrigen: '.pestanas [role="tab"]',
  hojaLista: '.hoja__lista',
  estadoVacio: '.hoja__lista .vacio',
  opcionAlimento: '.hoja__lista .opcion',
  tplOpcionAlimento: '#tpl-opcion-alimento',
  pie: '.hoja__pie',
  pieNombre: '.hoja__pie .fila .crece.columna .negrita',
  pieMacros: '.hoja__pie .fila .crece.columna .sub',
  inputCantidad: '.hoja__pie input[name="cantidad"]',
  btnCancelar: '.hoja__pie [data-volver], .hoja__pie .btn--secundario',
  btnAgregar: '.hoja__pie .btn--primario'
};

/**
 * Mapeo de nombres de botones chip a identificadores de categoría en el catálogo.
 */
const MAPA_CATEGORIAS = {
  'todos': null,
  'proteínas': 'proteina',
  'proteinas': 'proteina',
  'cereales': 'cereal',
  'lácteos': 'lacteo',
  'lacteos': 'lacteo',
  'grasas': 'grasa',
  'frutas y verduras': 'fruta_verdura'
};

let alimentoSeleccionado = null;
let categoriaActiva = null;

/**
 * Stub para consulta RPC de alimentos en base remota con fallback a catálogo local.
 * @param {string} termino Texto ingresado por el usuario
 * @param {string|null} categoria Categoría activa seleccionada
 * @returns {Promise<Array<Object>>}
 */
export async function buscarAlimentosRPC(termino, categoria = null) {
  // Stub: búsqueda local optimizada con catálogo curado
  const query = (termino || '').trim();
  let resultados = query ? buscarAlimentosLocales(query) : ALIMENTOS_BASE.slice(0, 20);

  if (categoria) {
    resultados = resultados.filter((item) => {
      if (categoria === 'fruta_verdura') {
        return item.categoria === 'fruta' || item.categoria === 'verdura';
      }
      return item.categoria === categoria;
    });
  }

  return resultados;
}

/**
 * Actualiza el panel inferior del pie con los cálculos de nutrientes del alimento elegido.
 */
export function actualizarPieSeleccion() {
  const nombreEl = document.querySelector(SELECTORES.pieNombre);
  const macrosEl = document.querySelector(SELECTORES.pieMacros);
  const inputCant = document.querySelector(SELECTORES.inputCantidad);
  const btnAgregar = document.querySelector(SELECTORES.btnAgregar);

  if (!alimentoSeleccionado) {
    if (nombreEl) nombreEl.textContent = 'Ningún alimento elegido';
    if (macrosEl) macrosEl.textContent = '— kcal · P — · C — · G —';
    if (inputCant) inputCant.value = '';
    return;
  }

  if (nombreEl) nombreEl.textContent = alimentoSeleccionado.nombre;

  const gramos = Math.max(0, aNumeroSeguro(inputCant?.value || 100));
  const factor = gramos / 100;
  const pActual = Math.round(alimentoSeleccionado.proteinas * factor);
  const cActual = Math.round(alimentoSeleccionado.carbohidratos * factor);
  const gActual = Math.round(alimentoSeleccionado.grasas * factor);
  const atwater = calcularAtwater(pActual, cActual, gActual);

  if (macrosEl) {
    macrosEl.textContent = `${atwater.kcalCalculadas} kcal · P ${pActual} · C ${cActual} · G ${gActual}`;
  }

  if (btnAgregar) {
    btnAgregar.dataset.alimento = alimentoSeleccionado.nombre;
    btnAgregar.dataset.gramos = String(gramos);
    btnAgregar.dataset.kcal = String(atwater.kcalCalculadas);
  }
}

/**
 * Renderiza la lista de resultados en la hoja modal clonando #tpl-opcion-alimento (Regla 1, sin DOM-XSS).
 * @param {Array<Object>} alimentos
 */
export function renderizarResultados(alimentos) {
  const contenedorLista = document.querySelector(SELECTORES.hojaLista);
  if (!contenedorLista) return;

  if (!alimentos || alimentos.length === 0) {
    const seccionVacio = document.createElement('section');
    seccionVacio.className = 'vacio';

    const spanIcono = document.createElement('span');
    spanIcono.className = 'vacio__icono';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icono');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#buscar');
    svg.appendChild(use);
    spanIcono.appendChild(svg);

    const h2 = document.createElement('h2');
    h2.className = 'titulo';
    h2.textContent = 'Sin coincidencias';

    const p = document.createElement('p');
    p.className = 'sub texto-14';
    p.textContent = 'Probá buscando con otro nombre o seleccionando otra categoría.';

    seccionVacio.append(spanIcono, h2, p);
    contenedorLista.replaceChildren(seccionVacio);
    return;
  }

  const tpl = document.querySelector(SELECTORES.tplOpcionAlimento);
  const fragmento = document.createDocumentFragment();

  alimentos.forEach((alim) => {
    const esActivo = alimentoSeleccionado && alimentoSeleccionado.id === alim.id;
    let btn;

    if (tpl && tpl.content) {
      const clon = tpl.content.cloneNode(true);
      btn = clon.querySelector('.opcion') || clon.firstElementChild;
    } else {
      btn = document.createElement('button');
      btn.className = 'opcion';
      btn.type = 'button';
      btn.setAttribute('role', 'option');

      const spanTextos = document.createElement('span');
      spanTextos.className = 'opcion__textos';
      const spanNombre = document.createElement('span');
      spanNombre.className = 'negrita texto-15';
      const spanSub = document.createElement('span');
      spanSub.className = 'sub';
      spanTextos.append(spanNombre, spanSub);

      const spanNum = document.createElement('span');
      spanNum.className = 'num num--s';

      btn.append(spanTextos, spanNum);
    }

    btn.setAttribute('aria-selected', esActivo ? 'true' : 'false');
    btn.dataset.id = alim.id;

    const nombreEl = btn.querySelector('.negrita');
    if (nombreEl) {
      nombreEl.textContent = alim.nombre;
    }

    const subEl = btn.querySelector('.sub');
    if (subEl) {
      subEl.textContent = `Cada 100 g: P ${Math.round(alim.proteinas)} · C ${Math.round(alim.carbohidratos)} · G ${Math.round(alim.grasas)}`;
    }

    const numEl = btn.querySelector('.num');
    if (numEl) {
      numEl.textContent = `${alim.kcal} `;
      const spanUnidad = document.createElement('span');
      spanUnidad.className = 'unidad';
      spanUnidad.textContent = 'kcal';
      numEl.appendChild(spanUnidad);
    }

    fragmento.appendChild(btn);
  });

  contenedorLista.replaceChildren(fragmento);

  // Registrar listeners de selección en cada opción renderizada
  contenedorLista.querySelectorAll(SELECTORES.opcionAlimento).forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const seleccionado = ALIMENTOS_BASE.find((a) => a.id === id);
      if (seleccionado) {
        alimentoSeleccionado = seleccionado;
        const inputCant = document.querySelector(SELECTORES.inputCantidad);
        if (inputCant && (!inputCant.value || inputCant.value === '—')) {
          inputCant.value = seleccionado.pesoUnitarioG ? String(seleccionado.pesoUnitarioG) : '100';
        }
        // Actualizar estado visual aria-selected
        contenedorLista.querySelectorAll(SELECTORES.opcionAlimento).forEach((op) => {
          op.setAttribute('aria-selected', op === btn ? 'true' : 'false');
        });
        actualizarPieSeleccion();
      }
    });
  });
}

/**
 * Ejecuta la búsqueda aplicando filtros de texto y categoría.
 */
export async function ejecutarBusqueda() {
  const inputBuscar = document.querySelector(SELECTORES.inputBuscar);
  const termino = inputBuscar?.value?.trim() || '';
  const resultados = await buscarAlimentosRPC(termino, categoriaActiva);
  renderizarResultados(resultados);
}

/**
 * Inicializa el controlador del buscador de alimentos.
 */
export async function iniciarBuscarAlimento() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  // Configurar tag de comida según parámetros de URL
  const params = new URLSearchParams(window.location.search);
  const comidaParam = params.get('comida');
  if (comidaParam) {
    const tagEl = document.querySelector(SELECTORES.tagComida);
    if (tagEl) tagEl.textContent = comidaParam;
  }

  // Escuchar entrada en input buscador
  const inputBuscar = document.querySelector(SELECTORES.inputBuscar);
  if (inputBuscar) {
    inputBuscar.addEventListener('input', () => {
      ejecutarBusqueda();
    });
  }

  // Escuchar filtros por chips de categorías
  const chips = document.querySelectorAll(SELECTORES.chipsCategoria);
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const texto = chip.textContent.trim().toLowerCase();
      categoriaActiva = MAPA_CATEGORIAS[texto] || null;
      ejecutarBusqueda();
    });
  });

  // Escuchar cambios de cantidad en el pie
  const inputCantidad = document.querySelector(SELECTORES.inputCantidad);
  if (inputCantidad) {
    inputCantidad.addEventListener('input', () => {
      actualizarPieSeleccion();
    });
  }

  // Confirmar alimento y retornar a plan-editor.html
  const btnAgregar = document.querySelector(SELECTORES.btnAgregar);
  if (btnAgregar) {
    btnAgregar.addEventListener('click', (evento) => {
      if (!alimentoSeleccionado) {
        evento.preventDefault();
        mostrarAvisoFlotante('Elegí un alimento de la lista para continuar.');
        return;
      }

      const tagEl = document.querySelector(SELECTORES.tagComida);
      const comidaDestino = (comidaParam || tagEl?.textContent || 'Almuerzo').trim();
      const gramos = Math.max(1, aNumeroSeguro(inputCantidad?.value || 100));
      const payload = {
        id: alimentoSeleccionado.id,
        nombre: alimentoSeleccionado.nombre,
        gramos,
        comida: comidaDestino,
        cambiar: params.get('cambiar') === '1',
        kcal100: aNumeroSeguro(alimentoSeleccionado.kcal),
        p100: aNumeroSeguro(alimentoSeleccionado.proteinas),
        c100: aNumeroSeguro(alimentoSeleccionado.carbohidratos),
        g100: aNumeroSeguro(alimentoSeleccionado.grasas)
      };

      try {
        sessionStorage.setItem('appcalorias_alimento_editor_pendiente', JSON.stringify(payload));
      } catch {
        // Fallback silencioso si sessionStorage no está disponible
      }

      guardarAvisoToast(`"${alimentoSeleccionado.nombre}" agregado a la comida.`);
    });
  }

  // Ejecutar búsqueda inicial para mostrar catálogo curado
  ejecutarBusqueda();
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarBuscarAlimento);
} else {
  iniciarBuscarAlimento();
}
