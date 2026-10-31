/* ==========================================================
   plantillas-ui.js — Catálogo y selección de plantillas de planes para Coach
   - Permite al coach explorar el catálogo de plantillas predefinidas.
   - Cálculo y desglose de macronutrientes por Atwater (4P + 4C + 9G).
   - Barras proporcionales de reparto de energía.
   - Guarda la composición en sessionStorage ('appcalorias_plantilla_seleccionada')
     al pulsar "Usar plantilla" para precargar en plan-editor-ui.js.
   - Control de acceso por rol 'coach' con exigirRol.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   - Regla de Oro 1: Cero innerHTML con datos variables.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import '../utils/navegacion.js';

/**
 * Mapa centralizado de selectores del DOM para plantillas.html.
 */
export const SELECTORES = {
  encabezado: '.encabezado',
  titulo: '.encabezado .titulo',
  subtitulo: '#subtitulo-catalogo',
  botonVolver: '#boton-volver',
  listaPlantillas: '#lista-plantillas',
  tplPlantillaCard: '#tpl-plantilla-card',
  barraInferior: '.barra-inferior',
  navPlantillas: '.barra-inferior a[href*="plantillas.html"]',
  navClientes: '.barra-inferior a[href*="clientes.html"]',
  navAlimentos: '.barra-inferior a[href*="alimentos-revision.html"]',
  navPerfil: '.barra-inferior a[href*="perfil.html"]'
};

/**
 * Catálogo base de plantillas de planes predefinidas para el coach.
 */
