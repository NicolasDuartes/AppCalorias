/* ==========================================================
   dashboard-ui.js — día elegido en el dashboard del alumno
   Arma la rueda de días (el elegido siempre al centro), cambia el título
   (Hoy, Ayer o la fecha) y abre el calendario del sistema desde el título.
   Por ahora solo cambia la fecha: los datos del día todavía son de ejemplo.
   ========================================================== */
import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';

// Solo para alumnos: sin sesión va al login y un coach va a su panel
exigirRol('alumno');

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
const avisoComida = document.querySelector(SELECTORES.avisoComida);
let temporizadorComida = null;
let ultimaComidaRegistrada = null;

/**
 * Extrae los valores nutricionales numéricos de un elemento de comida.
 * Prioriza atributos data-* explícitos y cuenta con fallback a selectores de texto.
 * @param {HTMLElement} elComida
 * @returns {{ kcal: number, p: number, c: number, g: number }}
 */
export function obtenerNutricionComida(elComida) {
  if (!elComida) return { kcal: 0, p: 0, c: 0, g: 0 };

  const kcalAttr = Number(elComida.dataset.kcal);
  const pAttr = Number(elComida.dataset.p);
  const cAttr = Number(elComida.dataset.c);
  const gAttr = Number(elComida.dataset.g);

  if (!Number.isNaN(kcalAttr) && kcalAttr > 0) {
    return {
      kcal: kcalAttr,
      p: Number.isNaN(pAttr) ? 0 : pAttr,
      c: Number.isNaN(cAttr) ? 0 : cAttr,
      g: Number.isNaN(gAttr) ? 0 : gAttr
    };
  }

  // Fallback: parsear texto en el DOM
  const textoKcal = elComida.querySelector('.comida__kcal')?.textContent || '';
  const matchKcal = textoKcal.match(/(\d+[\d.]*)/);
  const kcal = matchKcal ? parseInt(matchKcal[1].replace(/\./g, ''), 10) : 0;

  const textoMacros = elComida.querySelector('.comida__macros')?.textContent || '';
  const matchP = textoMacros.match(/P\s*(\d+)/i);
  const matchC = textoMacros.match(/C\s*(\d+)/i);
  const matchG = textoMacros.match(/G\s*(\d+)/i);

  return {
    kcal,
    p: matchP ? parseInt(matchP[1], 10) : 0,
    c: matchC ? parseInt(matchC[1], 10) : 0,
    g: matchG ? parseInt(matchG[1], 10) : 0
  };
}

/**
 * Calcula los totales consumidos y sincroniza el anillo SVG y las barras de macros.
 */
export function actualizarResumenNutricional() {
  const comidasHechas = document.querySelectorAll(`${SELECTORES.comidas}[data-estado="hecha"]`);
  let consumidoKcal = 0;
  let consumidoP = 0;
  let consumidoC = 0;
  let consumidoG = 0;

  comidasHechas.forEach((comida) => {
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

// Inicialización de resúmenes
actualizarContadorComidas();
actualizarResumenNutricional();
actualizarContadorAgua();

document.querySelectorAll(SELECTORES.botonLoComi).forEach((boton) => {
  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    const comida = boton.closest(SELECTORES.comidas);
    if (!comida) return;
    comida.dataset.estado = 'hecha';
    ultimaComidaRegistrada = comida;
    actualizarContadorComidas();
    actualizarResumenNutricional();

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
    ultimaComidaRegistrada = null;
    actualizarContadorComidas();
    actualizarResumenNutricional();
  }
  if (avisoComida) avisoComida.hidden = true;
  if (temporizadorComida) {
    clearTimeout(temporizadorComida);
    temporizadorComida = null;
  }
});

// ---------- Vasos de agua: alternar estado ----------
document.querySelectorAll(SELECTORES.vasosAgua).forEach((vaso) => {
  vaso.addEventListener('click', () => {
    const presionado = vaso.getAttribute('aria-pressed') === 'true';
    vaso.setAttribute('aria-pressed', String(!presionado));
    actualizarContadorAgua();
  });
});

