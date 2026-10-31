/* ==========================================================
   objetivo-ui.js — "Mi objetivo" en el perfil del alumno
   "Registrar peso" abre una regla deslizable (1 marca = 100 g) con una
   aguja fija al centro; al guardar se actualizan el peso actual y la barra.
   Sincronización transversal de pesajes y metas en tiempo real.
   Cero innerHTML con variables (Regla de Oro 1).
   ========================================================== */

export const STORAGE_KEY_PESO_ACTUAL = 'appcalorias_peso_actual';
export const STORAGE_KEY_HISTORIAL_PESAJES = 'appcalorias_historial_pesajes';
export const EVENTO_PESO_ACTUALIZADO = 'appcalorias:peso_actualizado';

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

const el = (sel) => (typeof document !== 'undefined' ? document.querySelector(sel) : null);

let tarjeta = el(SELECTORES.tarjeta);
let botonAbrir = el(SELECTORES.botonAbrir);
let form = el(SELECTORES.form);
let regla = el(SELECTORES.regla);
let ventana = el(SELECTORES.ventana);
let pista = el(SELECTORES.pista);
let textoRegla = el(SELECTORES.textoRegla);
let textoActual = el(SELECTORES.textoActual);
let barra = el(SELECTORES.barra);

function actualizarReferenciasDOM() {
  if (typeof document === 'undefined') return;
  if (!tarjeta) tarjeta = el(SELECTORES.tarjeta);
  if (!botonAbrir) botonAbrir = el(SELECTORES.botonAbrir);
  if (!form) form = el(SELECTORES.form);
  if (!regla) regla = el(SELECTORES.regla);
  if (!ventana) ventana = el(SELECTORES.ventana);
  if (!pista) pista = el(SELECTORES.pista);
  if (!textoRegla) textoRegla = el(SELECTORES.textoRegla);
  if (!textoActual) textoActual = el(SELECTORES.textoActual);
  if (!barra) barra = el(SELECTORES.barra);
}

let inicio = Number(tarjeta?.dataset?.inicio || 0);
let meta = Number(tarjeta?.dataset?.meta || 0);
let actual = Number(tarjeta?.dataset?.actual || 0);
let marcaElegida = 0;

