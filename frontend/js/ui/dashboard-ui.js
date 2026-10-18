/* ==========================================================
   dashboard-ui.js — día elegido en el dashboard del alumno
   Arma la rueda de días (el elegido siempre al centro), cambia el título
   (Hoy, Ayer o la fecha) y abre el calendario del sistema desde el título.
   Conexión con Supabase para registro de ingesta diaria y sincronización reactiva.
   ========================================================== */
import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';
import { supabase } from '../data/supabase.js';
import {
  obtenerConsumoDiario,
  registrarAlimentoConsumido,
  obtenerOCrearRegistroDiario,
  actualizarAgua
} from '../data/registro-api.js';
import { obtenerPlanActivo } from '../data/planes-api.js';

// Solo para alumnos: sin sesión va al login y un coach va a su panel
exigirRol('alumno');

let usuarioActualId = null;
let logDiarioActualId = null;

/**
 * Mapa centralizado de selectores del DOM para desacoplar lógica y presentación.
 */
export const SELECTORES = {
  selectorFecha: '#selector-fecha',
  tituloDia: '#titulo-dia',
  calendario: '#calendario',
  ruedaDias: '#dias',
  anilloNumero: '.anillo__numero',
  anilloTexto: '.anillo__texto',
  anilloCirculoAvance: '.anillo svg circle:nth-child(2)',
  macroProteinasValor: '.resumen-kcal__datos .macro-linea:nth-child(1) .dato-linea__valor',
  macroProteinasBarra: '.resumen-kcal__datos .macro-linea:nth-child(1) .barra .p',
  macroCarbosValor: '.resumen-kcal__datos .macro-linea:nth-child(2) .dato-linea__valor',
  macroCarbosBarra: '.resumen-kcal__datos .macro-linea:nth-child(2) .barra .c',
  macroGrasasValor: '.resumen-kcal__datos .macro-linea:nth-child(3) .dato-linea__valor',
  macroGrasasBarra: '.resumen-kcal__datos .macro-linea:nth-child(3) .barra .g',
  contadorComidas: '[aria-labelledby="t-comidas"] .sub',
  comidas: '.comida',
  contenedorAlimentos: '.comida__alimentos',
  botonLoComi: '.comida__lo-comi',
  avisoComida: '.aviso-flotante:not(.aviso-flotante--toast)',
  avisoComidaTexto: '.aviso-flotante:not(.aviso-flotante--toast) .crece',
  botonDeshacer: '.aviso-flotante:not(.aviso-flotante--toast) .aviso-flotante__accion',
  contadorAgua: '[aria-labelledby="t-agua"] .sub',
  vasosAgua: '.vasos .vaso'
};

/**
 * Metas nutricionales e hídricas del plan activo del alumno.
 */
export const PLAN_OBJETIVO_DEFECTO = {
  kcal: 1967,
  p: 141,
  c: 193,
  g: 69,
  aguaLitros: 3.0
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
// Días visibles a cada lado del elegido
const LADO = 3;

const selector = document.querySelector(SELECTORES.selectorFecha) || document.getElementById('selector-fecha');
const titulo = document.querySelector(SELECTORES.tituloDia) || document.getElementById('titulo-dia');
const calendario = document.querySelector(SELECTORES.calendario) || document.getElementById('calendario');
const rueda = document.querySelector(SELECTORES.ruedaDias) || document.getElementById('dias');
const sinAnimacion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Fechas a medianoche local, para comparar solo el día
function soloDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha, cantidad) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + cantidad);
}

function mismoDia(a, b) {
  return a.getTime() === b.getTime();
}

// Días entre dos fechas (redondeado: los cambios de horario no lo afectan)
function diasEntre(desde, hasta) {
  return Math.round((hasta - desde) / 86400000);
}

