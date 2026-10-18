/* ==========================================================
   alimentos-locales.js — Base curada de alimentos frecuentes
   - Provee alimentos de referencia cada 100 g para búsqueda local e interactiva.
   - Incluye macronutrientes, pesos unitarios para alimentos discretos y categorías.
   - Búsqueda tolerante a mayúsculas, tildes y palabras clave sinónimas.
   Módulo puro: sin dependencias del DOM ni librerías externas.
   ========================================================== */

/**
 * Catálogo base de alimentos frecuentes para reemplazos y simulaciones offline.
 * Valores expresados cada 100 g de porción comestible estándar.
 */
export const ALIMENTOS_BASE = [
  // --- PROTEÍNAS / CARNES / PESCADOS ---
  {
    id: 'pollo-pechuga',
    nombre: 'Pechuga de pollo',
    categoria: 'proteina',
    palabrasClave: ['pollo', 'pechuga', 'ave', 'carne blanca'],
    kcal: 120,
    proteinas: 22.5,
    carbohidratos: 0.0,
    grasas: 2.5
  },
  {
    id: 'carne-lomo',
    nombre: 'Lomo vacuno',
    categoria: 'proteina',
    palabrasClave: ['lomo', 'carne', 'vaca', 'vacuno', 'bife', 'roja', 'ternera'],
    kcal: 140,
    proteinas: 21.0,
    carbohidratos: 0.0,
    grasas: 5.5
  },
  {
    id: 'pescado-merluza',
    nombre: 'Pescado blanco (Merluza)',
    categoria: 'proteina',
    palabrasClave: ['pescado', 'merluza', 'filet', 'blanco', 'mar'],
    kcal: 90,
    proteinas: 18.0,
    carbohidratos: 0.0,
    grasas: 1.5
  },
  {
    id: 'salmon-rosado',
    nombre: 'Salmón rosado',
    categoria: 'proteina',
    palabrasClave: ['salmon', 'rosado', 'pescado', 'omega 3'],
    kcal: 206,
    proteinas: 22.0,
    carbohidratos: 0.0,
    grasas: 12.0
  },
  {
    id: 'atun-natural',
    nombre: 'Atún al natural',
    categoria: 'proteina',
    palabrasClave: ['atun', 'pescado', 'lata', 'al agua'],
    kcal: 116,
    proteinas: 26.0,
    carbohidratos: 0.0,
    grasas: 1.0
  },
  {
    id: 'huevo-entero',
    nombre: 'Huevo de gallina',
    categoria: 'proteina',
    palabrasClave: ['huevo', 'huevos', 'gallina', 'hervido'],
    kcal: 155,
    proteinas: 13.0,
    carbohidratos: 1.1,
    grasas: 11.0,
    unidad_g: 50,
    unidad_nombre: 'unidad'
  },
  {
    id: 'clara-huevo',
    nombre: 'Clara de huevo',
    categoria: 'proteina',
    palabrasClave: ['clara', 'huevo', 'claras'],
    kcal: 50,
    proteinas: 11.0,
    carbohidratos: 0.7,
    grasas: 0.2,
    unidad_g: 33,
    unidad_nombre: 'unidad'
  },
  {
    id: 'tofu-firme',
    nombre: 'Tofu firme',
    categoria: 'proteina',
    palabrasClave: ['tofu', 'soja', 'vegetariano', 'vegano'],
    kcal: 83,
    proteinas: 10.0,
    carbohidratos: 1.5,
    grasas: 5.0
  },
  {
    id: 'queso-magro',
    nombre: 'Queso magro (Port Salut light)',
    categoria: 'lacteo',
    palabrasClave: ['queso', 'magro', 'port salut', 'light', 'lacteo'],
    kcal: 210,
    proteinas: 23.0,
    carbohidratos: 1.5,
    grasas: 12.0
  },
  {
    id: 'yogur-griego',
    nombre: 'Yogur griego natural',
    categoria: 'lacteo',
    palabrasClave: ['yogur', 'griego', 'natural', 'lacteo'],
    kcal: 97,
    proteinas: 9.0,
    carbohidratos: 4.0,
    grasas: 5.0
  },

  // --- CARBOHIDRATOS / ALMIDONES / CEREALES ---
  {
    id: 'arroz-blanco',
    nombre: 'Arroz blanco cocido',
    categoria: 'cereal',
    palabrasClave: ['arroz', 'blanco', 'cocido', 'grano'],
    kcal: 130,
    proteinas: 2.7,
    carbohidratos: 28.0,
    grasas: 0.3
  },
  {
    id: 'arroz-integral',
    nombre: 'Arroz integral cocido',
    categoria: 'cereal',
    palabrasClave: ['arroz', 'integral', 'fibra', 'grano'],
    kcal: 111,
    proteinas: 2.6,
    carbohidratos: 23.0,
    grasas: 0.9
  },
  {
    id: 'papa-cocida',
    nombre: 'Papa cocida',
    categoria: 'vegetal',
    palabrasClave: ['papa', 'patata', 'hervida', 'cocida', 'tuberculo'],
    kcal: 87,
    proteinas: 1.9,
    carbohidratos: 20.0,
    grasas: 0.1
  },
  {
    id: 'batata-cocida',
    nombre: 'Batata cocida',
    categoria: 'vegetal',
    palabrasClave: ['batata', 'camote', 'boniato', 'asada', 'cocida'],
    kcal: 90,
    proteinas: 2.0,
    carbohidratos: 20.7,
    grasas: 0.1
  },
  {
    id: 'fideos-pasta',
    nombre: 'Fideos al dente',
    categoria: 'cereal',
    palabrasClave: ['fideos', 'pasta', 'espaguetis', 'tallarines', 'pasta cocida'],
    kcal: 157,
    proteinas: 5.8,
    carbohidratos: 30.7,
    grasas: 0.9
  },
  {
    id: 'avena-copos',
    nombre: 'Avena en copos',
    categoria: 'cereal',
    palabrasClave: ['avena', 'copos', 'harina de avena', 'cereal'],
    kcal: 389,
    proteinas: 16.9,
    carbohidratos: 66.3,
    grasas: 6.9
  },
  {
    id: 'pan-integral',
    nombre: 'Pan integral',
    categoria: 'cereal',
    palabrasClave: ['pan', 'integral', 'rodaja', 'rebanada', 'tostada'],
    kcal: 250,
    proteinas: 9.0,
    carbohidratos: 48.0,
    grasas: 3.5,
    unidad_g: 30,
    unidad_nombre: 'rebanada'
  },
  {
    id: 'lentejas-cocidas',
    nombre: 'Lentejas cocidas',
    categoria: 'legumbre',
    palabrasClave: ['lentejas', 'legumbres', 'guiso'],
    kcal: 116,
    proteinas: 9.0,
    carbohidratos: 20.1,
    grasas: 0.4
  },
  {
    id: 'garbanzos-cocidos',
    nombre: 'Garbanzos cocidos',
    categoria: 'legumbre',
    palabrasClave: ['garbanzos', 'legumbres'],
    kcal: 164,
    proteinas: 8.9,
    carbohidratos: 27.4,
    grasas: 2.6
  },

  // --- FRUTAS / VERDURAS / GRASAS ---
  {
    id: 'fruta-manzana',
    nombre: 'Manzana',
    categoria: 'fruta',
    palabrasClave: ['manzana', 'fruta', 'roja', 'verde'],
    kcal: 52,
    proteinas: 0.3,
    carbohidratos: 14.0,
    grasas: 0.2,
    unidad_g: 150,
    unidad_nombre: 'unidad'
  },
  {
    id: 'fruta-banana',
    nombre: 'Banana',
    categoria: 'fruta',
    palabrasClave: ['banana', 'platano', 'fruta'],
    kcal: 89,
    proteinas: 1.1,
    carbohidratos: 22.8,
    grasas: 0.3,
    unidad_g: 120,
    unidad_nombre: 'unidad'
  },
  {
    id: 'grasa-palta',
    nombre: 'Palta',
    categoria: 'grasa',
    palabrasClave: ['palta', 'aguacate', 'grasa saludable'],
    kcal: 160,
    proteinas: 2.0,
    carbohidratos: 8.5,
    grasas: 14.7,
    unidad_g: 150,
    unidad_nombre: 'unidad'
  },
  {
    id: 'grasa-oliva',
    nombre: 'Aceite de oliva',
    categoria: 'grasa',
    palabrasClave: ['aceite', 'oliva', 'extra virgen', 'grasa'],
    kcal: 884,
    proteinas: 0.0,
    carbohidratos: 0.0,
    grasas: 100.0
  },
  {
    id: 'grasa-nueces',
    nombre: 'Nueces',
    categoria: 'grasa',
    palabrasClave: ['nueces', 'frutos secos', 'nuez'],
    kcal: 654,
    proteinas: 15.2,
    carbohidratos: 13.7,
    grasas: 65.2
  }
];

