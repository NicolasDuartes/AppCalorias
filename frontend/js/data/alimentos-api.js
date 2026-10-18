/* ==========================================================
   alimentos-api.js — Búsqueda y gestión de alimentos en Supabase
   - Búsqueda difusa y normalizada vía RPC buscar_alimentos.
   - Consulta individual por ID y lista de categorías.
   - Creación de nuevos alimentos pendientes y propuestas de corrección.
   - Manejo defensivo contra fallos de red y sesiones no autenticadas.
   Módulo ES puro: utiliza supabase.js sin dependencias extras.
   ========================================================== */

import { supabase } from './supabase.js';

/**
 * Categorías oficiales precargadas como fallback ante falta de conexión.
 */
export const CATEGORIAS_DEFECTO = [
  { codigo: 'carnes', nombre: 'Carnes', orden: 1 },
  { codigo: 'pescados', nombre: 'Pescados y mariscos', orden: 2 },
  { codigo: 'huevos', nombre: 'Huevos', orden: 3 },
  { codigo: 'lacteos', nombre: 'Lácteos', orden: 4 },
  { codigo: 'cereales', nombre: 'Cereales, panes y pastas', orden: 5 },
  { codigo: 'legumbres', nombre: 'Legumbres', orden: 6 },
  { codigo: 'verduras', nombre: 'Verduras', orden: 7 },
  { codigo: 'frutas', nombre: 'Frutas', orden: 8 },
  { codigo: 'grasas', nombre: 'Grasas, aceites y frutos secos', orden: 9 },
  { codigo: 'dulces', nombre: 'Dulces y azúcares', orden: 10 },
  { codigo: 'bebidas', nombre: 'Bebidas', orden: 11 },
  { codigo: 'preparaciones', nombre: 'Preparaciones', orden: 12 }
];

/**
 * Normaliza un registro de alimento para garantizar propiedades uniformes.
 * @param {Object} item
 * @returns {Object}
 */
function normalizarAlimento(item) {
  if (!item || typeof item !== 'object') return null;
  const porcionTexto = item.porcion_texto || (item.porcion_g ? `${item.porcion_g} g` : '');
  return {
    ...item,
    kcal: Number(item.kcal) || 0,
    proteinas: Number(item.proteinas) || 0,
    carbohidratos: Number(item.carbohidratos) || 0,
    grasas: Number(item.grasas) || 0,
    fibra: Number(item.fibra) || 0,
    sodio: Number(item.sodio) || 0,
    porcion_g: item.porcion_g != null ? Number(item.porcion_g) : null,
    porcion_texto: item.porcion_texto || null,
    porcion_desc: porcionTexto,
    unidad_nombre: item.unidad_nombre || null,
    unidad_g: item.unidad_g != null ? Number(item.unidad_g) : null,
    sinonimos: Array.isArray(item.sinonimos) ? item.sinonimos : []
  };
}

/**
 * Busca alimentos en la base de datos usando el RPC buscar_alimentos.
 * @param {string} texto - Texto de búsqueda (nombre, marca, sinónimos)
 * @param {string} [categoria] - Código de categoría (ej. 'carnes', 'lacteos')
 * @param {number} [limite=20] - Máximo de resultados (1-50)
 * @returns {Promise<Array<{id, nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fibra, sodio, porcion_g, porcion_desc}>>}
 */
export async function buscarAlimentos(texto, categoria = null, limite = 20) {
  try {
    const textoLimpio = (texto || '').trim();
    const limiteSeguro = Math.min(Math.max(Number(limite) || 20, 1), 50);

    // El RPC buscar_alimentos exige al menos 2 caracteres en el texto de búsqueda
    if (textoLimpio.length >= 2) {
      const { data, error } = await supabase.rpc('buscar_alimentos', {
        p_texto: textoLimpio,
        p_categoria: categoria || null,
        p_limite: limiteSeguro
      });

      if (!error && Array.isArray(data)) {
        return data.map(normalizarAlimento);
      }
    }

    // Si el texto es corto pero se indicó categoría, consultar directamente por categoría
    if (categoria) {
      let query = supabase
        .from('alimentos')
        .select('*')
        .eq('categoria', categoria)
        .eq('estado_revision', 'aprobado');

      if (textoLimpio.length > 0) {
        query = query.ilike('nombre', `%${textoLimpio}%`);
      }

      const { data, error } = await query.limit(limiteSeguro);
      if (!error && Array.isArray(data)) {
        return data.map(normalizarAlimento);
      }
    }

    return [];
  } catch (err) {
    console.warn('Error en buscarAlimentos:', err);
    return [];
  }
}

/**
 * Obtiene un alimento por su ID.
 * @param {string} id - UUID del alimento
 * @returns {Promise<Object|null>}
 */
export async function obtenerAlimento(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return normalizarAlimento(data);
  } catch (err) {
    console.warn('Error en obtenerAlimento:', err);
    return null;
  }
}

