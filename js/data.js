// Base de datos de alimentos, categorías y valores iniciales
// Extraído de: Calculadora Nico Duartes.xlsx

export const FOOD_CATEGORIES = {
  HC: {
    code: 'HC',
    name: 'Hidratos de carbono',
    shortName: 'Carbohidratos',
    color: '#3b82f6', // blue
    bgLight: 'rgba(59, 130, 246, 0.12)',
    badgeClass: 'badge-hc',
    macrosPerPortion: { ch: 40, p: 5, g: 1, kcal: 189 },
    description: '1 porción aporta: 40g CH, 5g P, 1g G (~190 kcal)',
    items: [
      { name: 'Arroz', servingDesc: '60 gr (1/4 taza crudo)', servingGrams: 60, unit: 'gr' },
      { name: 'Fideos', servingDesc: '60 gr (1/4 taza crudo)', servingGrams: 60, unit: 'gr' },
      { name: 'Papa / Batata', servingDesc: '210 gr (2 medianas)', servingGrams: 210, unit: 'gr' },
      { name: 'Pan común', servingDesc: '70 gr (2 miñones)', servingGrams: 70, unit: 'gr' },
      { name: 'Galletas de arroz', servingDesc: '60 gr (8 unidades)', servingGrams: 60, unit: 'gr' },
      { name: 'Pan de molde', servingDesc: '85 gr (3 unidades)', servingGrams: 85, unit: 'gr' },
      { name: 'Avena instantánea', servingDesc: '70 gr (3/4 vaso)', servingGrams: 70, unit: 'gr' },
      { name: 'Copos de maíz (sin azúcar)', servingDesc: '50 gr (1 vaso)', servingGrams: 50, unit: 'gr' },
      { name: 'Polenta', servingDesc: '60 gr (6 cucharadas)', servingGrams: 60, unit: 'gr' },
      { name: 'Harina de trigo / avena', servingDesc: '60 gr (6 cucharadas)', servingGrams: 60, unit: 'gr' },
      { name: 'Nestum', servingDesc: '50 gr', servingGrams: 50, unit: 'gr' },
      { name: 'Choclo', servingDesc: '210 gr (4 medianos)', servingGrams: 210, unit: 'gr' }
    ]
  },
  F: {
    code: 'F',
    name: 'Fruta',
    shortName: 'Frutas',
    color: '#10b981', // emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeClass: 'badge-f',
    macrosPerPortion: { ch: 20, p: 1, g: 0, kcal: 84 },
    description: '1 porción aporta: 20g CH, 1g P, 0g G (~84-90 kcal)',
    items: [
      { name: 'Manzana / Pera (con pulpa)', servingDesc: '170 gr (1 grande)', servingGrams: 170, unit: 'gr' },
      { name: 'Banana / Uva (densa)', servingDesc: '110 gr (1 chica)', servingGrams: 110, unit: 'gr' },
      { name: 'Sandía / Melón', servingDesc: '260 gr', servingGrams: 260, unit: 'gr' },
      { name: 'Frutos rojos (arándanos, frutillas)', servingDesc: '200 gr', servingGrams: 200, unit: 'gr' },
      { name: 'Fruta deshidratada', servingDesc: '30 gr', servingGrams: 30, unit: 'gr' },
      { name: 'Cítricos (naranja, mandarina)', servingDesc: '2 unidades medianas (180g)', servingGrams: 180, unit: 'gr' },
      { name: 'Fruta con carozo (durazno, ciruela)', servingDesc: '2 unidades medianas (180g)', servingGrams: 180, unit: 'gr' }
    ]
  },
  D: {
    code: 'D',
    name: 'Dulce',
    shortName: 'Dulces / Azúcares',
    color: '#a855f7', // purple
    bgLight: 'rgba(168, 85, 247, 0.12)',
    badgeClass: 'badge-d',
    macrosPerPortion: { ch: 20, p: 0, g: 0, kcal: 80 },
    description: '1 porción aporta: 20g CH (~80-115 kcal)',
    items: [
      { name: 'Azúcar', servingDesc: '20 gr (4 cucharaditas)', servingGrams: 20, unit: 'gr', subtype: 'Puro (80 kcal)' },
      { name: 'Gomitas', servingDesc: '20 gr', servingGrams: 20, unit: 'gr', subtype: 'Puro (80 kcal)' },
      { name: 'Miel', servingDesc: '24 gr (2 cucharaditas)', servingGrams: 24, unit: 'gr', subtype: 'Puro (80 kcal)' },
      { name: 'Mermelada de frutas', servingDesc: '30 gr (1 cuchara sopera)', servingGrams: 30, unit: 'gr', subtype: 'Puro (80 kcal)' },
      { name: 'Jugo de naranja', servingDesc: '200 ml', servingGrams: 200, unit: 'ml', subtype: 'Puro (80 kcal)' },
      { name: 'Alfajor simple', servingDesc: '29 gr', servingGrams: 29, unit: 'gr', subtype: 'Con grasas (115 kcal)' },
      { name: 'Chocolatada', servingDesc: '200 ml', servingGrams: 200, unit: 'ml', subtype: 'Con grasas (115 kcal)' },
      { name: 'Dulce de leche', servingDesc: '35 gr', servingGrams: 35, unit: 'gr', subtype: 'Con grasas (115 kcal)' }
    ]
  },
  P: {
    code: 'P',
    name: 'Proteína magra',
    shortName: 'P. Magra',
    color: '#ef4444', // red
    bgLight: 'rgba(239, 68, 68, 0.12)',
    badgeClass: 'badge-p',
    macrosPerPortion: { ch: 0, p: 25, g: 3, kcal: 127 },
    description: '1 porción (crudo) aporta: 25g P, 3-15g G (127-240 kcal)',
    items: [
      { name: 'Carne vaca / cerdo / pollo sin grasa visible', servingDesc: '110 gr (crudo)', servingGrams: 110, unit: 'gr', subtype: '3g grasa' },
      { name: 'Pechuga de pollo', servingDesc: '110 gr (crudo)', servingGrams: 110, unit: 'gr', subtype: '3g grasa' },
      { name: 'Carne magra vacuna', servingDesc: '110 gr (crudo)', servingGrams: 110, unit: 'gr', subtype: '3g grasa' },
      { name: 'Scoop de proteína Whey', servingDesc: '1 scoop (30 gr)', servingGrams: 30, unit: 'gr', subtype: '3g grasa' },
      { name: 'Claras de huevo', servingDesc: '7 unidades', servingGrams: 230, unit: 'unidades', subtype: '3g grasa' },
      { name: 'Jamón magro / cocido natural', servingDesc: '4 fetas (135 gr)', servingGrams: 135, unit: 'gr', subtype: '3g grasa' },
      { name: 'Pescado blanco o mariscos', servingDesc: '145 gr', servingGrams: 145, unit: 'gr', subtype: '3g grasa' },
      { name: 'Atún al natural', servingDesc: '1 lata (130 gr)', servingGrams: 130, unit: 'gr', subtype: '3g grasa' },
      { name: 'Caballa / jurel', servingDesc: '110 gr', servingGrams: 110, unit: 'gr', subtype: '15g grasa' },
      { name: 'Sardinas', servingDesc: '115 gr', servingGrams: 115, unit: 'gr', subtype: '15g grasa' },
      { name: 'Hamburguesa magra', servingDesc: '135 gr', servingGrams: 135, unit: 'gr', subtype: '15g grasa' },
      { name: 'Carne con grasa visible', servingDesc: '135 gr', servingGrams: 135, unit: 'gr', subtype: '15g grasa' },
      { name: 'Pollo con hueso y piel', servingDesc: '150 gr', servingGrams: 150, unit: 'gr', subtype: '15g grasa' }
    ]
  },
  PG: {
    code: 'PG',
    name: 'Proteína grasa',
    shortName: 'P. Grasa',
    color: '#f97316', // orange
    bgLight: 'rgba(249, 115, 22, 0.12)',
    badgeClass: 'badge-pg',
    macrosPerPortion: { ch: 0, p: 8.5, g: 10, kcal: 124 },
    description: '1 porción aporta: 8.5g P, 10g G, 0g CH (~124-130 kcal)',
    items: [
      { name: 'Huevo entero', servingDesc: '1 unidad (~55 gr)', servingGrams: 55, unit: 'unidad' },
      { name: 'Quesos semiduros / duros', servingDesc: '40 gr', servingGrams: 40, unit: 'gr' },
      { name: 'Queso untable entero', servingDesc: '60 gr', servingGrams: 60, unit: 'gr' }
    ]
  },
  M: {
    code: 'M',
    name: 'Legumbre o mixta',
    shortName: 'Legumbres',
    color: '#14b8a6', // teal
    bgLight: 'rgba(20, 184, 166, 0.12)',
    badgeClass: 'badge-m',
    macrosPerPortion: { ch: 20, p: 8, g: 0, kcal: 112 },
    description: '1 porción (crudo) aporta: 20g CH, 8g P, 0g G (~112-120 kcal)',
    items: [
      { name: 'Lentejas', servingDesc: '40 gr (crudo)', servingGrams: 40, unit: 'gr' },
      { name: 'Garbanzos', servingDesc: '40 gr (crudo)', servingGrams: 40, unit: 'gr' },
      { name: 'Porotos (negros, alubia, colorados)', servingDesc: '40 gr (crudo)', servingGrams: 40, unit: 'gr' }
    ]
  },
  L: {
    code: 'L',
    name: 'Lácteos',
    shortName: 'Lácteos',
    color: '#0ea5e9', // light blue
    bgLight: 'rgba(14, 165, 233, 0.12)',
    badgeClass: 'badge-l',
    macrosPerPortion: { ch: 20, p: 10, g: 0, kcal: 120 },
    description: '1 porción aporta: 20g CH, 10g P, 0g G (~120-130 kcal)',
    items: [
      { name: 'Leche descremada', servingDesc: '330 ml', servingGrams: 330, unit: 'ml' },
      { name: 'Yogur descremado', servingDesc: '330 ml (aprox 1 y 1/2 pote)', servingGrams: 330, unit: 'ml' }
    ]
  },
  G: {
    code: 'G',
    name: 'Fruta oleosa (Grasas saludables)',
    shortName: 'Grasas',
    color: '#eab308', // yellow
    bgLight: 'rgba(234, 179, 8, 0.12)',
    badgeClass: 'badge-g',
    macrosPerPortion: { ch: 0, p: 0, g: 15, kcal: 135 },
    description: '1 porción aporta: 15g G, 0g CH, 0g P (~135 kcal)',
    items: [
      { name: 'Pasta / Crema de maní', servingDesc: '30 gr (1 cuchara colmada)', servingGrams: 30, unit: 'gr' },
      { name: 'Aceite de oliva / girasol / maíz', servingDesc: '1 cucharada sopera (15 gr)', servingGrams: 15, unit: 'gr' },
      { name: 'Aceitunas', servingDesc: '110 gr (~25-30 unidades)', servingGrams: 110, unit: 'gr' },
      { name: 'Palta (aguacate)', servingDesc: '75 gr (1/2 unidad)', servingGrams: 75, unit: 'gr' },
      { name: 'Nueces', servingDesc: '22 gr (~5-6 mariposas)', servingGrams: 22, unit: 'gr' },
      { name: 'Almendras', servingDesc: '30 gr (~20-25 unidades)', servingGrams: 30, unit: 'gr' },
      { name: 'Frutos secos surtidos', servingDesc: '30 gr (1 puñado)', servingGrams: 30, unit: 'gr' },
      { name: 'Maní tostado sin sal', servingDesc: '30 gr (1 puñado)', servingGrams: 30, unit: 'gr' }
    ]
  }
};