// AAAA-MM-DD en hora local (el formato del input date)
function aTextoISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function desdeTextoISO(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const hoy = soloDia(new Date());
let elegido = hoy;

function nombreDelDia(fecha) {
  if (mismoDia(fecha, hoy)) return 'Hoy';
  if (mismoDia(fecha, sumarDias(hoy, -1))) return 'Ayer';
  const diaSemana = DIAS[fecha.getDay()];
  const texto = `${diaSemana[0].toUpperCase()}${diaSemana.slice(1)} ${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === hoy.getFullYear() ? texto : `${texto} ${fecha.getFullYear()}`;
}

function dibujarRueda() {
  rueda.replaceChildren();
  for (let i = -LADO; i <= LADO; i += 1) {
    const fecha = sumarDias(elegido, i);
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = fecha > hoy ? 'dia dia--futuro' : 'dia';
    boton.dataset.fecha = aTextoISO(fecha);
    boton.setAttribute('aria-label', `${DIAS[fecha.getDay()]} ${fecha.getDate()}`);
    boton.setAttribute('aria-pressed', String(i === 0));
    if (mismoDia(fecha, hoy)) boton.setAttribute('aria-current', 'date');

    const letra = document.createElement('span');
    letra.className = 'dia__letra';
    letra.textContent = DIAS[fecha.getDay()][0].toUpperCase();
    const numero = document.createElement('span');
    numero.className = 'dia__numero';
    numero.textContent = fecha.getDate();
    boton.append(letra, numero);
    rueda.append(boton);
  }
}

function anchoDeDia() {
  return rueda.clientWidth / (LADO * 2 + 1);
}

// Al girar, los días entran desde el lado del que vino el elegido
function animarGiro(pasos) {
  if (!pasos || sinAnimacion.matches) return;
  rueda.animate(
    [{ transform: `translateX(${pasos * anchoDeDia()}px)` }, { transform: 'translateX(0)' }],
    { duration: 220, easing: 'ease-out' },
  );
}

function elegir(fecha) {
  const nuevo = soloDia(fecha);
  const pasos = diasEntre(elegido, nuevo);
  elegido = nuevo;
  const nombre = nombreDelDia(elegido);
  titulo.textContent = nombre;
  titulo.classList.toggle('selector-fecha__texto--fecha', nombre !== 'Hoy' && nombre !== 'Ayer');
  selector.setAttribute('aria-label', `Elegir fecha. Mostrando ${nombre.toLowerCase()}`);
  dibujarRueda();
  // Saltos grandes (desde el calendario) cambian sin animación
  if (Math.abs(pasos) <= LADO) animarGiro(pasos);

  // Recargar datos para el día elegido
  recargarDatosDia(elegido);
}

/**
 * Sincroniza la sesión del alumno con Supabase Auth respetando modo test y offline.
 * @returns {Promise<string|null>} UUID del alumno o null
 */
export async function sincronizarSesion() {
  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    return null;
  }
  if (usuarioActualId) return usuarioActualId;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      usuarioActualId = session.user.id;
      return usuarioActualId;
    }
  } catch (err) {
    console.warn('Error al verificar sesión en dashboard:', err);
  }
  return null;
}

/**
 * Recarga los datos de nutrición y consumo para la fecha seleccionada.
 * @param {Date} [fecha=elegido]
 */
export function recargarDatosDia(fecha = elegido) {
  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    return;
  }
  hidratarDashboard(fecha).catch((err) => {
    console.warn('Error al recargar datos del día desde Supabase:', err);
  });
}

/**
 * Hidrata las comidas, macros y consumo de agua desde daily_logs de Supabase.
 * En caso de error o ausencia de red, degrada graciosamente a sessionStorage.
 * @param {Date} [fecha=elegido]
 * @returns {Promise<Object|null>}
 */
export async function hidratarDashboard(fecha = elegido) {
  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    return null;
  }
  const uid = usuarioActualId || (await sincronizarSesion());
  if (!uid) return null;

  try {
    // 1. Enriquecer metas nutricionales desde el plan activo si existe
    try {
      const planActivo = await obtenerPlanActivo(uid);
      if (planActivo && planActivo.plan) {
        if (planActivo.plan.target_calories) PLAN_OBJETIVO_DEFECTO.kcal = Number(planActivo.plan.target_calories);
        if (planActivo.plan.target_protein_g) PLAN_OBJETIVO_DEFECTO.p = Number(planActivo.plan.target_protein_g);
        if (planActivo.plan.target_carbs_g) PLAN_OBJETIVO_DEFECTO.c = Number(planActivo.plan.target_carbs_g);
        if (planActivo.plan.target_fat_g) PLAN_OBJETIVO_DEFECTO.g = Number(planActivo.plan.target_fat_g);
        actualizarResumenNutricional();
      }
    } catch {
      // Ignorar si falla lectura del plan
    }

    // 2. Obtener consumo del día desde daily_logs
    const fechaISO = aTextoISO(fecha);
    const consumo = await obtenerConsumoDiario(uid, fechaISO);

    if (consumo && consumo.log) {
      logDiarioActualId = consumo.log.id;

      if (consumo.items && consumo.items.length > 0) {
        const comidasEstructuradas = {
          Desayuno: [],
          Almuerzo: [],
          Merienda: [],
          Cena: []
        };

        consumo.items.forEach((it) => {
          const comida = it.comida || it.meal_type || 'Almuerzo';
          if (!comidasEstructuradas[comida]) comidasEstructuradas[comida] = [];
          comidasEstructuradas[comida].push({
            id: it.id,
            nombre: it.nombre || it.food_name,
            linea: it.linea || `${it.kcal} kcal · P ${it.p} · C ${it.c} · G ${it.g}`,
            cantidad: it.cantidad || `${it.gramos} g`,
            kcal: it.kcal,
            p: it.p,
            c: it.c,
            g: it.g,
            gramos: it.gramos
          });
        });

        guardarComidasEnStorage(comidasEstructuradas);
        renderizarAlimentosEnComidas();
      }

      // Sincronizar vasos de agua si vienen de DB
      if (typeof consumo.aguaLitros === 'number' && consumo.aguaLitros > 0) {
        const vasos = document.querySelectorAll(SELECTORES.vasosAgua);
        const totalVasos = vasos.length || 8;
        const litrosPorVaso = PLAN_OBJETIVO_DEFECTO.aguaLitros / totalVasos;
        const numVasos = Math.min(totalVasos, Math.round(consumo.aguaLitros / litrosPorVaso));
        const indices = [];
        vasos.forEach((vaso, i) => {
          const activo = i < numVasos;
          vaso.setAttribute('aria-pressed', String(activo));
          if (activo) indices.push(i);
        });
        guardarVasosAgua(indices);
        actualizarContadorAgua();
      }

      actualizarResumenNutricional();
      actualizarContadorComidas();
      return consumo;
    } else {
      logDiarioActualId = null;
    }
  } catch (err) {
    console.warn('Fallback a almacenamiento local por excepción en hidratarDashboard:', err);
  }
  return null;
}

// Deslizar con el dedo: cada ancho de día recorrido mueve un día
let inicioX = null;
let deslizo = false;

rueda.addEventListener('pointerdown', (evento) => {
  inicioX = evento.clientX;
  deslizo = false;
});

rueda.addEventListener('pointerup', (evento) => {
  if (inicioX === null) return;
  const recorrido = evento.clientX - inicioX;
  inicioX = null;
  const dias = Math.round(recorrido / anchoDeDia());
  if (Math.abs(recorrido) < 24 || dias === 0) return;
  deslizo = true; // Evita que el click que sigue al deslizar elija otro día
  elegir(sumarDias(elegido, -dias));
});

rueda.addEventListener('pointercancel', () => {
  inicioX = null;
});

rueda.addEventListener('click', (evento) => {
  if (deslizo) {
    deslizo = false;
    return;
  }
  const boton = evento.target.closest('.dia');
  if (boton) elegir(desdeTextoISO(boton.dataset.fecha));
});

selector.addEventListener('click', () => {
  calendario.value = aTextoISO(elegido);
  try {
    calendario.showPicker();
  } catch {
    // Navegadores sin showPicker: el input recibe el foco y el usuario lo abre
    calendario.focus();
    calendario.click();
  }
});

calendario.addEventListener('change', () => {
  if (calendario.value) elegir(desdeTextoISO(calendario.value));
});

elegir(hoy);

// ---------- Modelo y Resumen Nutricional Reactivo ----------
export const CLAVE_STORAGE_COMIDAS = 'comidas-diarias-alumno';

const avisoComida = document.querySelector(SELECTORES.avisoComida);
let temporizadorComida = null;
let ultimaComidaRegistrada = null;

/**
 * Obtiene el mapa de comidas y alimentos almacenados en la sesión del alumno.
 * @returns {Record<string, Array<{nombre: string, linea: string, cantidad: string, kcal: number, p: number, c: number, g: number, gramos?: number}>>}
 */
export function obtenerComidasGuardadas() {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE_COMIDAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {
    // Si sessionStorage no está disponible o falla el parseo
  }
  return {
    Desayuno: [],
    Almuerzo: [],
    Merienda: [],
    Cena: []
  };
}

/**
 * Guarda las comidas y sus alimentos en sessionStorage.
 * @param {Record<string, Array<*>>} comidas
 */
export function guardarComidasEnStorage(comidas) {
  try {
    sessionStorage.setItem(CLAVE_STORAGE_COMIDAS, JSON.stringify(comidas));
  } catch {
    // Ignorar si sessionStorage no está disponible
  }
}

/**
 * Procesa cualquier reemplazo pendiente guardado por reemplazar-ui.js en sessionStorage.
 */
export function procesarReemplazoPendiente() {
  try {
    const rawReemplazo = sessionStorage.getItem('alimento-reemplazado');
    if (!rawReemplazo) return;

    const datos = JSON.parse(rawReemplazo);
    if (!datos || !datos.objetivo || !datos.reemplazo) return;

    const comidas = obtenerComidasGuardadas();
    const nombreComida = datos.objetivo.comida || 'Almuerzo';
    const lista = comidas[nombreComida] || [];

    const objetivoNombre = datos.objetivo.nombre.toLowerCase().trim();
    const idx = lista.findIndex((item) => {
      const nom = item.nombre.toLowerCase().trim();
      return nom.includes(objetivoNombre) || objetivoNombre.includes(nom);
    });

    const aportes = datos.reemplazo.aportes || {};
    const kVal = Math.round(aportes.kcal ?? 0);
    const pVal = Math.round(aportes.p ?? aportes.proteinas ?? 0);
    const cVal = Math.round(aportes.c ?? aportes.carbohidratos ?? 0);
    const gVal = Math.round(aportes.g ?? aportes.grasas ?? 0);
    const gramosVal = datos.reemplazo.gramos || 100;

    const nuevoItem = {
      nombre: datos.reemplazo.nombre,
      linea: `${kVal} kcal · P ${pVal} · C ${cVal} · G ${gVal}`,
      cantidad: datos.reemplazo.cantidad || `${gramosVal} g`,
      kcal: kVal,
      p: pVal,
      c: cVal,
      g: gVal,
      gramos: gramosVal
    };

    if (idx >= 0) {
      lista[idx] = nuevoItem;
    } else {
      lista.push(nuevoItem);
    }
    comidas[nombreComida] = lista;
    guardarComidasEnStorage(comidas);
    sessionStorage.removeItem('alimento-reemplazado');
  } catch {
    // Ignorar
  }
}

/**
 * Calcula y actualiza reactivamente la cabecera, detalle, macros y barra de reparto de una comida.
 * Suma todos los .alimento-fila contenidos. Si la comida no contiene alimentos, establece 0 en todo.
 * @param {HTMLElement} elComida
 * @returns {{ kcal: number, p: number, c: number, g: number, cantidad: number }}
 */
export function actualizarComida(elComida) {
  if (!elComida) return { kcal: 0, p: 0, c: 0, g: 0, cantidad: 0 };

  const filas = elComida.querySelectorAll('.alimento-fila');
  let totalKcal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalG = 0;

  if (filas.length > 0) {
    filas.forEach((fila) => {
      const kAttr = Number(fila.dataset.kcal);
      const pAttr = Number(fila.dataset.p);
      const cAttr = Number(fila.dataset.c);
      const gAttr = Number(fila.dataset.g);

      if (!Number.isNaN(kAttr) && kAttr >= 0) {
        totalKcal += kAttr;
        totalP += (!Number.isNaN(pAttr) && pAttr >= 0) ? pAttr : 0;
        totalC += (!Number.isNaN(cAttr) && cAttr >= 0) ? cAttr : 0;
        totalG += (!Number.isNaN(gAttr) && gAttr >= 0) ? gAttr : 0;
      } else {
        const txt = fila.querySelector('.alimento-fila__linea')?.textContent || '';
        const mK = txt.match(/(\d+[\d.]*)\s*kcal/i);
        const mP = txt.match(/P\s*(\d+)/i);
        const mC = txt.match(/C\s*(\d+)/i);
        const mG = txt.match(/G\s*(\d+)/i);
        if (mK) totalKcal += parseInt(mK[1].replace(/\./g, ''), 10);
        if (mP) totalP += parseInt(mP[1], 10);
        if (mC) totalC += parseInt(mC[1], 10);
        if (mG) totalG += parseInt(mG[1], 10);
      }
    });

    elComida.dataset.kcal = String(totalKcal);
    elComida.dataset.p = String(Math.round(totalP));
    elComida.dataset.c = String(Math.round(totalC));
    elComida.dataset.g = String(Math.round(totalG));
  } else {
    totalKcal = 0;
    totalP = 0;
    totalC = 0;
    totalG = 0;
    elComida.dataset.kcal = '0';
    elComida.dataset.p = '0';
    elComida.dataset.c = '0';
    elComida.dataset.g = '0';
  }

  // Actualizar cabecera de la comida
  const elKcal = elComida.querySelector('.comida__kcal');
  if (elKcal) {
    elKcal.innerHTML = `${totalKcal > 0 ? totalKcal.toLocaleString('es-AR') : '0'}<span class="unidad"> kcal</span>`;
  }

  const elDetalle = elComida.querySelector('.comida__detalle');
  if (elDetalle) {
    const cant = filas.length;
    elDetalle.textContent = cant === 0 ? '0 alimentos' : `${cant} ${cant === 1 ? 'alimento' : 'alimentos'}`;
  }

  const elMacros = elComida.querySelector('.comida__macros');
  if (elMacros) {
    elMacros.textContent = `P ${Math.round(totalP)} g · C ${Math.round(totalC)} g · G ${Math.round(totalG)} g`;
  }

  // Actualizar barra de reparto macro de la comida
  const totalMacros = totalP + totalC + totalG;
  const pBar = elComida.querySelector('.reparto .p');
  const cBar = elComida.querySelector('.reparto .c');
  const gBar = elComida.querySelector('.reparto .g');

  if (totalMacros > 0) {
    const pctP = Math.round((totalP / totalMacros) * 100);
    const pctC = Math.round((totalC / totalMacros) * 100);
    const pctG = Math.max(0, 100 - pctP - pctC);
    if (pBar) pBar.style.width = `${pctP}%`;
    if (cBar) cBar.style.width = `${pctC}%`;
    if (gBar) gBar.style.width = `${pctG}%`;
  } else {
    if (pBar) pBar.style.width = '0%';
    if (cBar) cBar.style.width = '0%';
    if (gBar) gBar.style.width = '0%';
  }

  return { kcal: totalKcal, p: totalP, c: totalC, g: totalG, cantidad: filas.length };
}

/**
 * Extrae los valores nutricionales numéricos de un elemento de comida.
 * @param {HTMLElement} elComida
 * @returns {{ kcal: number, p: number, c: number, g: number }}
 */
export function obtenerNutricionComida(elComida) {
  if (!elComida) return { kcal: 0, p: 0, c: 0, g: 0 };
  const datos = actualizarComida(elComida);
  return {
    kcal: datos.kcal,
    p: datos.p,
    c: datos.c,
    g: datos.g
  };
}

/**
 * Renderiza los alimentos guardados en sessionStorage dentro de las tarjetas de comidas.
 */
export function renderizarAlimentosEnComidas() {
  const comidasData = obtenerComidasGuardadas();
  const elComidas = document.querySelectorAll(SELECTORES.comidas);

  elComidas.forEach((elComida) => {
    const titulo = elComida.querySelector('.comida__titulo')?.textContent?.trim();
    if (!titulo) return;

    let contenedor = elComida.querySelector(SELECTORES.contenedorAlimentos);
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.className = 'comida__alimentos';
      const cuerpo = elComida.querySelector('.comida__cuerpo');
      const macrosEl = elComida.querySelector('.comida__macros');
      if (macrosEl && macrosEl.nextSibling) {
        cuerpo.insertBefore(contenedor, macrosEl.nextSibling);
      } else if (cuerpo) {
        cuerpo.prepend(contenedor);
      }
    }

    const lista = comidasData[titulo] || [];
    contenedor.replaceChildren();
    if (lista.length > 0) {
      lista.forEach((alimento) => {
        const fila = document.createElement('div');
        fila.className = 'alimento-fila';
        fila.dataset.kcal = String(alimento.kcal || 0);
        fila.dataset.p = String(alimento.p || 0);
        fila.dataset.c = String(alimento.c || 0);
        fila.dataset.g = String(alimento.g || 0);

        let gCalc = alimento.gramos;
        if (!gCalc && alimento.cantidad) {
          const mG = alimento.cantidad.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
          if (mG) gCalc = parseFloat(mG[1].replace(',', '.'));
        }
        const gramosVal = gCalc || 100;
        fila.dataset.gramos = String(gramosVal);

        const urlCantidad = `cantidad.html?origen=dashboard&comida=${encodeURIComponent(titulo)}&alimento=${encodeURIComponent(alimento.nombre)}&kcal=${alimento.kcal}&p=${alimento.p}&c=${alimento.c}&g=${alimento.g}&cantidad=${encodeURIComponent(alimento.cantidad || '1 porción')}&gramos=${gramosVal}`;
        const urlReemplazar = `reemplazar.html?comida=${encodeURIComponent(titulo)}&alimento=${encodeURIComponent(alimento.nombre)}&kcal=${alimento.kcal}&p=${alimento.p}&c=${alimento.c}&g=${alimento.g}&gramos=${gramosVal}`;

        fila.innerHTML = `
          <a class="alimento-fila__nombre" href="${urlCantidad}" aria-label="Cambiar la cantidad del alimento">
            <span class="alimento-fila__titulo">${alimento.nombre}</span>
            <span class="alimento-fila__linea">${alimento.linea || `${alimento.kcal} kcal · P ${alimento.p} · C ${alimento.c} · G ${alimento.g}`}</span>
          </a>
          <span class="alimento-fila__cantidad">${alimento.cantidad || '1 porción'}</span>
          <a class="btn-reemplazar" href="${urlReemplazar}" aria-label="Reemplazar el alimento"><svg class="icono icono--grueso" width="20" height="20" aria-hidden="true"><use href="#reemplazar"/></svg></a>
        `;
        contenedor.appendChild(fila);
      });
    }

    actualizarComida(elComida);
  });
}

/**
 * Agrega un alimento a una comida y sincroniza interfaz, total acumulado y sessionStorage.
 * @param {string} nombreComida
 * @param {{ nombre: string, kcal: number, p: number, c: number, g: number, cantidad?: string, linea?: string, gramos?: number }} infoAlimento
 */
export function agregarAlimentoAComida(nombreComida, infoAlimento) {
  const comidas = obtenerComidasGuardadas();
  if (!comidas[nombreComida]) comidas[nombreComida] = [];
  const yaExiste = comidas[nombreComida].some((it) => it.nombre.toLowerCase() === infoAlimento.nombre.toLowerCase());
  if (!yaExiste) {
    comidas[nombreComida].push(infoAlimento);
    guardarComidasEnStorage(comidas);
  }
  renderizarAlimentosEnComidas();
  actualizarResumenNutricional();

  // Sincronización asíncrona de fondo con Supabase si hay sesión activa
  if (usuarioActualId && !yaExiste) {
    (async () => {
      try {
        const fechaISO = aTextoISO(elegido);
        const log = await obtenerOCrearRegistroDiario(usuarioActualId, fechaISO);
        if (log && log.id) {
          await registrarAlimentoConsumido(log.id, {
            comida: nombreComida,
            nombre: infoAlimento.nombre,
            kcal: infoAlimento.kcal,
            p: infoAlimento.p,
            c: infoAlimento.c,
            g: infoAlimento.g,
            gramos: infoAlimento.gramos || 100
          });
        }
      } catch (err) {
        console.warn('Error al registrar alimento consumido en Supabase:', err);
      }
    })();
  }
}

/**
 * Quita un alimento de una comida y sincroniza interfaz, total acumulado y sessionStorage.
 * @param {string} nombreComida
 * @param {string} nombreAlimento
 */
export function quitarAlimentoDeComida(nombreComida, nombreAlimento) {
  const comidas = obtenerComidasGuardadas();
  if (!comidas[nombreComida]) return;
  comidas[nombreComida] = comidas[nombreComida].filter(
    (item) => item.nombre.toLowerCase() !== nombreAlimento.toLowerCase()
  );
  guardarComidasEnStorage(comidas);
  renderizarAlimentosEnComidas();
  actualizarResumenNutricional();
}

/**
 * Calcula los totales acumulados de todas las comidas del día y sincroniza el anillo SVG y las barras de macros.
 */
export function actualizarResumenNutricional() {
  const todasComidas = document.querySelectorAll(SELECTORES.comidas);
  let consumidoKcal = 0;
  let consumidoP = 0;
  let consumidoC = 0;
  let consumidoG = 0;

  todasComidas.forEach((comida) => {
    const nut = obtenerNutricionComida(comida);
    consumidoKcal += nut.kcal;
    consumidoP += nut.p;
    consumidoC += nut.c;
    consumidoG += nut.g;
  });

  // 1. Anillo de calorías
  const elNumero = document.querySelector(SELECTORES.anilloNumero);
  if (elNumero) {
    elNumero.textContent = consumidoKcal > 0 ? consumidoKcal.toLocaleString('es-AR') : '0';
  }

  const elTexto = document.querySelector(SELECTORES.anilloTexto);
  if (elTexto) {
    elTexto.textContent = `de ${PLAN_OBJETIVO_DEFECTO.kcal.toLocaleString('es-AR')} kcal`;
  }

  const elCirculoAvance = document.querySelector(SELECTORES.anilloCirculoAvance);
  if (elCirculoAvance) {
    const circunferencia = 289;
    const ratio = Math.min(1, consumidoKcal / PLAN_OBJETIVO_DEFECTO.kcal);
    const dash = Math.round(ratio * circunferencia);
    elCirculoAvance.setAttribute('stroke-dasharray', `${dash} ${circunferencia}`);
    elCirculoAvance.hidden = consumidoKcal === 0;
  }

  // 2. Macronutrientes
  const elPVal = document.querySelector(SELECTORES.macroProteinasValor);
  const elPBar = document.querySelector(SELECTORES.macroProteinasBarra);
  if (elPVal) elPVal.textContent = `${Math.round(consumidoP)} / ${PLAN_OBJETIVO_DEFECTO.p} g`;
  if (elPBar) elPBar.style.width = `${Math.min(100, Math.round((consumidoP / PLAN_OBJETIVO_DEFECTO.p) * 100))}%`;

  const elCVal = document.querySelector(SELECTORES.macroCarbosValor);
  const elCBar = document.querySelector(SELECTORES.macroCarbosBarra);
  if (elCVal) elCVal.textContent = `${Math.round(consumidoC)} / ${PLAN_OBJETIVO_DEFECTO.c} g`;
  if (elCBar) elCBar.style.width = `${Math.min(100, Math.round((consumidoC / PLAN_OBJETIVO_DEFECTO.c) * 100))}%`;

  const elGVal = document.querySelector(SELECTORES.macroGrasasValor);
  const elGBar = document.querySelector(SELECTORES.macroGrasasBarra);
  if (elGVal) elGVal.textContent = `${Math.round(consumidoG)} / ${PLAN_OBJETIVO_DEFECTO.g} g`;
  if (elGBar) elGBar.style.width = `${Math.min(100, Math.round((consumidoG / PLAN_OBJETIVO_DEFECTO.g) * 100))}%`;
}

/**
 * Actualiza el contador de comidas hechas en el encabezado de sección.
 */
export function actualizarContadorComidas() {
  const contador = document.querySelector(SELECTORES.contadorComidas);
  if (!contador) return;
  const total = document.querySelectorAll(SELECTORES.comidas).length;
  const hechas = document.querySelectorAll(`${SELECTORES.comidas}[data-estado="hecha"]`).length;
  contador.textContent = `${hechas} de ${total} hechas`;
}

/**
 * Sincroniza el contador de agua en base a los vasos presionados.
 */
export function actualizarContadorAgua() {
  const contador = document.querySelector(SELECTORES.contadorAgua);
  if (!contador) return;
  const vasos = document.querySelectorAll(SELECTORES.vasosAgua);
  const totalVasos = vasos.length || 8;
  const presionados = document.querySelectorAll(`${SELECTORES.vasosAgua}[aria-pressed="true"]`).length;
  const litrosPorVaso = PLAN_OBJETIVO_DEFECTO.aguaLitros / totalVasos;
  const tomadosLitros = presionados === 0 ? '0' : (presionados * litrosPorVaso).toFixed(1).replace('.', ',');
  const metaLitros = PLAN_OBJETIVO_DEFECTO.aguaLitros.toFixed(1).replace('.', ',');
  contador.textContent = `${tomadosLitros} de ${metaLitros} L`;
}

export const CLAVE_STORAGE_ESTADOS = 'estados-comidas-alumno';
export const CLAVE_STORAGE_AGUA = 'vasos-agua-alumno';

export function obtenerEstadosComidas() {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE_ESTADOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch {
    // Ignorar
  }
  return {};
}

export function guardarEstadosComidas(estados) {
  try {
    sessionStorage.setItem(CLAVE_STORAGE_ESTADOS, JSON.stringify(estados));
  } catch {
    // Ignorar
  }
}

export function restaurarEstadosComidas() {
  const estados = obtenerEstadosComidas();
  document.querySelectorAll(SELECTORES.comidas).forEach((comida) => {
    const tit = comida.querySelector('.comida__titulo')?.textContent?.trim();
    if (tit && estados[tit]) {
      comida.dataset.estado = estados[tit];
    }
  });
}

export function obtenerVasosAguaGuardados() {
  try {
    const raw = sessionStorage.getItem(CLAVE_STORAGE_AGUA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignorar
  }
  return [];
}

export function guardarVasosAgua(indices) {
  try {
    sessionStorage.setItem(CLAVE_STORAGE_AGUA, JSON.stringify(indices));
  } catch {
    // Ignorar
  }
}

export function restaurarVasosAgua() {
  const indices = new Set(obtenerVasosAguaGuardados());
  const vasos = document.querySelectorAll(SELECTORES.vasosAgua);
  vasos.forEach((vaso, i) => {
    vaso.setAttribute('aria-pressed', String(indices.has(i)));
  });
}

// Inicialización de datos y resúmenes reactivos
procesarReemplazoPendiente();
renderizarAlimentosEnComidas();
restaurarEstadosComidas();
actualizarContadorComidas();
actualizarResumenNutricional();
restaurarVasosAgua();
actualizarContadorAgua();

// Sincronización progresiva con Supabase (enriquecimiento online)
sincronizarSesion().then((uid) => {
  if (uid) {
    hidratarDashboard(elegido);
  }
});

window.addEventListener('pageshow', () => {
  procesarReemplazoPendiente();
  renderizarAlimentosEnComidas();
  restaurarEstadosComidas();
  actualizarContadorComidas();
  actualizarResumenNutricional();
  restaurarVasosAgua();
  actualizarContadorAgua();
  if (usuarioActualId) {
    hidratarDashboard(elegido);
  }
});

document.querySelectorAll(SELECTORES.botonLoComi).forEach((boton) => {
  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    const comida = boton.closest(SELECTORES.comidas);
    if (!comida) return;
    comida.dataset.estado = 'hecha';
    ultimaComidaRegistrada = comida;
    const tit = comida.querySelector('.comida__titulo')?.textContent?.trim();
    if (tit) {
      const estados = obtenerEstadosComidas();
      estados[tit] = 'hecha';
      guardarEstadosComidas(estados);
    }
    actualizarContadorComidas();

    // Sincronizar registro con Supabase si hay sesión activa
    if (usuarioActualId) {
      (async () => {
        try {
          const fechaISO = aTextoISO(elegido);
          const log = await obtenerOCrearRegistroDiario(usuarioActualId, fechaISO);
          if (log && log.id) {
            logDiarioActualId = log.id;
            const comidasGuardadas = obtenerComidasGuardadas();
            const alimentos = comidasGuardadas[tit] || [];
            for (const alim of alimentos) {
              await registrarAlimentoConsumido(log.id, {
                comida: tit,
                nombre: alim.nombre,
                kcal: alim.kcal,
                p: alim.p,
                c: alim.c,
                g: alim.g,
                gramos: alim.gramos || 100
              });
            }
          }
        } catch (err) {
          console.warn('Error al registrar comida en Supabase:', err);
        }
      })();
    }

    if (avisoComida) {
      const tituloComida = comida.querySelector('.comida__titulo')?.textContent?.trim() || 'Comida';
      const kcalComida = comida.querySelector('.comida__kcal')?.textContent?.trim() || '';
      const textoAviso = document.querySelector(SELECTORES.avisoComidaTexto) || avisoComida.querySelector('.crece');
      if (textoAviso) {
        textoAviso.textContent = kcalComida ? `${tituloComida} registrada · ${kcalComida}` : `${tituloComida} registrada`;
      }
      avisoComida.hidden = false;

      if (temporizadorComida) clearTimeout(temporizadorComida);
      temporizadorComida = setTimeout(() => {
        avisoComida.hidden = true;
        temporizadorComida = null;
      }, 4000);
    }
  });
});

const botonDeshacer = avisoComida?.querySelector('.aviso-flotante__accion') || document.querySelector(SELECTORES.botonDeshacer);
botonDeshacer?.addEventListener('click', () => {
  if (ultimaComidaRegistrada) {
    ultimaComidaRegistrada.dataset.estado = 'pendiente';
    const tit = ultimaComidaRegistrada.querySelector('.comida__titulo')?.textContent?.trim();
    if (tit) {
      const estados = obtenerEstadosComidas();
      estados[tit] = 'pendiente';
      guardarEstadosComidas(estados);
    }
    ultimaComidaRegistrada = null;
    actualizarContadorComidas();
  }
  if (avisoComida) avisoComida.hidden = true;
  if (temporizadorComida) {
    clearTimeout(temporizadorComida);
    temporizadorComida = null;
  }
});

// ---------- Vasos de agua: alternar estado ----------
document.querySelectorAll(SELECTORES.vasosAgua).forEach((vaso, idx) => {
  vaso.addEventListener('click', () => {
    const presionado = vaso.getAttribute('aria-pressed') === 'true';
    vaso.setAttribute('aria-pressed', String(!presionado));
    const presionados = [];
    document.querySelectorAll(SELECTORES.vasosAgua).forEach((v, i) => {
      if (v.getAttribute('aria-pressed') === 'true') presionados.push(i);
    });
    guardarVasosAgua(presionados);
    actualizarContadorAgua();

    // Sincronizar consumo de agua en Supabase si hay sesión activa
    if (usuarioActualId) {
      (async () => {
        try {
          const fechaISO = aTextoISO(elegido);
          const log = await obtenerOCrearRegistroDiario(usuarioActualId, fechaISO);
          if (log && log.id) {
            const totalVasos = document.querySelectorAll(SELECTORES.vasosAgua).length || 8;
            const litrosPorVaso = PLAN_OBJETIVO_DEFECTO.aguaLitros / totalVasos;
            const litrosTotal = presionados.length * litrosPorVaso;
            await actualizarAgua(log.id, litrosTotal);
          }
        } catch (err) {
          console.warn('Error al actualizar agua en Supabase:', err);
        }
      })();
    }
  });
});