export const PLANTILLAS_BASE = [
  {
    id: 'deficit-moderado',
    titulo: 'Déficit Moderado 1.800 kcal (High Protein)',
    descripcion: 'Pérdida de grasa sostenida con alta ingesta proteica para preservar masa muscular.',
    tags: [
      { texto: 'Déficit', clase: 'tag--verde' },
      { texto: 'High Protein', clase: 'tag--azul' }
    ],
    kcal: 1800,
    macros: { p: 150, c: 180, g: 53 },
    comidasCount: 4,
    reparto: { p: 33, c: 40, g: 27 },
    comidas: {
      'Desayuno': {
        titulo: 'Omelette de claras con avena y banana',
        linea: '420 kcal · P 35 · C 45 · G 11',
        cantidad: '1 porción (200 g)',
        kcal: 420,
        p: 35,
        c: 45,
        g: 11,
        gramos: 200
      },
      'Almuerzo': {
        titulo: 'Pechuga de pollo grillada con arroz integral y brócoli',
        linea: '520 kcal · P 48 · C 55 · G 12',
        cantidad: '1 porción (350 g)',
        kcal: 520,
        p: 48,
        c: 55,
        g: 12,
        gramos: 350
      },
      'Merienda': {
        titulo: 'Yogur proteico con frutos rojos y nueces',
        linea: '360 kcal · P 27 · C 35 · G 12',
        cantidad: '1 porción (220 g)',
        kcal: 360,
        p: 27,
        c: 35,
        g: 12,
        gramos: 220
      },
      'Cena': {
        titulo: 'Filete de merluza con puré de calabaza y ensalada',
        linea: '500 kcal · P 40 · C 45 · G 18',
        cantidad: '1 porción (320 g)',
        kcal: 500,
        p: 40,
        c: 45,
        g: 18,
        gramos: 320
      }
    }
  },
  {
    id: 'hipertrofia-rendimiento',
    titulo: 'Hipertrofia & Rendimiento 2.600 kcal',
    descripcion: 'Superávit energético moderado para ganancia muscular limpia y fuerza en entrenamientos pesados.',
    tags: [
      { texto: 'Hipertrofia', clase: 'tag--naranja' },
      { texto: 'Rendimiento', clase: 'tag--azul' }
    ],
    kcal: 2600,
    macros: { p: 165, c: 325, g: 71 },
    comidasCount: 4,
    reparto: { p: 25, c: 50, g: 25 },
    comidas: {
      'Desayuno': {
        titulo: 'Bowl de avena, leche entera, pasta de maní y banana',
        linea: '650 kcal · P 35 · C 85 · G 18',
        cantidad: '1 porción (350 g)',
        kcal: 650,
        p: 35,
        c: 85,
        g: 18,
        gramos: 350
      },
      'Almuerzo': {
        titulo: 'Lomo vacuno magro con fideos integrales y palta',
        linea: '780 kcal · P 52 · C 95 · G 22',
        cantidad: '1 porción (420 g)',
        kcal: 780,
        p: 52,
        c: 95,
        g: 22,
        gramos: 420
      },
      'Merienda': {
        titulo: 'Tostadas integrales con queso blanco, huevos y jugo natural',
        linea: '510 kcal · P 33 · C 60 · G 14',
        cantidad: '1 porción (300 g)',
        kcal: 510,
        p: 33,
        c: 60,
        g: 14,
        gramos: 300
      },
      'Cena': {
        titulo: 'Pechuga de pollo al horno con papas asadas y vegetales',
        linea: '660 kcal · P 45 · C 85 · G 17',
        cantidad: '1 porción (400 g)',
        kcal: 660,
        p: 45,
        c: 85,
        g: 17,
        gramos: 400
      }
    }
  },
  {
    id: 'recomposicion-corporal',
    titulo: 'Recomposición Corporal 2.100 kcal',
    descripcion: 'Punto de equilibrio isocalórico para atletas intermedios que buscan optimizar masa y reducir grasa.',
    tags: [
      { texto: 'Recomposición', clase: 'tag--violeta' },
      { texto: 'Equilibrado', clase: 'tag--verde' }
    ],
    kcal: 2100,
    macros: { p: 160, c: 225, g: 62 },
    comidasCount: 4,
    reparto: { p: 30, c: 43, g: 27 },
    comidas: {
      'Desayuno': {
        titulo: 'Panqueques de avena y claras con miel y almendras',
        linea: '500 kcal · P 38 · C 55 · G 14',
        cantidad: '1 porción (250 g)',
        kcal: 500,
        p: 38,
        c: 55,
        g: 14,
        gramos: 250
      },
      'Almuerzo': {
        titulo: 'Pechuga de pollo salteada con batata y vegetales al vapor',
        linea: '620 kcal · P 50 · C 70 · G 16',
        cantidad: '1 porción (380 g)',
        kcal: 620,
        p: 50,
        c: 70,
        g: 16,
        gramos: 380
      },
      'Merienda': {
        titulo: 'Yogur griego con manzana picada y mantequilla de almendras',
        linea: '400 kcal · P 30 · C 45 · G 12',
        cantidad: '1 porción (240 g)',
        kcal: 400,
        p: 30,
        c: 45,
        g: 12,
        gramos: 240
      },
      'Cena': {
        titulo: 'Bife magro con quinoa y ensalada fresca mixta',
        linea: '580 kcal · P 42 · C 55 · G 20',
        cantidad: '1 porción (350 g)',
        kcal: 580,
        p: 42,
        c: 55,
        g: 20,
        gramos: 350
      }
    }
  },
  {
    id: 'definicion-extrema',
    titulo: 'Definición Extrema 1.500 kcal',
    descripcion: 'Déficit calórico exigente con carbohidratos controlados para etapas de corte pre-competencia.',
    tags: [
      { texto: 'Definición', clase: 'tag--naranja' },
      { texto: 'Low Carb', clase: 'tag--gris' }
    ],
    kcal: 1500,
    macros: { p: 140, c: 130, g: 47 },
    comidasCount: 4,
    reparto: { p: 37, c: 35, g: 28 },
    comidas: {
      'Desayuno': {
        titulo: 'Revuelto de claras con espinaca y tostada integral',
        linea: '320 kcal · P 30 · C 28 · G 8',
        cantidad: '1 porción (200 g)',
        kcal: 320,
        p: 30,
        c: 28,
        g: 8,
        gramos: 200
      },
      'Almuerzo': {
        titulo: 'Pechuga de pavo grillada con arroz basmati y ensalada verde',
        linea: '450 kcal · P 45 · C 42 · G 10',
        cantidad: '1 porción (300 g)',
        kcal: 450,
        p: 45,
        c: 42,
        g: 10,
        gramos: 300
      },
      'Merienda': {
        titulo: 'Batido de proteína aislada con frutos rojos',
        linea: '270 kcal · P 30 · C 22 · G 6',
        cantidad: '1 porción (250 g)',
        kcal: 270,
        p: 30,
        c: 22,
        g: 6,
        gramos: 250
      },
      'Cena': {
        titulo: 'Atún al natural con calabaza asada y aceite de oliva',
        linea: '460 kcal · P 35 · C 38 · G 23',
        cantidad: '1 porción (280 g)',
        kcal: 460,
        p: 35,
        c: 38,
        g: 23,
        gramos: 280
      }
    }
  }
];

/**
 * Guarda la plantilla seleccionada en sessionStorage para que plan-editor-ui.js la precargue.
 * @param {object} plantilla
 */
