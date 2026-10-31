/* ==========================================================
   supabase.js — Cliente resiliente de Supabase con Mock Store Offline
   - Soporte dual: cliente oficial Supabase vía CDN cuando hay conexión;
     fallback automático e inadvertido a Mock Store local en caso de
     desconexión, fallo de CDN o excepciones de red.
   - Mock Store reactivo en memoria con persistencia en localStorage/sessionStorage
     para las tablas clave (profiles, meal_plans, plan_meals, plan_items,
     daily_logs, logged_items, contextos_energeticos, permisos_alumno, alimentos).
   - Soporte completo para consultas encadenadas (.from().select().eq().single(),
     .insert(), .update(), .delete(), .rpc()).
   - Módulo Auth offline (.getSession(), .signInWithPassword(), .signUp(), .signOut()).
   ========================================================== */

const SUPABASE_URL = 'https://yqvrssewbltzxmlvynuw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7yOo8nZzdSu5izzN-KmnGw_cmwwWY-v';
const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEY_STORE = 'appcalorias_offline_store_v1';
const STORAGE_KEY_AUTH = 'appcalorias_auth_session_v1';

// -------------------------------------------------------------
// Utilidades auxiliares
// -------------------------------------------------------------

function generarUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function matchLike(str, pattern, caseInsensitive = false) {
  if (str == null) return false;
  let s = String(str);
  let p = String(pattern);
  if (caseInsensitive) {
    s = s.toLowerCase();
    p = p.toLowerCase();
  }
  const regexStr = '^' + p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.') + '$';
  return new RegExp(regexStr).test(s);
}

function matchValue(rowVal, targetVal) {
  if (rowVal === targetVal) return true;
  if (rowVal == null && targetVal == null) return true;
  if (rowVal == null || targetVal == null) return false;
  if (typeof targetVal === 'number' && !isNaN(Number(rowVal))) {
    return Number(rowVal) === targetVal;
  }
  if (typeof targetVal === 'boolean') {
    return Boolean(rowVal) === targetVal;
  }
  return String(rowVal) === String(targetVal);
}

