/* ==========================================================
   buscar-alimento-ui.js — Controlador UI del Buscador de Alimentos para Coach (buscar-alimento.html)
   - Búsqueda interactiva y filtrado por categoría (proteínas, cereales, lácteos, grasas, frutas/verduras).
   - Motor híbrido: RPC Supabase (buscar_alimentos / alimentos-api.js) con fallback resiliente al catálogo local.
   - Pestañas de origen accesibles (Frecuentes, Mis alimentos, Base de datos general) con aria-selected.
   - Búsqueda con debounce de 300 ms en inputBuscar para optimizar consultas RPC.
   - Normalización unificada de alimentos (calorias, proteinas, carbohidratos, grasas, porciones, porcion_gr).
   - Regla de Oro 1: Cero innerHTML con datos variables.
   - Regla de Oro 2: Alternancia accesible con atributo hidden entre #lista-alimentos y .vacio.
   - Control de acceso por rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { buscarAlimentosLocales, ALIMENTOS_BASE } from '../data/alimentos-locales.js';
import { buscarAlimentos } from '../data/alimentos-api.js';
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
  listaAlimentos: '#lista-alimentos',
  estadoVacio: '.hoja__lista .vacio',
  opcionAlimento: '.hoja__lista .opcion, #lista-alimentos .opcion',
  tplOpcionAlimento: '#tpl-opcion-alimento',
  pie: '.hoja__pie',
  pieNombre: '.hoja__pie .fila .crece.columna .negrita',
  pieMacros: '.hoja__pie .fila .crece.columna .sub',
  inputCantidad: '.hoja__pie input[name="cantidad"]',
  btnCancelar: '.hoja__pie [data-volver], .hoja__pie .btn--secundario',
  btnAgregar: '.hoja__pie .btn--primario'
};

/**
 * Mapeo de nombres de botones chip a identificadores de categoría en el catálogo local.
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

/**
 * Mapeo de categorías locales a códigos de categoría oficiales en Supabase.
 */
const MAPA_CATEGORIAS_DB = {
  'proteina': 'carnes',
  'cereal': 'cereales',
  'lacteo': 'lacteos',
  'grasa': 'grasas',
  'fruta_verdura': null
};

let alimentoSeleccionado = null;
let categoriaActiva = null;
let origenActivo = 'frecuentes';
let debounceTimer = null;
let ultimosResultados = [];

/**
 * Normaliza un registro de alimento (local o remoto) para garantizar uniformidad de propiedades en la UI.
 * Expone: nombre, categoria, calorias, proteinas, carbohidratos, grasas, porciones, porcion_gr,
 * junto con id, kcal y pesoUnitarioG para interoperabilidad completa.
 * @param {Object} item
 * @returns {Object}
 */
export function normalizarResultadoAlimento(item) {
  if (!item || typeof item !== 'object') return null;

  const idSeguro = item.id || `alim-${String(item.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Math.random().toString(36).slice(2, 9)}`;
  const nombreSeguro = String(item.nombre || 'Alimento sin nombre').trim();
  const catSegura = String(item.categoria || 'general').trim();

  const caloriasNum = Number(item.calorias ?? item.kcal ?? 0) || 0;
  const pNum = Number(item.proteinas ?? item.p ?? 0) || 0;
  const cNum = Number(item.carbohidratos ?? item.c ?? 0) || 0;
  const gNum = Number(item.grasas ?? item.g ?? 0) || 0;
  const fibraNum = Number(item.fibra ?? 0) || 0;
  const sodioNum = Number(item.sodio ?? 0) || 0;

  const porcionGrNum = item.porcion_gr != null
    ? Number(item.porcion_gr)
    : (item.porcion_g != null
      ? Number(item.porcion_g)
      : (item.unidad_g != null
        ? Number(item.unidad_g)
        : (item.pesoUnitarioG != null ? Number(item.pesoUnitarioG) : 100)));

  const porcionesTexto = item.porciones
    || item.porcion_desc
    || item.porcion_texto
    || (porcionGrNum ? `1 porción (${porcionGrNum} g)` : '1 porción (100 g)');

  return {
    id: idSeguro,
    nombre: nombreSeguro,
    categoria: catSegura,
    calorias: caloriasNum,
    kcal: caloriasNum,
    proteinas: pNum,
    carbohidratos: cNum,
    grasas: gNum,
    fibra: fibraNum,
    sodio: sodioNum,
    porciones: porcionesTexto,
    porcion_gr: porcionGrNum || 100,
    porcion_g: porcionGrNum || 100,
    pesoUnitarioG: item.pesoUnitarioG != null ? Number(item.pesoUnitarioG) : (porcionGrNum || 100),
    palabrasClave: Array.isArray(item.palabrasClave) ? item.palabrasClave : (Array.isArray(item.sinonimos) ? item.sinonimos : [])
  };
}

