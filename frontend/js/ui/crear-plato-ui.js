/* ==========================================================
   crear-plato-ui.js — Controlador UI para la Creación de Platos Compuestos
   - Lee y gestiona el borrador de ingredientes en sessionStorage.
   - Recalcula en caliente los macronutrientes usando la fórmula de Atwater (4P + 4C + 9G).
   - Alternancia semántica con atributo hidden sobre bloques .vacio y listas (Regla de Oro 2).
   - Cero innerHTML en manipulación del DOM (Regla de Oro 1).
   - Persiste en sessionStorage ('appcalorias_mis_platos') y sincroniza con Supabase.
   - Desacople completo mediante el mapa centralizado SELECTORES.
   ========================================================== */

import { calcularAtwater } from '../calc/nutricion-calc.js';
import { mostrarAvisoFlotante, guardarAvisoToast } from '../utils/navegacion.js';
import { crearAlimento } from '../data/alimentos-api.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para crear-plato.html.
 */
export const SELECTORES = {
  form: '#form-crear-plato',
  inputNombre: '#plato-nombre',
  selectCategoria: '#plato-categoria',
  listaIngredientes: '#lista-ingredientes-plato',
  estadoVacio: '#estado-vacio-ingredientes',
  btnAgregarIngrediente: '#btn-agregar-ingrediente',
  tarjetaResumen: '#tarjeta-resumen-plato',
  totalKcal: '#total-kcal',
  totalP: '#total-p',
  totalC: '#total-c',
  totalG: '#total-g',
  resumenPesoTotal: '#resumen-peso-total',
  resumenPor100g: '#resumen-por-100g',
  btnGuardarPlato: '#btn-guardar-plato',
  tplIngrediente: '#tpl-ingrediente-plato',
  enlaceVolver: 'header a[aria-label="Volver"]'
};

const CLAVE_BORRADOR = 'appcalorias_ingredientes_plato_borrador';
const CLAVE_MIS_PLATOS = 'appcalorias_mis_platos';

let ingredientesActuales = [];
let inicializado = false;

/**
 * Lee y normaliza la lista de ingredientes desde sessionStorage.
 * @returns {Array<Object>}
 */
export function leerBorradorIngredientes() {
  try {
    const raw = sessionStorage.getItem(CLAVE_BORRADOR);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item, idx) => ({
      id: item.id || `ing-${idx}-${Date.now()}`,
      nombre: String(item.nombre || 'Ingrediente').trim(),
      proteina100: Math.max(0, Number(item.proteina100 ?? item.proteinas ?? item.p ?? 0)),
      carbohidratos100: Math.max(0, Number(item.carbohidratos100 ?? item.carbohidratos ?? item.c ?? 0)),
      grasas100: Math.max(0, Number(item.grasas100 ?? item.grasas ?? item.g ?? 0)),
      gramos: Math.max(0, Number(item.gramos ?? item.cantidad ?? 100) || 100)
    }));
  } catch (err) {
    console.warn('Error al leer borrador de ingredientes:', err);
    return [];
  }
}

/**
 * Guarda la lista de ingredientes del borrador en sessionStorage.
 * @param {Array<Object>} ingredientes
 */
export function guardarBorradorIngredientes(ingredientes) {
  try {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(ingredientes));
  } catch (err) {
    console.warn('Error al guardar borrador de ingredientes:', err);
  }
}

/**
 * Calcula los macronutrientes aportados por un ingrediente específico según sus gramos actuales.
 * @param {Object} ingrediente
 * @returns {{gramos: number, p: number, c: number, g: number, kcal: number}}
 */
export function calcularMacronutrientesIngrediente(ingrediente) {
  const g = Math.max(0, Number(ingrediente.gramos) || 0);
  const factor = g / 100;
  const p = Math.max(0, Number(ingrediente.proteina100) || 0) * factor;
  const c = Math.max(0, Number(ingrediente.carbohidratos100) || 0) * factor;
  const grasas = Math.max(0, Number(ingrediente.grasas100) || 0) * factor;
  const atwater = calcularAtwater(p, c, grasas);

  return {
    gramos: g,
    p: Math.round(p * 10) / 10,
    c: Math.round(c * 10) / 10,
    g: Math.round(grasas * 10) / 10,
    kcal: atwater.kcalCalculadas
  };
}