function normalizarTexto(txt) {
  return String(txt || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isOfflineMode() {
  if (typeof globalThis !== 'undefined' && globalThis.__FORCE_OFFLINE__ === true) {
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  return false;
}

export function setForceOffline(force) {
  if (typeof globalThis !== 'undefined') {
    globalThis.__FORCE_OFFLINE__ = Boolean(force);
  }
}

function isNetworkError(err) {
  if (!err) return false;
  if (typeof err === 'string') {
    const s = err.toLowerCase();
    return s.includes('failed to fetch') || s.includes('network') || s.includes('connection') || s.includes('offline') || s.includes('timeout') || s.includes('load failed') || s.includes('err_');
  }
  const msg = (err.message || '').toLowerCase();
  const name = (err.name || '').toLowerCase();
  return (
    (name === 'typeerror' && (msg.includes('fetch') || msg.includes('network') || msg.includes('failed'))) ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('connection refused') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('load failed') ||
    err.status === 0
  );
}

// -------------------------------------------------------------
// Semillas de datos por defecto para el Mock Store
// -------------------------------------------------------------

function getFechaHoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function createInitialMockData() {
  const alumnoId = '00000000-0000-0000-0000-000000000001';
  const coachId = '00000000-0000-0000-0000-000000000002';
  const hoyISO = getFechaHoyISO();

  return {
    profiles: [
      {
        id: alumnoId,
        email: 'alumno@ejemplo.com',
        username: 'alumno_demo',
        full_name: 'Alumno Demo',
        role: 'alumno',
        client_code: 'NF-1001-OK',
        coach_id: coachId,
        plan_modalidad: 'mantenimiento',
        sexo: 'M',
        fecha_nacimiento: '1995-05-15',
        created_at: '2026-01-01T00:00:00.000Z'
      },
      {
        id: coachId,
        email: 'coach@ejemplo.com',
        username: 'coach_demo',
        full_name: 'Coach Demo',
        role: 'coach',
        client_code: null,
        created_at: '2026-01-01T00:00:00.000Z'
      }
    ],

    categorias_alimento: [
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
    ],

    alimentos: [
      {
        id: 'alim-001',
        nombre: 'Pechuga de pollo',
        categoria: 'carnes',
        coccion: 'cocido',
        marca: null,
        kcal: 120,
        proteinas: 22.5,
        carbohidratos: 0.0,
        grasas: 2.5,
        fibra: 0.0,
        sodio: 70,
        porcion_g: 150,
        porcion_texto: '150 g',
        unidad_nombre: 'filet',
        unidad_g: 150,
        sinonimos: ['pollo', 'pechuga', 'ave', 'carne blanca'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-002',
        nombre: 'Lomo vacuno',
        categoria: 'carnes',
        coccion: 'cocido',
        marca: null,
        kcal: 140,
        proteinas: 21.0,
        carbohidratos: 0.0,
        grasas: 5.5,
        fibra: 0.0,
        sodio: 60,
        porcion_g: 150,
        porcion_texto: '150 g',
        unidad_nombre: 'bife',
        unidad_g: 150,
        sinonimos: ['lomo', 'carne', 'vaca', 'vacuno', 'bife'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-003',
        nombre: 'Pescado blanco (Merluza)',
        categoria: 'pescados',
        coccion: 'cocido',
        marca: null,
        kcal: 90,
        proteinas: 18.0,
        carbohidratos: 0.0,
        grasas: 1.5,
        fibra: 0.0,
        sodio: 80,
        porcion_g: 200,
        porcion_texto: '200 g',
        unidad_nombre: 'filet',
        unidad_g: 100,
        sinonimos: ['pescado', 'merluza', 'filet'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-004',
        nombre: 'Salmón rosado',
        categoria: 'pescados',
        coccion: 'cocido',
        marca: null,
        kcal: 206,
        proteinas: 22.0,
        carbohidratos: 0.0,
        grasas: 12.0,
        fibra: 0.0,
        sodio: 50,
        porcion_g: 150,
        porcion_texto: '150 g',
        unidad_nombre: 'porcion',
        unidad_g: 150,
        sinonimos: ['salmon', 'rosado', 'pescado', 'omega 3'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-005',
        nombre: 'Huevo entero',
        categoria: 'huevos',
        coccion: 'cocido',
        marca: null,
        kcal: 155,
        proteinas: 13.0,
        carbohidratos: 1.1,
        grasas: 11.0,
        fibra: 0.0,
        sodio: 124,
        porcion_g: 50,
        porcion_texto: '1 unidad (50 g)',
        unidad_nombre: 'unidad',
        unidad_g: 50,
        sinonimos: ['huevo', 'huevos', 'duro', 'hervido'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-006',
        nombre: 'Avena tradicional',
        categoria: 'cereales',
        coccion: 'crudo',
        marca: null,
        kcal: 389,
        proteinas: 16.9,
        carbohidratos: 66.3,
        grasas: 6.9,
        fibra: 10.6,
        sodio: 2,
        porcion_g: 40,
        porcion_texto: '40 g · 4 cucharadas',
        unidad_nombre: 'cucharada',
        unidad_g: 10,
        sinonimos: ['avena', 'copos', 'quaker', 'cereal'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-007',
        nombre: 'Arroz blanco',
        categoria: 'cereales',
        coccion: 'cocido',
        marca: null,
        kcal: 130,
        proteinas: 2.7,
        carbohidratos: 28.2,
        grasas: 0.3,
        fibra: 0.4,
        sodio: 1,
        porcion_g: 150,
        porcion_texto: '1 taza cocida (150 g)',
        unidad_nombre: 'taza',
        unidad_g: 150,
        sinonimos: ['arroz', 'grano'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-008',
        nombre: 'Yogur griego natural',
        categoria: 'lacteos',
        coccion: 'listo',
        marca: null,
        kcal: 97,
        proteinas: 9.0,
        carbohidratos: 3.6,
        grasas: 5.0,
        fibra: 0.0,
        sodio: 45,
        porcion_g: 150,
        porcion_texto: '1 pote (150 g)',
        unidad_nombre: 'pote',
        unidad_g: 150,
        sinonimos: ['yogur', 'yogurt', 'griego'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-009',
        nombre: 'Palta (Aguacate)',
        categoria: 'grasas',
        coccion: 'listo',
        marca: null,
        kcal: 160,
        proteinas: 2.0,
        carbohidratos: 8.5,
        grasas: 14.7,
        fibra: 6.7,
        sodio: 7,
        porcion_g: 75,
        porcion_texto: '1/2 unidad (75 g)',
        unidad_nombre: 'media palta',
        unidad_g: 75,
        sinonimos: ['palta', 'aguacate', 'avocado'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      },
      {
        id: 'alim-010',
        nombre: 'Banana',
        categoria: 'frutas',
        coccion: 'listo',
        marca: null,
        kcal: 89,
        proteinas: 1.1,
        carbohidratos: 22.8,
        grasas: 0.3,
        fibra: 2.6,
        sodio: 1,
        porcion_g: 120,
        porcion_texto: '1 unidad mediana (120 g)',
        unidad_nombre: 'unidad',
        unidad_g: 120,
        sinonimos: ['banana', 'platano'],
        estado_revision: 'aprobado',
        fuente: 'equipo'
      }
    ],

    meal_plans: [
      {
        id: 'plan-demo-001',
        alumno_id: alumnoId,
        coach_id: coachId,
        name: 'Plan Mantenimiento Base',
        target_calories: 2000,
        target_protein_g: 140,
        target_carbs_g: 200,
        target_fat_g: 65,
        portions_scheme: null,
        active: true,
        notes: 'Plan estándar balanceado cargado offline',
        created_at: '2026-01-01T12:00:00.000Z',
        updated_at: '2026-01-01T12:00:00.000Z'
      }
    ],

    plan_meals: [
      { id: 'meal-001', plan_id: 'plan-demo-001', meal_type: 'Desayuno', sort_order: 0, notes: '' },
      { id: 'meal-002', plan_id: 'plan-demo-001', meal_type: 'Almuerzo', sort_order: 1, notes: '' },
      { id: 'meal-003', plan_id: 'plan-demo-001', meal_type: 'Merienda', sort_order: 2, notes: '' },
      { id: 'meal-004', plan_id: 'plan-demo-001', meal_type: 'Cena', sort_order: 3, notes: '' }
    ],

    plan_items: [
      {
        id: 'pitem-001',
        plan_meal_id: 'meal-001',
        alimento_id: 'alim-006',
        food_name: 'Avena con leche y fruta',
        group_code: 'cereales',
        portions: 1,
        grams: 250,
        calories: 464,
        protein: 31,
        carbs: 53,
        fat: 14,
        sort_order: 0
      },
      {
        id: 'pitem-002',
        plan_meal_id: 'meal-002',
        alimento_id: 'alim-001',
        food_name: 'Pechuga de pollo con arroz',
        group_code: 'carnes',
        portions: 1,
        grams: 350,
        calories: 570,
        protein: 51,
        carbs: 50,
        fat: 16,
        sort_order: 0
      },
      {
        id: 'pitem-003',
        plan_meal_id: 'meal-003',
        alimento_id: 'alim-008',
        food_name: 'Yogur griego con frutos secos',
        group_code: 'lacteos',
        portions: 1,
        grams: 200,
        calories: 388,
        protein: 21,
        carbs: 38,
        fat: 19,
        sort_order: 0
      },
      {
        id: 'pitem-004',
        plan_meal_id: 'meal-004',
        alimento_id: 'alim-002',
        food_name: 'Lomo vacuno con batata',
        group_code: 'carnes',
        portions: 1,
        grams: 300,
        calories: 545,
        protein: 38,
        carbs: 52,
        fat: 20,
        sort_order: 0
      }
    ],

    daily_logs: [
      {
        id: 'log-demo-001',
        user_id: alumnoId,
        log_date: hoyISO,
        total_calories: 1967,
        total_protein: 141,
        total_carbs: 193,
        total_fat: 69,
        adherence_pct: 98,
        status: 'incompleto',
        coach_reviewed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],

    logged_items: [
      {
        id: 'litem-001',
        daily_log_id: 'log-demo-001',
        meal_type: 'Desayuno',
        food_name: 'Avena con leche y fruta',
        group_code: 'cereales',
        portions: 1,
        grams: 250,
        calories: 464,
        protein: 31,
        carbs: 53,
        fat: 14,
        checked: true,
        sort_order: 0
      },
      {
        id: 'litem-002',
        daily_log_id: 'log-demo-001',
        meal_type: 'Almuerzo',
        food_name: 'Pechuga de pollo con arroz',
        group_code: 'carnes',
        portions: 1,
        grams: 350,
        calories: 570,
        protein: 51,
        carbs: 50,
        fat: 16,
        checked: true,
        sort_order: 0
      },
      {
        id: 'litem-003',
        daily_log_id: 'log-demo-001',
        meal_type: 'agua',
        food_name: 'Agua (2 L)',
        group_code: 'agua',
        portions: 2,
        grams: 2000,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        checked: true,
        sort_order: 999
      }
    ],

    contextos_energeticos: [
      {
        id: 'ctx-demo-001',
        alumno_id: alumnoId,
        sexo: 'M',
        edad_anios: 28,
        peso_kg: 75,
        altura_cm: 178,
        pasos_diarios: 8000,
        met: 6,
        duracion_horas: 1,
        sesiones_semana: 4,
        tipo_dieta: 'mantenimiento',
        bmr_kcal: 1750,
        neat_kcal: 400,
        gasto_sesion_kcal: 450,
        entreno_diario_kcal: 257,
        tdee_kcal: 2407,
        tdee_termogenesis_kcal: 2648,
        ajuste_kcal: 0,
        calorias_objetivo: 2650,
        version_calculo: '1',
        created_at: '2026-01-01T00:00:00.000Z'
      }
    ],

    permisos_alumno: [
      {
        id: 'perm-001',
        alumno_id: alumnoId,
        seccion: 'contexto',
        habilitado_por: coachId
      },
      {
        id: 'perm-002',
        alumno_id: alumnoId,
        seccion: 'plan',
        habilitado_por: coachId
      }
    ],

    correcciones_alimento: []
  };
}

// -------------------------------------------------------------
// Clase MockStore: almacén reactivo y persistente
// -------------------------------------------------------------

class MockStore {
  constructor() {
    this.tables = {};
    this.init();
  }

  init() {
    let saved = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_STORE);
        if (raw) saved = JSON.parse(raw);
      }
    } catch (_) {}

    if (saved && typeof saved === 'object') {
      this.tables = saved;
      // Garantizar que existan todas las tablas base
      const base = createInitialMockData();
      for (const t of Object.keys(base)) {
        if (!Array.isArray(this.tables[t])) {
          this.tables[t] = base[t];
        }
      }
    } else {
      this.tables = createInitialMockData();
      this.save();
    }
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_STORE, JSON.stringify(this.tables));
      }
    } catch (_) {}
  }

  reset() {
    this.tables = createInitialMockData();
    this.save();
    return this.tables;
  }

  getTable(name) {
    if (!this.tables[name]) {
      this.tables[name] = [];
    }
    return this.tables[name];
  }

  from(tableName) {
    return new MockQueryBuilder(this, tableName);
  }

  async rpc(methodName, params = {}) {
    if (methodName === 'buscar_alimentos') {
      const pTexto = normalizarTexto(params.p_texto || '');
      const pCat = params.p_categoria || null;
      const pLim = Math.min(Math.max(Number(params.p_limite) || 20, 1), 50);

      const items = this.getTable('alimentos').filter((a) => {
        if (a.estado_revision && a.estado_revision !== 'aprobado') return false;
        if (pCat && a.categoria !== pCat) return false;
        if (!pTexto) return true;

        const nombreNorm = normalizarTexto(a.nombre);
        const marcaNorm = normalizarTexto(a.marca);
        if (nombreNorm.includes(pTexto) || marcaNorm.includes(pTexto)) return true;

        if (Array.isArray(a.sinonimos)) {
          return a.sinonimos.some((s) => normalizarTexto(s).includes(pTexto));
        }
        return false;
      });

      return { data: items.slice(0, pLim), error: null };
    }

    if (methodName === 'vincular_alumno') {
      const pCodigo = String(params.p_codigo || '').trim().toUpperCase();
      const alumno = this.getTable('profiles').find((p) => p.client_code && p.client_code.toUpperCase() === pCodigo);
      if (alumno) {
        alumno.coach_id = '00000000-0000-0000-0000-000000000002';
        this.save();
        return { data: true, error: null };
      }
      return { data: null, error: { message: 'Código de alumno no encontrado' } };
    }

    if (methodName === 'desvincular_alumno') {
      const pAlumnoId = params.p_alumno_id;
      const alumno = this.getTable('profiles').find((p) => p.id === pAlumnoId);
      if (alumno) {
        alumno.coach_id = null;
        this.save();
        return { data: true, error: null };
      }
      return { data: true, error: null };
    }

    if (methodName === 'usuario_disponible') {
      const pUsuario = normalizarTexto(params.p_usuario);
      const existe = this.getTable('profiles').some((p) => normalizarTexto(p.username) === pUsuario);
      return { data: !existe, error: null };
    }

    if (methodName === 'revisar_alimento') {
      const alim = this.getTable('alimentos').find((a) => a.id === params.p_alimento_id);
      if (alim) {
        alim.estado_revision = params.p_aprobar ? 'aprobado' : 'rechazado';
        alim.revisado_el = new Date().toISOString();
        this.save();
      }
      return { data: true, error: null };
    }

    if (methodName === 'revisar_correccion') {
      const corr = this.getTable('correcciones_alimento').find((c) => c.id === params.p_correccion_id);
      if (corr) {
        corr.estado = params.p_aceptar ? 'aprobada' : 'rechazada';
        corr.motivo_rechazo = params.p_motivo || null;
        corr.revisado_el = new Date().toISOString();
        this.save();
      }
      return { data: true, error: null };
    }

    return { data: null, error: null };
  }
}

// -------------------------------------------------------------
// Clase MockQueryBuilder: soporte encadenado completo
// -------------------------------------------------------------

class MockQueryBuilder {
  constructor(store, tableName) {
    this.store = store;
    this.tableName = tableName;
    this.action = 'select'; // 'select' | 'insert' | 'update' | 'upsert' | 'delete'
    this.payload = null;
    this.upsertOptions = null;
    this.selectColumns = '*';
    this.selectOptions = {};
    this.actionSpecifiedSelect = false;
    this.filters = [];
    this.orders = [];
    this.limitVal = null;
    this.rangeVal = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
  }

  select(columns = '*', options = {}) {
    this.selectColumns = columns || '*';
    this.selectOptions = options || {};
    this.actionSpecifiedSelect = true;
    return this;
  }

  insert(values) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  upsert(values, options = {}) {
    this.action = 'upsert';
    this.payload = values;
    this.upsertOptions = options || {};
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column, value) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column, value) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  like(column, pattern) {
    this.filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  ilike(column, pattern) {
    this.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  is(column, value) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  in(column, values) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  contains(column, value) {
    this.filters.push({ type: 'contains', column, value });
    return this;
  }

  containedBy(column, value) {
    this.filters.push({ type: 'containedBy', column, value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({
      column,
      ascending: options.ascending !== false
    });
    return this;
  }

  limit(count) {
    this.limitVal = Number(count);
    return this;
  }

  range(from, to) {
    this.rangeVal = { from: Number(from), to: Number(to) };
    return this;
  }

  single() {
    this.isSingle = true;
    return this._asPromise();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this._asPromise();
  }

  then(onFulfilled, onRejected) {
    return this._asPromise().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._asPromise().catch(onRejected);
  }

  _asPromise() {
    return Promise.resolve(this.execute());
  }

  _matchRow(row) {
    for (const f of this.filters) {
      const v = row[f.column];
      switch (f.type) {
        case 'eq':
          if (!matchValue(v, f.value)) return false;
          break;
        case 'neq':
          if (matchValue(v, f.value)) return false;
          break;
        case 'gt':
          if (!(Number(v) > Number(f.value))) return false;
          break;
        case 'gte':
          if (!(Number(v) >= Number(f.value))) return false;
          break;
        case 'lt':
          if (!(Number(v) < Number(f.value))) return false;
          break;
        case 'lte':
          if (!(Number(v) <= Number(f.value))) return false;
          break;
        case 'is':
          if (v !== f.value) return false;
          break;
        case 'in':
          if (!Array.isArray(f.value) || !f.value.includes(v)) return false;
          break;
        case 'like':
          if (!matchLike(v, f.value, false)) return false;
          break;
        case 'ilike':
          if (!matchLike(v, f.value, true)) return false;
          break;
        case 'contains':
          if (Array.isArray(v)) {
            if (Array.isArray(f.value)) {
              if (!f.value.every((x) => v.includes(x))) return false;
            } else if (!v.includes(f.value)) {
              return false;
            }
          }
          break;
        default:
          break;
      }
    }
    return true;
  }

  execute() {
    const table = this.store.getTable(this.tableName);

    // 1. INSERT
    if (this.action === 'insert') {
      const rawItems = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];

      for (const item of rawItems) {
        if (!item || typeof item !== 'object') continue;
        const nuevo = {
          id: item.id || generarUUID(),
          created_at: item.created_at || new Date().toISOString(),
          ...item
        };
        table.push(nuevo);
        inserted.push(nuevo);
      }
      this.store.save();

      if (this.isSingle) {
        return { data: inserted[0] || null, error: null };
      }
      return { data: inserted, error: null };
    }

    // 2. UPDATE
    if (this.action === 'update') {
      const updated = [];
      for (const row of table) {
        if (this._matchRow(row)) {
          Object.assign(row, this.payload, {
            updated_at: this.payload?.updated_at || new Date().toISOString()
          });
          updated.push(row);
        }
      }
      this.store.save();

      if (this.isSingle) {
        return { data: updated[0] || null, error: null };
      }
      return { data: updated, error: null };
    }

    // 3. UPSERT
    if (this.action === 'upsert') {
      const conflictKeys = (this.upsertOptions?.onConflict || 'id')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const rawItems = Array.isArray(this.payload) ? this.payload : [this.payload];
      const result = [];

      for (const item of rawItems) {
        if (!item || typeof item !== 'object') continue;
        const matchIdx = table.findIndex((row) =>
          conflictKeys.every((k) => matchValue(row[k], item[k]))
        );

        if (matchIdx >= 0) {
          Object.assign(table[matchIdx], item, {
            updated_at: item.updated_at || new Date().toISOString()
          });
          result.push(table[matchIdx]);
        } else {
          const nuevo = {
            id: item.id || generarUUID(),
            created_at: item.created_at || new Date().toISOString(),
            ...item
          };
          table.push(nuevo);
          result.push(nuevo);
        }
      }
      this.store.save();

      if (this.isSingle) {
        return { data: result[0] || null, error: null };
      }
      return { data: result, error: null };
    }

    // 4. DELETE
    if (this.action === 'delete') {
      const filtered = table.filter((row) => !this._matchRow(row));
      this.store.tables[this.tableName] = filtered;
      this.store.save();
      return { data: null, error: null };
    }

    // 5. SELECT
    let rows = table.filter((row) => this._matchRow(row));
    const totalCount = rows.length;

    // Ordenamiento
    if (this.orders.length > 0) {
      rows.sort((a, b) => {
        for (const o of this.orders) {
          const va = a[o.column];
          const vb = b[o.column];
          if (va !== vb) {
            if (va == null) return o.ascending ? -1 : 1;
            if (vb == null) return o.ascending ? 1 : -1;
            const cmp = va > vb ? 1 : -1;
            return o.ascending ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    // Paginación y límites
    if (this.rangeVal) {
      rows = rows.slice(this.rangeVal.from, this.rangeVal.to + 1);
    } else if (this.limitVal != null) {
      rows = rows.slice(0, this.limitVal);
    }

    // Relaciones anidadas (ej. plan_meals con plan_items(*))
    if (this.tableName === 'plan_meals' && this.selectColumns.includes('plan_items(*)')) {
      const itemsTable = this.store.getTable('plan_items');
      rows = rows.map((meal) => {
        const items = itemsTable
          .filter((it) => it.plan_meal_id === meal.id)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return { ...meal, plan_items: items };
      });
    }

    // Proyección de columnas específicas (si no contiene asterisco ni subconsultas)
    if (
      this.selectColumns &&
      this.selectColumns !== '*' &&
      !this.selectColumns.includes('(*)') &&
      !this.selectColumns.includes('*')
    ) {
      const campos = this.selectColumns.split(',').map((c) => c.trim()).filter(Boolean);
      rows = rows.map((row) => {
        const proyectado = {};
        for (const c of campos) {
          if (c in row) proyectado[c] = row[c];
        }
        return proyectado;
      });
    }

    if (this.selectOptions?.head === true) {
      return { count: totalCount, data: null, error: null };
    }

    if (this.isSingle) {
      if (rows.length === 1) {
        return { data: rows[0], error: null };
      }
      if (rows.length === 0) {
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            details: 'The result contains 0 rows',
            code: 'PGRST116'
          }
        };
      }
      return {
        data: null,
        error: {
          message: 'JSON object requested, multiple rows returned',
          details: `The result contains ${rows.length} rows`,
          code: 'PGRST116'
        }
      };
    }

    if (this.isMaybeSingle) {
      if (rows.length === 1) {
        return { data: rows[0], error: null };
      }
      if (rows.length === 0) {
        return { data: null, error: null };
      }
      return {
        data: null,
        error: {
          message: 'Multiple rows returned for maybeSingle',
          details: `The result contains ${rows.length} rows`
        }
      };
    }

    return {
      data: rows,
      error: null,
      count: this.selectOptions?.count === 'exact' ? totalCount : null
    };
  }
}

// -------------------------------------------------------------
// Clase MockAuth: manejo local y tolerante de sesiones
// -------------------------------------------------------------

class MockAuth {
  constructor(store) {
    this.store = store;
    this.listeners = new Set();
    this.currentSession = null;
    this._initSession();
  }

  _initSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        if (raw) this.currentSession = JSON.parse(raw);
      }
    } catch (_) {}

    // Si no hay sesión previa en storage, usar la del alumno por defecto para pruebas y navegación fluida
    if (!this.currentSession) {
      const demoUser = this.store.getTable('profiles').find((p) => p.role === 'alumno') || {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'alumno@ejemplo.com',
        role: 'alumno',
        username: 'alumno_demo',
        full_name: 'Alumno Demo'
      };

      this.currentSession = {
        access_token: 'mock-offline-token-default',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: demoUser.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: demoUser.email,
          user_metadata: {
            role: demoUser.role,
            username: demoUser.username,
            full_name: demoUser.full_name
          }
        }
      };
    }
  }

  _saveSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        if (this.currentSession) {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(this.currentSession));
        } else {
          localStorage.removeItem(STORAGE_KEY_AUTH);
        }
      }
    } catch (_) {}
  }

  async getSession() {
    return {
      data: { session: this.currentSession },
      error: null
    };
  }

  async getUser() {
    return {
      data: { user: this.currentSession?.user || null },
      error: null
    };
  }

  user() {
    return this.currentSession?.user || null;
  }

  async signInWithPassword({ email, password }) {
    const emailNorm = normalizarTexto(email);
    let profile = this.store.getTable('profiles').find((p) => normalizarTexto(p.email) === emailNorm);

    if (!profile) {
      profile = {
        id: generarUUID(),
        email: email || 'usuario@ejemplo.com',
        username: email ? email.split('@')[0] : 'usuario_demo',
        full_name: 'Usuario Demo',
        role: 'alumno',
        client_code: 'NF-1002-OK',
        coach_id: null,
        created_at: new Date().toISOString()
      };
      this.store.getTable('profiles').push(profile);
      this.store.save();
    }

    const session = {
      access_token: `mock-token-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${Date.now()}`,
      user: {
        id: profile.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: profile.email,
        user_metadata: {
          role: profile.role,
          username: profile.username,
          full_name: profile.full_name
        }
      }
    };

    this.currentSession = session;
    this._saveSession();
    this._notify('SIGNED_IN', session);

    return {
      data: { user: session.user, session },
      error: null
    };
  }

  async signUp({ email, password, options = {} }) {
    const role = options?.data?.role || 'alumno';
    const username = options?.data?.username || (email ? email.split('@')[0] : 'nuevo_usuario');
    const fullName = options?.data?.full_name || '';

    const newProfile = {
      id: generarUUID(),
      email: email || 'nuevo@ejemplo.com',
      username,
      full_name: fullName,
      role,
      client_code: role === 'alumno' ? `NF-${Math.floor(1000 + Math.random() * 9000)}-OK` : null,
      coach_id: null,
      plan_modalidad: 'mantenimiento',
      sexo: 'M',
      created_at: new Date().toISOString()
    };

    this.store.getTable('profiles').push(newProfile);
    this.store.save();

    const session = {
      access_token: `mock-signup-token-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock-refresh-${Date.now()}`,
      user: {
        id: newProfile.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: newProfile.email,
        user_metadata: {
          role: newProfile.role,
          username: newProfile.username,
          full_name: newProfile.full_name
        }
      }
    };

    this.currentSession = session;
    this._saveSession();
    this._notify('SIGNED_IN', session);

    return {
      data: { user: session.user, session },
      error: null
    };
  }

  async signOut() {
    this.currentSession = null;
    this._saveSession();
    this._notify('SIGNED_OUT', null);
    return { error: null };
  }

  async resend() {
    return { data: {}, error: null };
  }

  onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          }
        }
      }
    };
  }

  _notify(event, session) {
    for (const cb of this.listeners) {
      try {
        cb(event, session);
      } catch (_) {}
    }
  }
}