/**
 * Evalúa si un alimento coincide con la categoría solicitada (tolerante a categorías locales y de Supabase).
 * @param {Object} item
 * @param {string|null} cat
 * @returns {boolean}
 */
function coincideCategoria(item, cat) {
  if (!cat || cat === 'todos') return true;
  const itemCat = String(item.categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const catNorm = String(cat).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (catNorm === 'proteina') {
    return ['proteina', 'carnes', 'pescados', 'huevos', 'legumbres'].includes(itemCat);
  }
  if (catNorm === 'cereal') {
    return ['cereal', 'cereales'].includes(itemCat);
  }
  if (catNorm === 'lacteo') {
    return ['lacteo', 'lacteos'].includes(itemCat);
  }
  if (catNorm === 'grasa') {
    return ['grasa', 'grasas'].includes(itemCat);
  }
  if (catNorm === 'fruta_verdura') {
    return ['fruta', 'frutas', 'verdura', 'verduras', 'vegetal', 'vegetales'].includes(itemCat);
  }
  return itemCat === catNorm;
}

/**
 * Filtra un conjunto de alimentos por la categoría dada.
 * @param {Array<Object>} lista
 * @param {string|null} cat
 * @returns {Array<Object>}
 */
function filtrarPorCategoria(lista, cat) {
  if (!cat || !Array.isArray(lista)) return lista || [];
  return lista.filter((it) => coincideCategoria(it, cat));
}

/**
 * Obtiene alimentos personalizados creados por el usuario almacenados en sessionStorage.
 * @returns {Array<Object>}
 */
function obtenerAlimentosPropios() {
  try {
    const raw = sessionStorage.getItem('appcalorias_mis_alimentos')
      || sessionStorage.getItem('mis_alimentos')
      || sessionStorage.getItem('alimentos_creados');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback silencioso si no hay soporte de storage
  }
  return [];
}

/**
 * Normaliza la clave de origen seleccionada.
 * @param {string} origen
 * @returns {'frecuentes'|'mis_alimentos'|'general'}
 */
function normalizarOrigen(origen) {
  if (!origen) return 'frecuentes';
  const o = String(origen).toLowerCase().trim();
  if (o.includes('general') || o.includes('base')) return 'general';
  if (o.includes('mis') || o.includes('propios')) return 'mis_alimentos';
  return 'frecuentes';
}

/**
 * Determina el identificador de origen según el elemento de pestaña pulsado.
 * @param {Element} tab
 * @returns {'frecuentes'|'mis_alimentos'|'general'}
 */
function determinarOrigenDesdeElemento(tab) {
  const texto = (tab?.textContent || '').toLowerCase().trim();
  if (texto.includes('general') || texto.includes('base')) return 'general';
  if (texto.includes('mis') || texto.includes('propios')) return 'mis_alimentos';
  return 'frecuentes';
}

/**
 * Consulta de alimentos en Supabase vía buscarAlimentos con fallback automático a catálogo local o propios.
 * - Si origen === 'frecuentes': consulta catálogo local y filtra por categoría activa.
 * - Si origen === 'general' o si el término de búsqueda tiene >= 2 caracteres:
 *   invoca buscarAlimentos de alimentos-api.js, normaliza los resultados y ante fallos
 *   utiliza fallback transparente a buscarAlimentosLocales.
 * @param {string} termino Texto ingresado por el usuario
 * @param {string|null} categoria Categoría activa seleccionada
 * @param {string} [origen='frecuentes'] Pestaña de origen ('frecuentes', 'mis_alimentos', 'general')
 * @returns {Promise<Array<Object>>} Lista de alimentos normalizados
 */
export async function buscarAlimentosRPC(termino, categoria = null, origen = 'frecuentes') {
  const query = (termino || '').trim();
  const origenNormalizado = normalizarOrigen(origen);
  const categoriaDb = categoria ? (MAPA_CATEGORIAS_DB[categoria] || (categoria === 'fruta_verdura' ? null : categoria)) : null;

  // Si origen === 'frecuentes' y el usuario no ha ingresado al menos 2 caracteres
  if (origenNormalizado === 'frecuentes' && query.length < 2) {
    const locales = query ? buscarAlimentosLocales(query) : ALIMENTOS_BASE.slice(0, 20);
    const filtrados = categoria ? filtrarPorCategoria(locales, categoria) : locales;
    return filtrados.map(normalizarResultadoAlimento);
  }

  // Si origen === 'mis_alimentos' y query < 2
  if (origenNormalizado === 'mis_alimentos' && query.length < 2) {
    const propios = obtenerAlimentosPropios();
    const filtrados = categoria ? filtrarPorCategoria(propios, categoria) : propios;
    return filtrados.map(normalizarResultadoAlimento);
  }

  // Si origen === 'general' o si el usuario tipea una búsqueda con >= 2 caracteres:
  if (origenNormalizado === 'general' || query.length >= 2) {
    try {
      const remotos = await buscarAlimentos(query, categoriaDb);
      if (Array.isArray(remotos) && remotos.length > 0) {
        let normalizados = remotos.map(normalizarResultadoAlimento);
        if (categoria) {
          normalizados = normalizados.filter((item) => coincideCategoria(item, categoria));
        }
        if (normalizados.length > 0) {
          return normalizados;
        }
      }

      // Si la consulta remota no trajo resultados o vino vacía: fallback local
      const locales = query ? buscarAlimentosLocales(query) : ALIMENTOS_BASE.slice(0, 20);
      const filtrados = categoria ? filtrarPorCategoria(locales, categoria) : locales;
      return filtrados.map(normalizarResultadoAlimento);
    } catch (err) {
      console.warn('Fallback a catálogo local por fallo en búsqueda remota:', err);
      const locales = query ? buscarAlimentosLocales(query) : ALIMENTOS_BASE.slice(0, 20);
      const filtrados = categoria ? filtrarPorCategoria(locales, categoria) : locales;
      return filtrados.map(normalizarResultadoAlimento);
    }
  }

  // Fallback por defecto a catálogo local
  const locales = query ? buscarAlimentosLocales(query) : ALIMENTOS_BASE.slice(0, 20);
  const filtrados = categoria ? filtrarPorCategoria(locales, categoria) : locales;
  return filtrados.map(normalizarResultadoAlimento);
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
  const pBase = aNumeroSeguro(alimentoSeleccionado.proteinas);
  const cBase = aNumeroSeguro(alimentoSeleccionado.carbohidratos);
  const gBase = aNumeroSeguro(alimentoSeleccionado.grasas);

  const pActual = Math.round(pBase * factor);
  const cActual = Math.round(cBase * factor);
  const gActual = Math.round(gBase * factor);
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
 * Renderiza la lista de resultados en la hoja modal clonando #tpl-opcion-alimento (Regla 1 y Regla 2).
 * Alterna de forma accesible la visibilidad entre #lista-alimentos y .vacio usando hidden.
 * @param {Array<Object>} alimentos
 */
export function renderizarResultados(alimentos) {
  ultimosResultados = Array.isArray(alimentos) ? alimentos : [];

  const listaAlimentos = document.querySelector(SELECTORES.listaAlimentos) || document.querySelector(SELECTORES.hojaLista);
  const estadoVacio = document.querySelector(SELECTORES.estadoVacio);

  if (!listaAlimentos) return;

  if (!alimentos || alimentos.length === 0) {
    listaAlimentos.replaceChildren();
    listaAlimentos.hidden = true;
    if (estadoVacio) {
      estadoVacio.hidden = false;
    }
    return;
  }

  if (estadoVacio) {
    estadoVacio.hidden = true;
  }
  listaAlimentos.hidden = false;

  const tpl = document.querySelector(SELECTORES.tplOpcionAlimento);
  const fragmento = document.createDocumentFragment();

  alimentos.forEach((alim) => {
    const esActivo = alimentoSeleccionado && String(alimentoSeleccionado.id) === String(alim.id);
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
    btn.dataset.id = String(alim.id);

    const nombreEl = btn.querySelector('.negrita');
    if (nombreEl) {
      nombreEl.textContent = alim.nombre;
    }

    const subEl = btn.querySelector('.sub');
    if (subEl) {
      const pVal = Math.round(alim.proteinas);
      const cVal = Math.round(alim.carbohidratos);
      const gVal = Math.round(alim.grasas);
      subEl.textContent = `Cada 100 g: P ${pVal} · C ${cVal} · G ${gVal}`;
    }

    const numEl = btn.querySelector('.num');
    if (numEl) {
      numEl.replaceChildren();
      const kcalVal = alim.calorias ?? alim.kcal ?? 0;
      const textoKcal = document.createTextNode(`${kcalVal} `);
      const spanUnidad = document.createElement('span');
      spanUnidad.className = 'unidad';
      spanUnidad.textContent = 'kcal';
      numEl.append(textoKcal, spanUnidad);
    }

    fragmento.appendChild(btn);
  });

  listaAlimentos.replaceChildren(fragmento);

  // Registrar listeners de selección en cada opción renderizada
  listaAlimentos.querySelectorAll('.opcion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const seleccionado = ultimosResultados.find((a) => String(a.id) === String(id))
        || ALIMENTOS_BASE.find((a) => String(a.id) === String(id));

      if (seleccionado) {
        alimentoSeleccionado = seleccionado;
        const inputCant = document.querySelector(SELECTORES.inputCantidad);
        if (inputCant && (!inputCant.value || inputCant.value === '—')) {
          const porcion = seleccionado.porcion_gr || seleccionado.porcion_g || seleccionado.pesoUnitarioG || 100;
          inputCant.value = String(porcion);
        }
        // Actualizar estado visual aria-selected
        listaAlimentos.querySelectorAll('.opcion').forEach((op) => {
          op.setAttribute('aria-selected', op === btn ? 'true' : 'false');
        });
        actualizarPieSeleccion();
      }
    });
  });
}

