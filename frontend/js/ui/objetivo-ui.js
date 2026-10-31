/* ==========================================================
   objetivo-ui.js — "Mi objetivo" en el perfil del alumno
   "Registrar peso" abre una regla deslizable (1 marca = 100 g) con una
   aguja fija al centro; al guardar se actualizan el peso actual y la barra.
   Por ahora es solo frontend: el pesaje no se guarda en ningún lado.
   ========================================================== */

const PESO_MIN = 30;
const PESO_MAX = 200;
const MARCAS_POR_KG = 10;
const ANCHO_MARCA = 10; // px, igual que .marca en alumno.css
const TOTAL_MARCAS = (PESO_MAX - PESO_MIN) * MARCAS_POR_KG;

/**
 * Mapa centralizado de selectores del DOM para el objetivo del alumno (perfil.html).
 */
export const SELECTORES = {
  tarjeta: '#objetivo',
  botonAbrir: '#abrir-pesaje',
  form: '#form-pesaje',
  regla: '#regla',
  ventana: '#regla-ventana',
  pista: '#regla-pista',
  textoRegla: '#regla-valor',
  textoActual: '#peso-actual',
  barra: '#barra-objetivo',
  cancelarPesaje: '#cancelar-pesaje'
};

const el = (sel) => document.querySelector(sel);

const tarjeta = el(SELECTORES.tarjeta);
const botonAbrir = el(SELECTORES.botonAbrir);
const form = el(SELECTORES.form);
const regla = el(SELECTORES.regla);
const ventana = el(SELECTORES.ventana);
const pista = el(SELECTORES.pista);
const textoRegla = el(SELECTORES.textoRegla);
const textoActual = el(SELECTORES.textoActual);
const barra = el(SELECTORES.barra);

const inicio = Number(tarjeta?.dataset?.inicio || 0);
const meta = Number(tarjeta?.dataset?.meta || 0);
let actual = Number(tarjeta?.dataset?.actual || 0);
let marcaElegida = 0;

// 72.4 -> "72,4"
function formatear(kg) {
  return kg.toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

const pesoDeMarca = (marca) => Math.round((PESO_MIN + marca / MARCAS_POR_KG) * 10) / 10;
const marcaDePeso = (kg) => Math.round((kg - PESO_MIN) * MARCAS_POR_KG);
const limitar = (marca) => Math.min(Math.max(marca, 0), TOTAL_MARCAS);

// ---------- Avance hacia la meta (sirve para bajar o subir de peso) ----------
function dibujarAvance() {
  const recorrido = meta - inicio;
  const avance = recorrido === 0 ? 1 : (actual - inicio) / recorrido;
  const porcentaje = Math.round(Math.min(Math.max(avance, 0), 1) * 100);
  textoActual.textContent = `${formatear(actual)} kg`;
  barra.firstElementChild.style.width = `${porcentaje}%`;
  barra.setAttribute('aria-valuenow', String(porcentaje));
}

// ---------- Regla ----------
function armarRegla() {
  const marcas = document.createDocumentFragment();
  for (let i = 0; i <= TOTAL_MARCAS; i += 1) {
    const marca = document.createElement('span');
    marca.className = 'marca';
    if (i % MARCAS_POR_KG === 0) {
      marca.classList.add('marca--entera');
      const numero = document.createElement('span');
      numero.className = 'marca__numero';
      numero.textContent = PESO_MIN + i / MARCAS_POR_KG;
      marca.append(numero);
    } else if (i % (MARCAS_POR_KG / 2) === 0) {
      marca.classList.add('marca--media');
    }
    marcas.append(marca);
  }
  pista.append(marcas);
}

function mostrarMarca(marca) {
  marcaElegida = marca;
  const kg = pesoDeMarca(marca);
  textoRegla.textContent = formatear(kg);
  regla.setAttribute('aria-valuenow', String(kg));
  regla.setAttribute('aria-valuetext', `${formatear(kg)} kg`);
}

function irAMarca(marca, suave = false) {
  const destino = limitar(marca);
  ventana.scrollTo({ left: destino * ANCHO_MARCA, behavior: suave ? 'smooth' : 'auto' });
  mostrarMarca(destino);
}

// La marca bajo la aguja sale de cuánto se deslizó la ventana
let pendiente = false;
ventana.addEventListener('scroll', () => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    mostrarMarca(limitar(Math.round(ventana.scrollLeft / ANCHO_MARCA)));
  });
});