// Tolerancias y umbrales de coherencia (según hoja Excel de Nico Duartes)
export const TOLERANCES = {
  protein: { min: -10, max: 10, unit: 'g', text: '±10g' },
  fat: { min: -10, max: 10, unit: 'g', text: '±10g' },
  carbs: { min: -15, max: 15, unit: 'g', text: '±15g' },
  calories: { min: -80, max: 80, unit: 'kcal', text: '±80 kcal' }
};

// Estado por defecto idéntico a la planilla de Nico Duartes
export const INITIAL_STATE = {
  profile: {
    gender: 'Hombre',
    weight: 70,
    height: 180,
    age: 23,
    steps: 9000,
    met: 5.0,
    trainingHours: 1.2,
    sessionsPerWeek: 4,
    context: 'Déficit leve',
    customCalories: 2186.5
  },
  macroPercentages: {
    protein: 18,
    fat: 23,
    carbs: 59
  },
  portionsScheme: {
    HC: 6.0,
    F: 2.0,
    D: 1.0,
    P: 3.0,
    PG: 0.0,
    M: 0.0,
    L: 1.0,
    G: 2.0
  },
  meals: [
    {
      id: 'desayuno',
      name: 'Desayuno',
      items: [
        { foodName: 'Pan común', category: 'HC', portions: 2.0, amountDesc: '140g (2 porciones)' },
        { foodName: 'Banana', category: 'F', portions: 1.0, amountDesc: 'una chica (110g)' },
        { foodName: 'Dulce de leche', category: 'D', portions: 1.0, amountDesc: '35g' },
        { foodName: 'Crema de maní', category: 'G', portions: 0.5, amountDesc: '15g' }
      ]
    },
    {
      id: 'almuerzo',
      name: 'Almuerzo',
      items: [
        { foodName: 'Arroz', category: 'HC', portions: 2.0, amountDesc: '120g (crudo)' },
        { foodName: 'Pechuga de pollo', category: 'P', portions: 1.5, amountDesc: '165g (crudo)' },
        { foodName: 'Aceite de oliva', category: 'G', portions: 0.5, amountDesc: '7.5g' }
      ]
    },
    {
      id: 'merienda',
      name: 'Merienda',
      items: [
        { foodName: 'Avena instantánea', category: 'HC', portions: 1.0, amountDesc: '70g' },
        { foodName: 'Yogur descremado', category: 'L', portions: 1.0, amountDesc: '330ml' },
        { foodName: 'Banana', category: 'F', portions: 1.0, amountDesc: 'una chica (110g)' },
        { foodName: 'Maní tostado sin sal', category: 'G', portions: 1.0, amountDesc: '30g' }
      ]
    },
    {
      id: 'cena',
      name: 'Cena',
      items: [
        { foodName: 'Fideos', category: 'HC', portions: 2.0, amountDesc: '120g (crudo)' },
        { foodName: 'Carne magra vacuna', category: 'P', portions: 1.5, amountDesc: '165g (crudo)' }
      ]
    }
  ]
};