/**
 * Calcula los totales acumulados del plato y los valores consolidados cada 100 g.
 * @param {Array<Object>} ingredientes
 * @returns {{
 *   pesoTotal: number,
 *   totalP: number,
 *   totalC: number,
 *   totalG: number,
 *   totalKcal: number,
 *   p100: number,
 *   c100: number,
 *   g100: number,
 *   kcal100: number
 * }}
 */
export function calcularTotalesPlato(ingredientes) {
  let pesoTotal = 0;
  let sumP = 0;
  let sumC = 0;
  let sumG = 0;

  ingredientes.forEach((it) => {
    const calc = calcularMacronutrientesIngrediente(it);
    pesoTotal += calc.gramos;
    sumP += calc.p;
    sumC += calc.c;
    sumG += calc.g;
  });

  pesoTotal = Math.round(pesoTotal);
  const totalP = Math.round(sumP * 10) / 10;
  const totalC = Math.round(sumC * 10) / 10;
  const totalG = Math.round(sumG * 10) / 10;
  const totalKcal = calcularAtwater(totalP, totalC, totalG).kcalCalculadas;

  let p100 = 0;
  let c100 = 0;
  let g100 = 0;
  let kcal100 = 0;

  if (pesoTotal > 0) {
    p100 = Math.round(((totalP / pesoTotal) * 100) * 10) / 10;
    c100 = Math.round(((totalC / pesoTotal) * 100) * 10) / 10;
    g100 = Math.round(((totalG / pesoTotal) * 100) * 10) / 10;
    kcal100 = calcularAtwater(p100, c100, g100).kcalCalculadas;
  }

  return {
    pesoTotal,
    totalP,
    totalC,
    totalG,
    totalKcal,
    p100,
    c100,
    g100,
    kcal100
  };
}

/**
 * Actualiza el bloque de resumen y el estado vacío / lista en el DOM.
 * @param {Array<Object>} ingredientes
 */
export function actualizarResumenPlato(ingredientes) {
  const totales = calcularTotalesPlato(ingredientes);

  const elKcal = document.querySelector(SELECTORES.totalKcal);
  const elP = document.querySelector(SELECTORES.totalP);
  const elC = document.querySelector(SELECTORES.totalC);
  const elG = document.querySelector(SELECTORES.totalG);
  const elPeso = document.querySelector(SELECTORES.resumenPesoTotal);
  const elPor100g = document.querySelector(SELECTORES.resumenPor100g);

  if (elKcal) elKcal.textContent = String(totales.totalKcal);
  if (elP) elP.textContent = String(Math.round(totales.totalP));
  if (elC) elC.textContent = String(Math.round(totales.totalC));
  if (elG) elG.textContent = String(Math.round(totales.totalG));
  if (elPeso) elPeso.textContent = `${totales.pesoTotal} g total`;
  if (elPor100g) {
    elPor100g.textContent = `Valores por 100 g: ${totales.kcal100} kcal · P ${totales.p100} · C ${totales.c100} · G ${totales.g100}`;
  }

  // Alternancia semántica con atributo hidden (Regla de Oro 2)
  const estadoVacio = document.querySelector(SELECTORES.estadoVacio);
  const lista = document.querySelector(SELECTORES.listaIngredientes);

  if (ingredientes.length === 0) {
    if (estadoVacio) estadoVacio.hidden = false;
    if (lista) lista.hidden = true;
  } else {
    if (estadoVacio) estadoVacio.hidden = true;
    if (lista) lista.hidden = false;
  }
}

/**
 * Renderiza los ingredientes del borrador en la lista utilizando el template nativo.
 * Cero innerHTML (Regla de Oro 1).
 * @param {Array<Object>} ingredientes
 */