/**
 * Ejecuta la búsqueda aplicando filtros de texto, categoría y origen.
 * @returns {Promise<Array<Object>>}
 */
export async function ejecutarBusqueda() {
  const inputBuscar = document.querySelector(SELECTORES.inputBuscar);
  const termino = inputBuscar?.value?.trim() || '';
  const resultados = await buscarAlimentosRPC(termino, categoriaActiva, origenActivo);
  renderizarResultados(resultados);
  return resultados;
}

/**
 * Funciones de consulta y asignación de estado interno para interoperabilidad y testing.
 */
export function obtenerAlimentoSeleccionado() {
  return alimentoSeleccionado;
}

export function fijarAlimentoSeleccionado(alimento) {
  alimentoSeleccionado = alimento;
}

export function obtenerOrigenActivo() {
  return origenActivo;
}

export function fijarOrigenActivo(origen) {
  origenActivo = normalizarOrigen(origen);
}

export function obtenerCategoriaActiva() {
  return categoriaActiva;
}

export function fijarCategoriaActiva(cat) {
  categoriaActiva = cat;
}

export function obtenerUltimosResultados() {
  return ultimosResultados;
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

  // Escuchar entrada en input buscador con debounce de 300 ms
  const inputBuscar = document.querySelector(SELECTORES.inputBuscar);
  if (inputBuscar) {
    inputBuscar.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        ejecutarBusqueda();
      }, 300);
    });

    inputBuscar.addEventListener('search', () => {
      clearTimeout(debounceTimer);
      ejecutarBusqueda();
    });
  }

  // Escuchar pestañas de origen (Frecuentes, Mis alimentos, Base de datos general)
  const pestanas = document.querySelectorAll(SELECTORES.pestanasOrigen);
  pestanas.forEach((tab) => {
    tab.addEventListener('click', () => {
      pestanas.forEach((t) => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
      origenActivo = determinarOrigenDesdeElemento(tab);
      ejecutarBusqueda();
    });
  });

  // Escuchar filtros por chips de categorías
  const chips = document.querySelectorAll(SELECTORES.chipsCategoria);
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
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
        kcal100: aNumeroSeguro(alimentoSeleccionado.calorias ?? alimentoSeleccionado.kcal),
        p100: aNumeroSeguro(alimentoSeleccionado.proteinas),
        c100: aNumeroSeguro(alimentoSeleccionado.carbohidratos),
        g100: aNumeroSeguro(alimentoSeleccionado.grasas),
        categoria: alimentoSeleccionado.categoria || null
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