// Arrastrar con el mouse (en pantallas táctiles el deslizamiento es nativo)
let arrastre = null;
ventana.addEventListener('pointerdown', (evento) => {
  if (evento.pointerType !== 'mouse') return;
  arrastre = { x: evento.clientX, scroll: ventana.scrollLeft };
  ventana.classList.add('regla__ventana--arrastrando');
  ventana.setPointerCapture(evento.pointerId);
});
ventana.addEventListener('pointermove', (evento) => {
  if (arrastre) ventana.scrollLeft = arrastre.scroll - (evento.clientX - arrastre.x);
});
function soltar() {
  if (!arrastre) return;
  arrastre = null;
  ventana.classList.remove('regla__ventana--arrastrando');
  irAMarca(Math.round(ventana.scrollLeft / ANCHO_MARCA), true);
}
ventana.addEventListener('pointerup', soltar);
ventana.addEventListener('pointercancel', soltar);

// Rueda del mouse: cada movimiento corre medio kilo
ventana.addEventListener('wheel', (evento) => {
  const delta = Math.abs(evento.deltaY) > Math.abs(evento.deltaX) ? evento.deltaY : evento.deltaX;
  if (!delta) return;
  evento.preventDefault();
  irAMarca(marcaElegida + Math.sign(delta) * (MARCAS_POR_KG / 2));
}, { passive: false });

// Teclado: flechas de a 100 g, Re Pág / Av Pág de a 1 kg
regla.addEventListener('keydown', (evento) => {
  const pasos = {
    ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1,
    PageDown: -MARCAS_POR_KG, PageUp: MARCAS_POR_KG,
  };
  if (evento.key in pasos) {
    evento.preventDefault();
    irAMarca(marcaElegida + pasos[evento.key]);
  } else if (evento.key === 'Home' || evento.key === 'End') {
    evento.preventDefault();
    irAMarca(evento.key === 'Home' ? 0 : TOTAL_MARCAS);
  }
});

// ---------- Abrir, cancelar y guardar ----------
function abrir() {
  form.hidden = false;
  botonAbrir.setAttribute('aria-expanded', 'true');
  irAMarca(marcaDePeso(actual));
  regla.focus();
}

function cerrar() {
  form.hidden = true;
  botonAbrir.setAttribute('aria-expanded', 'false');
  botonAbrir.focus();
}

if (botonAbrir && form) {
  botonAbrir.addEventListener('click', () => {
    if (form.hidden) abrir();
    else cerrar();
  });
}

const btnCancelar = el(SELECTORES.cancelarPesaje);
if (btnCancelar) {
  btnCancelar.addEventListener('click', cerrar);
}

if (form) {
  form.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrar();
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    actual = pesoDeMarca(marcaElegida);
    try {
      sessionStorage.setItem('appcalorias_peso_actual', String(actual));
      let historial = [];
      const previo = sessionStorage.getItem('appcalorias_historial_pesajes');
      if (previo) {
        try {
          const parseado = JSON.parse(previo);
          if (Array.isArray(parseado)) historial = parseado;
        } catch {
          historial = [];
        }
      }
      historial.push({
        peso: actual,
        fecha: new Date().toISOString()
      });
      sessionStorage.setItem('appcalorias_historial_pesajes', JSON.stringify(historial));
    } catch {
      // Ignorar si sessionStorage no está disponible
    }
    dibujarAvance();
    cerrar();
  });
}

try {
  const guardado = sessionStorage.getItem('appcalorias_peso_actual');
  if (guardado !== null && guardado !== '') {
    const num = Number(guardado);
    if (!Number.isNaN(num)) {
      actual = num;
    }
  }
} catch {
  // Ignorar si sessionStorage no está disponible
}

if (pista && tarjeta) {
  armarRegla();
  dibujarAvance();
}