export function renderizarIngredientes(ingredientes) {
  ingredientesActuales = Array.isArray(ingredientes) ? ingredientes : [];
  const lista = document.querySelector(SELECTORES.listaIngredientes);
  const tpl = document.querySelector(SELECTORES.tplIngrediente);
  if (!lista || !tpl || !tpl.content) return;

  lista.replaceChildren();

  const fragmento = document.createDocumentFragment();

  ingredientes.forEach((item, index) => {
    const clon = tpl.content.cloneNode(true);
    const fila = clon.querySelector('.alimento-fila') || clon.firstElementChild;
    if (!fila) return;

    fila.dataset.id = String(item.id || index);

    const elNombre = fila.querySelector('[data-ref="nombre"]');
    if (elNombre) elNombre.textContent = item.nombre;

    const calc = calcularMacronutrientesIngrediente(item);
    const elKcal = fila.querySelector('[data-ref="kcal"]');
    if (elKcal) {
      elKcal.textContent = `${calc.kcal} kcal · P ${calc.p} · C ${calc.c} · G ${calc.g}`;
    }

    const inputGramos = fila.querySelector('[data-ref="gramos"]');
    if (inputGramos) {
      inputGramos.value = String(item.gramos != null ? item.gramos : 100);
      inputGramos.dataset.index = String(index);
    }

    const btnEliminar = fila.querySelector('[data-ref="eliminar"]');
    if (btnEliminar) {
      btnEliminar.setAttribute('aria-label', `Eliminar ${item.nombre}`);
      btnEliminar.dataset.index = String(index);
    }

    fragmento.appendChild(fila);
  });

  lista.appendChild(fragmento);
  actualizarResumenPlato(ingredientes);
}

/**
 * Valida, consolida y guarda el nuevo plato compuesto en sessionStorage y Supabase.
 * @param {Event} [evento]
 */
export async function guardarPlato(evento) {
  if (evento) {
    evento.preventDefault();
    evento.stopPropagation();
  }

  const inputNombre = document.querySelector(SELECTORES.inputNombre);
  const selectCategoria = document.querySelector(SELECTORES.selectCategoria);

  const nombre = inputNombre ? inputNombre.value.trim() : '';
  if (!nombre) {
    mostrarAvisoFlotante('Ingresá el nombre del plato.');
    if (inputNombre) inputNombre.focus();
    return false;
  }

  if (!ingredientesActuales || ingredientesActuales.length === 0) {
    ingredientesActuales = leerBorradorIngredientes();
  }

  if (!ingredientesActuales || ingredientesActuales.length === 0) {
    mostrarAvisoFlotante('Añade al menos un alimento para formar tu plato.');
    return false;
  }

  const totales = calcularTotalesPlato(ingredientesActuales);
  if (totales.pesoTotal <= 0) {
    mostrarAvisoFlotante('Los ingredientes deben tener una cantidad mayor a 0 g.');
    return false;
  }

  const categoria = selectCategoria ? selectCategoria.value : 'Platos preparados';
  const idPlato = `plato-${Date.now()}`;

  const platoCompuesto = {
    id: idPlato,
    nombre,
    categoria,
    coccion: 'listo',
    kcal: totales.kcal100,
    proteinas: totales.p100,
    carbohidratos: totales.c100,
    grasas: totales.g100,
    p: totales.p100,
    c: totales.c100,
    g: totales.g100,
    porcion_g: totales.pesoTotal,
    porcion_desc: `1 porción (${totales.pesoTotal} g)`,
    porcion_texto: `1 porción (${totales.pesoTotal} g)`,
    peso_total: totales.pesoTotal,
    kcal_total: totales.totalKcal,
    p_total: totales.totalP,
    c_total: totales.totalC,
    g_total: totales.totalG,
    ingredientes: ingredientesActuales.map((it) => ({
      id: it.id,
      nombre: it.nombre,
      proteina100: it.proteina100,
      carbohidratos100: it.carbohidratos100,
      grasas100: it.grasas100,
      gramos: it.gramos
    })),
    fuente: 'alumno',
    creado_el: new Date().toISOString()
  };

  // 1. Persistencia local en sessionStorage ('appcalorias_mis_platos')
  try {
    let misPlatos = [];
    const rawPlatos = sessionStorage.getItem(CLAVE_MIS_PLATOS);
    if (rawPlatos) misPlatos = JSON.parse(rawPlatos);
    if (!Array.isArray(misPlatos)) misPlatos = [];
    misPlatos.push(platoCompuesto);
    sessionStorage.setItem(CLAVE_MIS_PLATOS, JSON.stringify(misPlatos));
  } catch (err) {
    console.warn('Error al guardar en sessionStorage mis_platos:', err);
  }

  // 2. Persistencia en Supabase
  try {
    await crearAlimento({
      nombre,
      categoria,
      coccion: 'listo',
      kcal: totales.kcal100,
      proteinas: totales.p100,
      carbohidratos: totales.c100,
      grasas: totales.g100,
      porcion_g: totales.pesoTotal,
      porcion_desc: `1 porción (${totales.pesoTotal} g)`,
      fuente: 'alumno'
    });
  } catch (err) {
    console.warn('No se pudo guardar en Supabase (modo sin conexión / fallback):', err);
  }

  // 3. Limpiar borrador de ingredientes
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // Ignorar si falla
  }

  // 4. Mostrar aviso persistido y redirigir
  guardarAvisoToast('Plato creado exitosamente');
  if (typeof window !== 'undefined' && window.__TEST_NO_REDIRECT__) {
    window.__LAST_REDIRECT__ = 'agregar.html';
  } else {
    window.location.href = 'agregar.html';
  }
  return true;
}