// -------------------------------------------------------------
// ResilientQueryBuilder: Proxy transparente y tolerante
// -------------------------------------------------------------

class ResilientQueryBuilder {
  constructor(tableName, getRealClientFn, store) {
    this.tableName = tableName;
    this.getRealClient = getRealClientFn;
    this.store = store;
    this.operations = [];
  }

  select(...args) {
    this.operations.push({ method: 'select', args });
    return this;
  }

  insert(...args) {
    this.operations.push({ method: 'insert', args });
    return this;
  }

  update(...args) {
    this.operations.push({ method: 'update', args });
    return this;
  }

  upsert(...args) {
    this.operations.push({ method: 'upsert', args });
    return this;
  }

  delete(...args) {
    this.operations.push({ method: 'delete', args });
    return this;
  }

  eq(...args) {
    this.operations.push({ method: 'eq', args });
    return this;
  }

  neq(...args) {
    this.operations.push({ method: 'neq', args });
    return this;
  }

  gt(...args) {
    this.operations.push({ method: 'gt', args });
    return this;
  }

  gte(...args) {
    this.operations.push({ method: 'gte', args });
    return this;
  }

  lt(...args) {
    this.operations.push({ method: 'lt', args });
    return this;
  }

  lte(...args) {
    this.operations.push({ method: 'lte', args });
    return this;
  }