/**
 * Crea un alimento nuevo (queda como 'pendiente' para revisión).
 * @param {Object} datos - Propiedades nutricionales e identificación del alimento
 * @returns {Promise<Object>} Resultado con el alimento creado o error
 */
export async function crearAlimento(datos) {
  if (!datos || typeof datos !== 'object') {
    return { data: null, error: new Error('Datos requeridos para crear alimento') };
  }

  try {
    const payload = {
      nombre: String(datos.nombre || '').trim(),
      categoria: datos.categoria,
      coccion: datos.coccion || 'listo',
      marca: datos.marca ? String(datos.marca).trim() : null,
      kcal: Number(datos.kcal) || 0,
      proteinas: Number(datos.proteinas ?? datos.p ?? 0),
      carbohidratos: Number(datos.carbohidratos ?? datos.c ?? 0),
      grasas: Number(datos.grasas ?? datos.g ?? 0),
      porcion_g: datos.porcion_g != null ? Number(datos.porcion_g) : null,
      porcion_texto: datos.porcion_texto || datos.porcion_desc || null,
      unidad_nombre: datos.unidad_nombre || null,
      unidad_g: datos.unidad_g != null ? Number(datos.unidad_g) : null,
      sinonimos: Array.isArray(datos.sinonimos) ? datos.sinonimos : [],
      fuente: datos.fuente || 'alumno'
    };

    const { data, error } = await supabase
      .from('alimentos')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error al crear alimento en Supabase:', error);
      return { data: null, error };
    }

    const normalizado = normalizarAlimento(data);
    return { ...normalizado, data: normalizado, error: null };
  } catch (err) {
    console.warn('Excepción al crear alimento:', err);
    return { data: null, error: err };
  }
}

/**
 * Propone una corrección sobre un alimento aprobado.
 * Requiere el alimento aprobado existente; fusiona los cambios propuestos con los datos vigentes.
 * @param {string} alimentoId - UUID del alimento aprobado
 * @param {Object} cambios - Campos a actualizar
 * @param {string} motivo - Motivo o justificación de la corrección
 * @returns {Promise<Object>}
 */
export async function proponerCorreccion(alimentoId, cambios = {}, motivo = '') {
  if (!alimentoId) {
    return { data: null, error: new Error('ID de alimento requerido') };
  }

  try {
    const base = await obtenerAlimento(alimentoId);
    if (!base) {
      return { data: null, error: new Error('Alimento aprobado no encontrado') };
    }

    const payload = {
      alimento_id: alimentoId,
      nombre: String(cambios.nombre ?? base.nombre).trim(),
      categoria: cambios.categoria ?? base.categoria,
      coccion: cambios.coccion ?? base.coccion,
      marca: cambios.marca !== undefined ? (cambios.marca ? String(cambios.marca).trim() : null) : base.marca,
      kcal: Number(cambios.kcal ?? base.kcal),
      proteinas: Number(cambios.proteinas ?? cambios.p ?? base.proteinas),
      carbohidratos: Number(cambios.carbohidratos ?? cambios.c ?? base.carbohidratos),
      grasas: Number(cambios.grasas ?? cambios.g ?? base.grasas),
      porcion_g: (cambios.porcion_g !== undefined ? cambios.porcion_g : base.porcion_g) != null
        ? Number(cambios.porcion_g ?? base.porcion_g)
        : null,
      porcion_texto: cambios.porcion_texto ?? cambios.porcion_desc ?? base.porcion_texto,
      unidad_nombre: cambios.unidad_nombre !== undefined ? cambios.unidad_nombre : base.unidad_nombre,
      unidad_g: (cambios.unidad_g !== undefined ? cambios.unidad_g : base.unidad_g) != null
        ? Number(cambios.unidad_g ?? base.unidad_g)
        : null,
      sinonimos: Array.isArray(cambios.sinonimos) ? cambios.sinonimos : (base.sinonimos || []),
      nota: motivo ? String(motivo).trim() : null,
      estado: 'pendiente'
    };

    const { data, error } = await supabase
      .from('correcciones_alimento')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error al proponer corrección:', error);
      return { data: null, error };
    }

    return { ...data, data, error: null };
  } catch (err) {
    console.warn('Excepción al proponer corrección:', err);
    return { data: null, error: err };
  }
}

/**
 * Obtiene las categorías de alimentos disponibles.
 * Ordenadas según su secuencia nutricional predefinida.
 * @returns {Promise<Array<{codigo: string, nombre: string, orden: number}>>}
 */
export async function obtenerCategorias() {
  try {
    const { data, error } = await supabase
      .from('categorias_alimento')
      .select('codigo, nombre, orden')
      .order('orden', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
    return CATEGORIAS_DEFECTO;
  } catch (err) {
    console.warn('Error al obtener categorías, usando fallback:', err);
    return CATEGORIAS_DEFECTO;
  }
}