// 72.4 -> "72,4"
export function formatear(kg) {
  if (typeof kg !== 'number' || Number.isNaN(kg)) return '—';
  return kg.toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

export const pesoDeMarca = (marca) => Math.round((PESO_MIN + marca / MARCAS_POR_KG) * 10) / 10;
export const marcaDePeso = (kg) => Math.round((kg - PESO_MIN) * MARCAS_POR_KG);
export const limitar = (marca) => Math.min(Math.max(marca, 0), TOTAL_MARCAS);

// ---------- Avance hacia la meta (sirve para bajar o subir de peso) ----------
export function dibujarAvance() {
  actualizarReferenciasDOM();
  if (!textoActual || !barra) return;
  const recorrido = meta - inicio;
  const avance = recorrido === 0 ? 1 : (actual - inicio) / recorrido;
  const porcentaje = Math.round(Math.min(Math.max(avance, 0), 1) * 100);
  textoActual.textContent = `${formatear(actual)} kg`;
  if (barra.firstElementChild) {
    barra.firstElementChild.style.width = `${porcentaje}%`;
  }
  barra.setAttribute('aria-valuenow', String(porcentaje));
}

// ---------- Regla ----------
export function armarRegla() {
  actualizarReferenciasDOM();
  if (!pista) return;
  while (pista.firstChild) {
    pista.removeChild(pista.firstChild);
  }
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

export function mostrarMarca(marca) {
  actualizarReferenciasDOM();
  marcaElegida = marca;
  const kg = pesoDeMarca(marca);
  if (textoRegla) textoRegla.textContent = formatear(kg);
  if (regla) {
    regla.setAttribute('aria-valuenow', String(kg));
    regla.setAttribute('aria-valuetext', `${formatear(kg)} kg`);
  }
}

export function irAMarca(marca, suave = false) {
  actualizarReferenciasDOM();
  const destino = limitar(marca);
  if (ventana) {
    ventana.scrollTo({ left: destino * ANCHO_MARCA, behavior: suave ? 'smooth' : 'auto' });
  }
  mostrarMarca(destino);
}

// La marca bajo la aguja sale de cuánto se deslizó la ventana
let pendiente = false;
if (ventana) {
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
  const soltar = () => {
    if (!arrastre) return;
    arrastre = null;
    ventana.classList.remove('regla__ventana--arrastrando');
    irAMarca(Math.round(ventana.scrollLeft / ANCHO_MARCA), true);
  };
  ventana.addEventListener('pointerup', soltar);
  ventana.addEventListener('pointercancel', soltar);

  // Rueda del mouse: cada movimiento corre medio kilo
  ventana.addEventListener('wheel', (evento) => {
    const delta = Math.abs(evento.deltaY) > Math.abs(evento.deltaX) ? evento.deltaY : evento.deltaX;
    if (!delta) return;
    evento.preventDefault();
    irAMarca(marcaElegida + Math.sign(delta) * (MARCAS_POR_KG / 2));
  }, { passive: false });
}

// Teclado: flechas de a 100 g, Re Pág / Av Pág de a 1 kg
if (regla) {
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
}

// ---------- Abrir, cancelar y guardar ----------
export function abrir() {
  actualizarReferenciasDOM();
  if (form) form.hidden = false;
  if (botonAbrir) botonAbrir.setAttribute('aria-expanded', 'true');
  irAMarca(marcaDePeso(actual));
  if (regla) regla.focus();
}

export function cerrar() {
  actualizarReferenciasDOM();
  if (form) form.hidden = true;
  if (botonAbrir) {
    botonAbrir.setAttribute('aria-expanded', 'false');
    botonAbrir.focus();
  }
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

/**
 * Registra un nuevo pesaje: actualiza estado interno, sessionStorage,
 * emite el evento reactivo en window y recalcula la barra de avance.
 * @param {number} peso
 * @param {string} [fecha=new Date().toISOString()]
 * @returns {boolean}
 */
export function registrarNuevoPesaje(peso, fecha = new Date().toISOString()) {
  actualizarReferenciasDOM();
  const num = Number(peso);
  if (Number.isNaN(num) || num <= 0) return false;
  actual = num;
  const timestamp = (fecha ? new Date(fecha).getTime() : Date.now()) || Date.now();

  try {
    sessionStorage.setItem(STORAGE_KEY_PESO_ACTUAL, String(actual));
    let historial = [];
    const previo = sessionStorage.getItem(STORAGE_KEY_HISTORIAL_PESAJES);
    if (previo) {
      try {
        const parseado = JSON.parse(previo);
        if (Array.isArray(parseado)) historial = parseado;
      } catch {
        historial = [];
      }
    }
    historial.unshift({
      peso: actual,
      fecha: fecha
    });
    sessionStorage.setItem(STORAGE_KEY_HISTORIAL_PESAJES, JSON.stringify(historial));

    // Sincronizar contexto si está presente en sessionStorage
    try {
      const rawCtx = sessionStorage.getItem('appcalorias_contexto_ultimo');
      if (rawCtx) {
        const parsed = JSON.parse(rawCtx);
        parsed.peso_actual = actual;
        sessionStorage.setItem('appcalorias_contexto_ultimo', JSON.stringify(parsed));
      }
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('appcalorias_contexto_ultimo_')) {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.peso_actual = actual;
            sessionStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      }
    } catch (_) {}
  } catch {
    // Ignorar si sessionStorage no está disponible
  }

  // Emitir evento reactivo oficial
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_PESO_ACTUALIZADO, {
      detail: { peso: actual, fecha, timestamp }
    }));
  }

  dibujarAvance();
  irAMarca(marcaDePeso(actual));
  return true;
}

/**
 * Sincroniza el valor de la regla y el avance del objetivo ante un evento
 * de pesaje externo (e.g. desde progreso.html u otra pantalla).
 * @param {number} nuevoPeso
 */
export function sincronizarPesoExterno(nuevoPeso) {
  actualizarReferenciasDOM();
  const num = Number(nuevoPeso);
  if (Number.isNaN(num) || num <= 0) return;
  actual = num;
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY_PESO_ACTUAL, String(actual));
    } catch (_) {}
  }
  dibujarAvance();
  irAMarca(marcaDePeso(actual));
}

// Escuchar cambios reactivos de peso desde otras pantallas o fuentes
if (typeof window !== 'undefined') {
  window.addEventListener(EVENTO_PESO_ACTUALIZADO, (evento) => {
    const detail = evento?.detail;
    if (detail && detail.peso !== undefined) {
      const num = Number(detail.peso);
      if (!Number.isNaN(num) && num > 0 && Math.abs(num - actual) >= 0.05) {
        sincronizarPesoExterno(num);
      }
    }
  });
}

if (form) {
  form.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrar();
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const elegidoKg = pesoDeMarca(marcaElegida);
    registrarNuevoPesaje(elegidoKg);
    cerrar();
  });
}

// Cargar peso guardado inicial de sessionStorage si existe
try {
  const guardado = sessionStorage.getItem(STORAGE_KEY_PESO_ACTUAL);
  if (guardado !== null && guardado !== '') {
    const num = Number(guardado);
    if (!Number.isNaN(num) && num > 0) {
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
