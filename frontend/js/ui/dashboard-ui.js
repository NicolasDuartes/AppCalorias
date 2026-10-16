/* ==========================================================
   dashboard-ui.js — día elegido en el dashboard del alumno
   Arma la rueda de días (el elegido siempre al centro), cambia el título
   (Hoy, Ayer o la fecha) y abre el calendario del sistema desde el título.
   Por ahora solo cambia la fecha: los datos del día todavía son de ejemplo.
   ========================================================== */
import { exigirRol } from '../data/sesion.js';

// Solo para alumnos: sin sesión va al login y un coach va a su panel
exigirRol('alumno');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
// Días visibles a cada lado del elegido
const LADO = 3;

const selector = document.getElementById('selector-fecha');
const titulo = document.getElementById('titulo-dia');
const calendario = document.getElementById('calendario');
const rueda = document.getElementById('dias');
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