  like(...args) {
    this.operations.push({ method: 'like', args });
    return this;
  }

  ilike(...args) {
    this.operations.push({ method: 'ilike', args });
    return this;
  }

  is(...args) {
    this.operations.push({ method: 'is', args });
    return this;
  }

  in(...args) {
    this.operations.push({ method: 'in', args });
    return this;
  }

  contains(...args) {
    this.operations.push({ method: 'contains', args });
    return this;
  }

  containedBy(...args) {
    this.operations.push({ method: 'containedBy', args });
    return this;
  }

  order(...args) {
    this.operations.push({ method: 'order', args });
    return this;
  }

  limit(...args) {
    this.operations.push({ method: 'limit', args });
    return this;
  }

  range(...args) {
    this.operations.push({ method: 'range', args });
    return this;
  }

  single() {
    this.operations.push({ method: 'single', args: [] });
    return this._execute();
  }

  maybeSingle() {
    this.operations.push({ method: 'maybeSingle', args: [] });
    return this._execute();
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._execute().catch(onRejected);
  }

  async _execute() {
    if (isOfflineMode()) {
      return this._executeMock();
    }

    try {
      const realClient = await this.getRealClient();
      if (!realClient) {
        return this._executeMock();
      }

      let q = realClient.from(this.tableName);
      for (const op of this.operations) {
        if (typeof q[op.method] === 'function') {
          q = q[op.method](...op.args);
        }
      }

      const res = await q;
      if (res && res.error && isNetworkError(res.error)) {
        console.warn(`[Supabase Resiliente] Red no disponible en '${this.tableName}', usando Mock Store:`, res.error.message || res.error);
        return this._executeMock();
      }
      return res;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn(`[Supabase Resiliente] Fallo de red en '${this.tableName}', conmutando a Mock Store:`, err.message || err);
        return this._executeMock();
      }
      throw err;
    }
  }

  _executeMock() {
    let mq = this.store.from(this.tableName);
    for (const op of this.operations) {
      if (typeof mq[op.method] === 'function') {
        mq = mq[op.method](...op.args);
      }
    }
    return mq.execute ? mq.execute() : mq;
  }
}