export function guardarPlantillaSeleccionada(plantilla) {
  if (!plantilla) return;
  try {
    sessionStorage.setItem('appcalorias_plantilla_seleccionada', JSON.stringify({
      id: plantilla.id,
      nombre: plantilla.titulo,
      kcal: plantilla.kcal,
      p: plantilla.macros.p,
      c: plantilla.macros.c,
      g: plantilla.macros.g,
      comidas: plantilla.comidas,
      seleccionada_en: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('No se pudo guardar la plantilla en sessionStorage:', err);
  }
}

/**
 * Construye y renderiza una tarjeta de plantilla en el DOM de forma segura sin innerHTML.
 * @param {object} plantilla
 * @param {HTMLTemplateElement} tpl
 * @param {string|null} clienteId
 * @returns {HTMLElement}
 */
export function crearTarjetaPlantilla(plantilla, tpl, clienteId = null) {
  let card;
  if (tpl && tpl.content) {
    const clon = tpl.content.cloneNode(true);
    card = clon.querySelector('.card--plantilla') || clon.firstElementChild;
  } else {
    card = document.createElement('article');
    card.className = 'card card--plantilla';
  }

  card.dataset.plantillaId = plantilla.id;

  const tituloEl = card.querySelector('[data-ref="titulo"]');
  if (tituloEl) {
    tituloEl.textContent = plantilla.titulo;
  }

  const descripcionEl = card.querySelector('[data-ref="descripcion"]');
  if (descripcionEl) {
    descripcionEl.textContent = plantilla.descripcion;
  }

  const tagsContenedor = card.querySelector('[data-ref="tags"]');
  if (tagsContenedor) {
    tagsContenedor.textContent = '';
    (plantilla.tags || []).forEach((tag) => {
      const span = document.createElement('span');
      span.className = `tag ${tag.clase}`;
      span.textContent = tag.texto;
      tagsContenedor.appendChild(span);
    });
  }

  const kcalEl = card.querySelector('[data-ref="kcal"]');
  if (kcalEl) {
    kcalEl.textContent = Number(plantilla.kcal).toLocaleString('es-AR');
  }

  const comidasCountEl = card.querySelector('[data-ref="comidas-count"]');
  if (comidasCountEl) {
    comidasCountEl.textContent = `${plantilla.comidasCount} comidas`;
  }

  const barraPEl = card.querySelector('[data-ref="barra-p"]');
  if (barraPEl) {
    barraPEl.style.width = `${plantilla.reparto.p}%`;
  }

  const barraCEl = card.querySelector('[data-ref="barra-c"]');
  if (barraCEl) {
    barraCEl.style.width = `${plantilla.reparto.c}%`;
  }

  const barraGEl = card.querySelector('[data-ref="barra-g"]');
  if (barraGEl) {
    barraGEl.style.width = `${plantilla.reparto.g}%`;
  }

  const macroPEl = card.querySelector('[data-ref="macro-p"]');
  if (macroPEl) {
    macroPEl.textContent = String(plantilla.macros.p);
  }

  const macroCEl = card.querySelector('[data-ref="macro-c"]');
  if (macroCEl) {
    macroCEl.textContent = String(plantilla.macros.c);
  }

  const macroGEl = card.querySelector('[data-ref="macro-g"]');
  if (macroGEl) {
    macroGEl.textContent = String(plantilla.macros.g);
  }

  const btnUsar = card.querySelector('[data-ref="btn-usar"]');
  if (btnUsar) {
    const paramCliente = clienteId ? `&cliente=${encodeURIComponent(clienteId)}` : '';
    btnUsar.setAttribute('href', `plan-editor.html?plantilla=${encodeURIComponent(plantilla.id)}${paramCliente}`);
    btnUsar.addEventListener('click', () => {
      guardarPlantillaSeleccionada(plantilla);
    });
  }

  return card;
}

/**
 * Renderiza el catálogo completo de plantillas en el contenedor #lista-plantillas.
 * @param {Array<object>} plantillas
 * @param {string|null} clienteId
 */
export function renderizarCatalogoPlantillas(plantillas = PLANTILLAS_BASE, clienteId = null) {
  const listaEl = document.querySelector(SELECTORES.listaPlantillas);
  if (!listaEl) return;

  const tpl = document.querySelector(SELECTORES.tplPlantillaCard);
  listaEl.textContent = '';

  const fragmento = document.createDocumentFragment();
  plantillas.forEach((plantilla) => {
    const card = crearTarjetaPlantilla(plantilla, tpl, clienteId);
    fragmento.appendChild(card);
  });

  listaEl.appendChild(fragmento);
}

/**
 * Inicializa el controlador de la pantalla de plantillas.
 */
export async function iniciarPlantillasUI() {
  const cuenta = await exigirRol('coach');
  if (!cuenta) return;

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get('cliente');

  const btnVolver = document.querySelector(SELECTORES.botonVolver);
  const subtituloEl = document.querySelector(SELECTORES.subtitulo);

  if (clienteId) {
    if (btnVolver) {
      btnVolver.setAttribute('href', `plan-nuevo.html?cliente=${encodeURIComponent(clienteId)}`);
      btnVolver.removeAttribute('hidden');
    }
    if (subtituloEl) {
      subtituloEl.textContent = `Seleccioná una plantilla base para el plan de ${clienteId}.`;
    }
  }

  renderizarCatalogoPlantillas(PLANTILLAS_BASE, clienteId);
}

// Auto-inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarPlantillasUI);
} else {
  iniciarPlantillasUI();
}