/**
 * Inicializa el controlador UI de la pantalla Crear Plato.
 */
export function iniciarCrearPlato() {
  ingredientesActuales = leerBorradorIngredientes();
  renderizarIngredientes(ingredientesActuales);

  if (inicializado) return;
  inicializado = true;

  const form = document.querySelector(SELECTORES.form);
  const lista = document.querySelector(SELECTORES.listaIngredientes);

  // Recalcular en caliente al modificar los gramos de un ingrediente
  if (lista) {
    lista.addEventListener('input', (evento) => {
      const inputGramos = evento.target.closest('[data-ref="gramos"]');
      if (!inputGramos) return;

      const fila = inputGramos.closest('.alimento-fila');
      const index = Number(inputGramos.dataset.index);
      const valor = Math.max(0, parseFloat(inputGramos.value) || 0);

      if (ingredientesActuales[index]) {
        ingredientesActuales[index].gramos = valor;
        guardarBorradorIngredientes(ingredientesActuales);

        // Actualizar indicador de calorías de este ingrediente en caliente
        const calc = calcularMacronutrientesIngrediente(ingredientesActuales[index]);
        const elKcal = fila?.querySelector('[data-ref="kcal"]');
        if (elKcal) {
          elKcal.textContent = `${calc.kcal} kcal · P ${calc.p} · C ${calc.c} · G ${calc.g}`;
        }

        actualizarResumenPlato(ingredientesActuales);
      }
    });

    // Eliminar ingrediente al presionar el botón de basura/cruz
    lista.addEventListener('click', (evento) => {
      const btnEliminar = evento.target.closest('[data-ref="eliminar"]');
      if (!btnEliminar) return;

      const index = Number(btnEliminar.dataset.index);
      if (!Number.isNaN(index) && index >= 0 && index < ingredientesActuales.length) {
        const eliminado = ingredientesActuales.splice(index, 1)[0];
        guardarBorradorIngredientes(ingredientesActuales);
        renderizarIngredientes(ingredientesActuales);
        if (eliminado && eliminado.nombre) {
          mostrarAvisoFlotante(`"${eliminado.nombre}" quitado del plato.`);
        }
      }
    });
  }

  // Envío del formulario
  if (form) {
    form.addEventListener('submit', guardarPlato);
  }
}

// Auto-inicialización si el DOM ya está listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarCrearPlato);
  } else {
    iniciarCrearPlato();
  }
}