/**
 * Normaliza una cadena de texto para comparaciones insensibles a mayúsculas y acentos.
 * @param {*} texto
 * @returns {string}
 */
export function normalizarTexto(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca alimentos dentro del catálogo base según un término de búsqueda.
 * @param {string} termino - Consulta ingresada por el usuario.
 * @param {Array<Object>} [catalogo=ALIMENTOS_BASE] - Catálogo donde buscar.
 * @returns {Array<Object>} Lista de alimentos coincidentes.
 */
export function buscarAlimentosLocales(termino, catalogo = ALIMENTOS_BASE) {
  if (!Array.isArray(catalogo) || catalogo.length === 0) return [];

  const limpio = normalizarTexto(termino);
  if (!limpio) return [];

  // Comodín para explorar todo el catálogo
  if (limpio === 'todos' || limpio === '*') {
    return [...catalogo];
  }

  const palabras = limpio.split(/\s+/).filter(Boolean);

  return catalogo.filter((item) => {
    if (!item || typeof item !== 'object') return false;

    const nombreNorm = normalizarTexto(item.nombre);
    const catNorm = normalizarTexto(item.categoria);
    const palabrasClaveNorm = Array.isArray(item.palabrasClave)
      ? item.palabrasClave.map(normalizarTexto).join(' ')
      : '';

    const corpus = `${nombreNorm} ${catNorm} ${palabrasClaveNorm}`;

    // Coincidencia: cada palabra de la búsqueda debe estar presente en el corpus del alimento
    return palabras.every((palabra) => corpus.includes(palabra));
  });
}