// -------------------------------------------------------------
// Inicialización del Singleton y exportaciones
// -------------------------------------------------------------

export const mockStore = new MockStore();
const mockAuth = new MockAuth(mockStore);

let realCreateClient = null;
let realSupabaseClient = null;

async function getRealClient() {
  if (isOfflineMode()) {
    return null;
  }
  if (realSupabaseClient) {
    return realSupabaseClient;
  }
  try {
    if (!realCreateClient) {
      const mod = await import(SUPABASE_CDN_URL);
      realCreateClient = mod.createClient;
    }
    if (realCreateClient && !realSupabaseClient) {
      realSupabaseClient = realCreateClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return realSupabaseClient;
  } catch (_) {
    // Si falla la importación de CDN o el entorno no soporta imports HTTPS (ej. Node por defecto)
    return null;
  }
}

function createResilientClient() {
  return {
    from(tableName) {
      return new ResilientQueryBuilder(tableName, getRealClient, mockStore);
    },

    async rpc(methodName, params = {}) {
      if (isOfflineMode()) {
        return mockStore.rpc(methodName, params);
      }
      try {
        const realClient = await getRealClient();
        if (!realClient) {
          return mockStore.rpc(methodName, params);
        }
        const res = await realClient.rpc(methodName, params);
        if (res && res.error && isNetworkError(res.error)) {
          console.warn(`[Supabase Resiliente] Red no disponible en RPC '${methodName}', usando Mock Store:`, res.error.message || res.error);
          return mockStore.rpc(methodName, params);
        }
        return res;
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn(`[Supabase Resiliente] Fallo de red en RPC '${methodName}', conmutando a Mock Store:`, err.message || err);
          return mockStore.rpc(methodName, params);
        }
        throw err;
      }
    },

    auth: {
      async getSession() {
        if (isOfflineMode()) return mockAuth.getSession();
        try {
          const realClient = await getRealClient();
          if (!realClient) return mockAuth.getSession();
          const res = await realClient.auth.getSession();
          if (res && res.error && isNetworkError(res.error)) {
            return mockAuth.getSession();
          }
          return res;
        } catch (err) {
          if (isNetworkError(err)) return mockAuth.getSession();
          throw err;
        }
      },

      async getUser() {
        if (isOfflineMode()) return mockAuth.getUser();
        try {
          const realClient = await getRealClient();
          if (!realClient) return mockAuth.getUser();
          const res = await realClient.auth.getUser();
          if (res && res.error && isNetworkError(res.error)) {
            return mockAuth.getUser();
          }
          return res;
        } catch (err) {
          if (isNetworkError(err)) return mockAuth.getUser();
          throw err;
        }
      },

      user() {
        return mockAuth.user();
      },

      async signInWithPassword(credentials) {
        if (isOfflineMode()) return mockAuth.signInWithPassword(credentials);
        try {
          const realClient = await getRealClient();
          if (!realClient) return mockAuth.signInWithPassword(credentials);
          const res = await realClient.auth.signInWithPassword(credentials);
          if (res && res.error && isNetworkError(res.error)) {
            return mockAuth.signInWithPassword(credentials);
          }
          return res;
        } catch (err) {
          if (isNetworkError(err)) return mockAuth.signInWithPassword(credentials);
          throw err;
        }
      },

      async signUp(options) {
        if (isOfflineMode()) return mockAuth.signUp(options);
        try {
          const realClient = await getRealClient();
          if (!realClient) return mockAuth.signUp(options);
          const res = await realClient.auth.signUp(options);
          if (res && res.error && isNetworkError(res.error)) {
            return mockAuth.signUp(options);
          }
          return res;
        } catch (err) {
          if (isNetworkError(err)) return mockAuth.signUp(options);
          throw err;
        }
      },

      async signOut() {
        mockAuth.signOut();
        try {
          const realClient = await getRealClient();
          if (realClient) {
            await realClient.auth.signOut();
          }
        } catch (_) {}
        return { error: null };
      },

      async resend(options) {
        if (isOfflineMode()) return mockAuth.resend(options);
        try {
          const realClient = await getRealClient();
          if (!realClient) return mockAuth.resend(options);
          return await realClient.auth.resend(options);
        } catch (err) {
          if (isNetworkError(err)) return mockAuth.resend(options);
          throw err;
        }
      },

      onAuthStateChange(callback) {
        return mockAuth.onAuthStateChange(callback);
      }
    }
  };
}

export const supabase = createResilientClient();

export function getMockStore() {
  return mockStore;
}

export function resetMockStore() {
  return mockStore.reset();
}
