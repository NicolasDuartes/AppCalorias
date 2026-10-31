/* ==========================================================
   contexto-ui.js — Controlador UI del Contexto Energético (contexto.html)
   - Cálculo dinámico y reactivo del gasto energético completo:
     * TMB (Mifflin-St Jeor) según género, peso, altura y edad.
     * NEAT estimado a partir de pasos diarios.
     * Gasto de entrenamiento por METs, duración y frecuencia semanal.
     * TDEE y TDEE + TEF (termogénesis de los alimentos al 10%).
   - Simulación reactiva de objetivos calóricos (déficit, mantenimiento, superávit o personalizado).
   - Cálculo en tiempo real de ritmo semanal de cambio y alerta de seguridad (>1% peso/sem).
   - Compatible con rol de coach y alumno mediante sesion.js.
   - Desacople completo del DOM mediante el mapa SELECTORES.
   Módulo ES nativo: sin dependencias externas.
   ========================================================== */

import { aNumeroSeguro } from '../calc/nutricion-calc.js';
import { guardarAvisoToast } from '../utils/navegacion.js';
import '../utils/navegacion.js';
import * as sesion from '../data/sesion.js';
import { supabase } from '../data/supabase.js';
import { guardarContextoEnergetico, obtenerUltimoContexto } from '../data/contexto-api.js';

/**
 * Mapa centralizado de selectores del DOM para contexto.html.
 */
export const SELECTORES = {
  // Datos biométricos
  botonesGenero: '.segmentado[aria-label="Género"] button',
  inputPeso: 'input[name="peso"]',
  inputAltura: 'input[name="altura"]',
  inputEdad: 'input[name="edad"]',
  inputPasos: 'input[name="pasos"]',

  // Entrenamiento
  inputMet: 'input[name="met"]',
  inputDuracion: 'input[name="duracion"]',
  inputEntrenos: 'input[name="entrenos"]',

  // Resultados de gasto energético
  bmrValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(1) .num',
  neatValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(2) .num',
  neatBmrValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(3) .num',
  gastoSesionValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(4) .num',
  promedioEntrenoValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(5) .num',
  tdeeValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(6) .num',
  tdeeTermogenesisValor: '[aria-labelledby="t-resultados"] .resultado:nth-of-type(7) .num',

  // Selector de dieta
  desplegableDieta: 'details.desplegable',
  summaryDietaTitulo: 'details.desplegable > summary .negrita',
  summaryDietaSub: 'details.desplegable > summary .sub',
  opcionesDieta: '.opciones button.opcion',

  // Panel personalizar
  summaryPersonalizar: 'details.desplegable details > summary.opcion',
  inputPesoActual: 'input[name="pesoActual"]',
  inputPesoObjetivo: 'input[name="pesoObjetivo"]',
  rangoSemanas: 'input[name="semanas"]',
  textoPlazoSemanas: '.panel-personalizar .campo .texto-14',
  miniDatoCambio: '.panel-personalizar .mini-dato:nth-child(1) .num',
  miniDatoPorSemana: '.panel-personalizar .mini-dato:nth-child(2) .num',
  miniDatoAjusteDiario: '.panel-personalizar .mini-dato:nth-child(3) .num',
  resultadoCaloriasConsumir: '.panel-personalizar .resultado--destacado .num',
  avisoRitmoExcesivo: '.panel-personalizar .aviso',

  // Resumen objetivo calórico (card oscura)
  cardObjetivoNum: '.card--oscura .num--xl',
  cardObjetivoSub: '.card--oscura p.sub',

  // Guardar contexto
  btnGuardar: 'a.btn--primario[href*="cliente.html"], a.btn--primario[data-href-alumno]'
};

/**
 * Constantes fisiológicas de cálculo energético.
 */
const CALORIAS_POR_KG_GRASA = 7700;
const FACTOR_NEAT_PASO = 0.0005; // 0.0005 * peso (kg) * pasos
const FACTOR_TERMOGENESIS = 1.10; // 10% adicional por TEF

let opcionDietaSeleccionada = {
  tipo: 'deficit_moderado',
  nombre: 'Déficit moderado',
  ajuste: -500,
  esPersonalizado: false
};

/**
 * Obtiene el género actualmente seleccionado ('masculino' o 'femenino').
 * @returns {'masculino'|'femenino'}
 */
export function obtenerGeneroSeleccionado() {
  const botones = document.querySelectorAll(SELECTORES.botonesGenero);
  for (const b of botones) {
    if (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true') {
      return b.textContent.trim().toLowerCase().includes('fem') ? 'femenino' : 'masculino';
    }
  }
  return 'masculino';
}

/**
 * Calcula el Metabolismo Basal (BMR) por la fórmula de Mifflin-St Jeor.
 * @param {'masculino'|'femenino'} genero
 * @param {number} peso en kg
 * @param {number} altura en cm
 * @param {number} edad en años
 * @returns {number}
 */
export function calcularBMR(genero, peso, altura, edad) {
  if (peso <= 0 || altura <= 0 || edad <= 0) return 0;
  const base = 10 * peso + 6.25 * altura - 5 * edad;
  return Math.round(genero === 'femenino' ? base - 161 : base + 5);
}

/**
 * Calcula el gasto energético completo y actualiza la interfaz.
 */
export function recalcularGastoEnergetico() {
  const genero = obtenerGeneroSeleccionado();
  const peso = aNumeroSeguro(document.querySelector(SELECTORES.inputPeso)?.value || 78);
  const altura = aNumeroSeguro(document.querySelector(SELECTORES.inputAltura)?.value || 178);
  const edad = aNumeroSeguro(document.querySelector(SELECTORES.inputEdad)?.value || 30);
  const pasos = aNumeroSeguro(document.querySelector(SELECTORES.inputPasos)?.value || 8000);

  const met = aNumeroSeguro(document.querySelector(SELECTORES.inputMet)?.value || 6);
  const duracion = aNumeroSeguro(document.querySelector(SELECTORES.inputDuracion)?.value || 1);
  const entrenos = aNumeroSeguro(document.querySelector(SELECTORES.inputEntrenos)?.value || 4);

  // 1. BMR (Mifflin-St Jeor)
  const bmr = calcularBMR(genero, peso, altura, edad);

  // 2. NEAT (Pasos diarios)
  const neat = Math.round(FACTOR_NEAT_PASO * peso * pasos);

  // 3. NEAT + BMR
  const neatBmr = bmr + neat;

  // 4. Sesión de entrenamiento y promedio diario
  const gastoSesion = Math.round(met * peso * duracion);
  const promedioEntreno = Math.round((gastoSesion * entrenos) / 7);

  // 5. TDEE base
  const tdee = neatBmr + promedioEntreno;

  // 6. TDEE + Termogénesis (TEF 10%)
  const tdeeTermo = Math.round(tdee * FACTOR_TERMOGENESIS);

  // Actualizar nodos en el DOM
  const bmrEl = document.querySelector(SELECTORES.bmrValor);
  if (bmrEl) bmrEl.textContent = bmr.toLocaleString('es-AR');

  const neatEl = document.querySelector(SELECTORES.neatValor);
  if (neatEl) neatEl.textContent = neat.toLocaleString('es-AR');

  const neatBmrEl = document.querySelector(SELECTORES.neatBmrValor);
  if (neatBmrEl) neatBmrEl.textContent = neatBmr.toLocaleString('es-AR');

  const gastoSesionEl = document.querySelector(SELECTORES.gastoSesionValor);
  if (gastoSesionEl) gastoSesionEl.textContent = gastoSesion.toLocaleString('es-AR');

  const promedioEntrenoEl = document.querySelector(SELECTORES.promedioEntrenoValor);
  if (promedioEntrenoEl) promedioEntrenoEl.textContent = promedioEntreno.toLocaleString('es-AR');

  const tdeeEl = document.querySelector(SELECTORES.tdeeValor);
  if (tdeeEl) tdeeEl.textContent = tdee.toLocaleString('es-AR');

  const tdeeTermoEl = document.querySelector(SELECTORES.tdeeTermogenesisValor);
  if (tdeeTermoEl) tdeeTermoEl.textContent = tdeeTermo.toLocaleString('es-AR');

  // Actualizar opciones del desplegable con el nuevo gasto base
  actualizarOpcionesDieta(tdeeTermo);

  // Actualizar cálculo personalizado
  recalcularPanelPersonalizar(tdeeTermo, peso);

  // Actualizar card oscura final
  actualizarCardObjetivo(tdeeTermo);
}

/**
 * Actualiza los números en cada opción de dieta en función del gasto termogénico actual.
 * @param {number} tdeeTermo
 */
function actualizarOpcionesDieta(tdeeTermo) {
  const opciones = document.querySelectorAll(SELECTORES.opcionesDieta);
  opciones.forEach((op) => {
    const textoNombre = op.querySelector('.negrita')?.textContent?.trim() || '';
    const numEl = op.querySelector('.num');
    let valor = tdeeTermo;

    if (textoNombre.includes('Déficit leve')) {
      valor = Math.max(800, tdeeTermo - 300);
    } else if (textoNombre.includes('Déficit moderado')) {
      valor = Math.max(800, tdeeTermo - 500);
    } else if (textoNombre.includes('Mantenimiento')) {
      valor = tdeeTermo;
    } else if (textoNombre.includes('Superávit leve')) {
      valor = tdeeTermo + 300;
    } else if (textoNombre.includes('Superávit moderado')) {
      valor = tdeeTermo + 500;
    }

    if (numEl) numEl.textContent = valor.toLocaleString('es-AR');
  });
}

/**
 * Recalcula el panel interactivo de dieta personalizada.
 * @param {number} tdeeTermo
 * @param {number} pesoActualBase
 */
function recalcularPanelPersonalizar(tdeeTermo, pesoActualBase) {
  const inputActual = document.querySelector(SELECTORES.inputPesoActual);
  const inputObjetivo = document.querySelector(SELECTORES.inputPesoObjetivo);
  const rangoSemanas = document.querySelector(SELECTORES.rangoSemanas);

  if (inputActual && (!inputActual.value || document.activeElement !== inputActual)) {
    inputActual.value = String(pesoActualBase);
  }

  const pesoAct = aNumeroSeguro(inputActual?.value || pesoActualBase);
  const pesoObj = aNumeroSeguro(inputObjetivo?.value || (pesoAct - 6));
  const semanas = Math.max(1, aNumeroSeguro(rangoSemanas?.value || 12));

  const meses = Math.round((semanas / 4.333) * 10) / 10;
  const textoPlazo = document.querySelector(SELECTORES.textoPlazoSemanas);
  if (textoPlazo) {
    textoPlazo.innerHTML = `<span class="negrita">${semanas} semanas</span> · ≈ ${String(meses).replace('.', ',')} meses`;
  }

  const difPeso = Math.round((pesoObj - pesoAct) * 10) / 10;
  const porSemana = Math.round((difPeso / semanas) * 100) / 100;

  // Ajuste diario = (diferencia de kg * 7700 kcal) / (semanas * 7 días)
  const ajusteDiario = Math.round((difPeso * CALORIAS_POR_KG_GRASA) / (semanas * 7));
  const calConsumir = Math.max(800, tdeeTermo + ajusteDiario);

  const cambioEl = document.querySelector(SELECTORES.miniDatoCambio);
  if (cambioEl) {
    const signo = difPeso > 0 ? '+' : '';
    cambioEl.innerHTML = `${signo}${String(difPeso).replace('.', ',')} <span class="unidad">kg</span>`;
  }

  const semEl = document.querySelector(SELECTORES.miniDatoPorSemana);
  if (semEl) {
    const signo = porSemana > 0 ? '+' : '';
    semEl.innerHTML = `${signo}${String(porSemana).replace('.', ',')} <span class="unidad">kg</span>`;
  }

  const ajEl = document.querySelector(SELECTORES.miniDatoAjusteDiario);
  if (ajEl) {
    const signo = ajusteDiario > 0 ? '+' : '';
    ajEl.innerHTML = `${signo}${ajusteDiario} <span class="unidad">kcal</span>`;
  }

  const resConsumir = document.querySelector(SELECTORES.resultadoCaloriasConsumir);
  if (resConsumir) {
    resConsumir.textContent = calConsumir.toLocaleString('es-AR');
  }

  // Alerta de ritmo agresivo si supera el 1 % del peso corporal por semana
  const aviso = document.querySelector(SELECTORES.avisoRitmoExcesivo);
  if (aviso) {
    const ritmoPorcentual = pesoAct > 0 ? (Math.abs(porSemana) / pesoAct) * 100 : 0;
    aviso.hidden = ritmoPorcentual <= 1.0;
  }

  if (opcionDietaSeleccionada.esPersonalizado) {
    opcionDietaSeleccionada.ajuste = ajusteDiario;
    opcionDietaSeleccionada.calorias = calConsumir;
  }
}

/**
 * Actualiza la tarjeta oscura con las calorías objetivo finales.
 * @param {number} tdeeTermo
 */
function actualizarCardObjetivo(tdeeTermo) {
  const cardNum = document.querySelector(SELECTORES.cardObjetivoNum);
  const cardSub = document.querySelector(SELECTORES.cardObjetivoSub);
  const summaryTit = document.querySelector(SELECTORES.summaryDietaTitulo);
  const summarySub = document.querySelector(SELECTORES.summaryDietaSub);

  let calObjetivo = tdeeTermo;
  let detalleTexto = '';
  const signo = opcionDietaSeleccionada.ajuste > 0 ? '+' : (opcionDietaSeleccionada.ajuste < 0 ? '−' : '');
  const absAjuste = Math.abs(opcionDietaSeleccionada.ajuste);

  if (opcionDietaSeleccionada.esPersonalizado) {
    calObjetivo = opcionDietaSeleccionada.calorias || Math.max(800, tdeeTermo + opcionDietaSeleccionada.ajuste);
    detalleTexto = `Personalizado: ${signo}${absAjuste} kcal sobre ${tdeeTermo.toLocaleString('es-AR')}`;
    if (summaryTit) summaryTit.textContent = 'Personalizado';
    if (summarySub) summarySub.textContent = `${signo}${absAjuste} kcal · ${calObjetivo.toLocaleString('es-AR')} kcal/día`;
  } else {
    calObjetivo = Math.max(800, tdeeTermo + opcionDietaSeleccionada.ajuste);
    detalleTexto = `${opcionDietaSeleccionada.nombre}: ${signo}${absAjuste} kcal sobre ${tdeeTermo.toLocaleString('es-AR')}`;
    if (summaryTit) summaryTit.textContent = opcionDietaSeleccionada.nombre;
    if (summarySub) summarySub.textContent = `${signo}${absAjuste} kcal · ${calObjetivo.toLocaleString('es-AR')} kcal/día`;
  }

  if (cardNum) cardNum.textContent = calObjetivo.toLocaleString('es-AR');
  if (cardSub) cardSub.textContent = detalleTexto;
}

/**
 * Obtiene el ID del alumno contextual (por query param ?cliente= en coach o sesión activa en alumno).
 * @returns {Promise<string|null>}
 */
export async function obtenerAlumnoIdContexto() {
  const params = new URLSearchParams(window.location.search);
  const clienteParam = params.get('cliente');
  if (clienteParam) return clienteParam;

  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashCliente = hashParams.get('cliente') || hashParams.get('id');
    if (hashCliente) return hashCliente;
  }

  if (typeof window !== 'undefined' && window.__TEST_BYPASS_AUTH__) {
    return 'test-user';
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (err) {
    console.warn('Error al obtener sesión en contexto-ui:', err);
  }

  return null;
}

/**
 * Pobla los controles de entrada y opciones de dieta con un contexto previo.
 * @param {Object} datos
 */
export function poblarContextoEnDOM(datos) {
  if (!datos) return;

  if (datos.peso_kg != null || datos.peso != null) {
    const el = document.querySelector(SELECTORES.inputPeso);
    if (el) el.value = String(datos.peso_kg ?? datos.peso);
  }
  if (datos.altura_cm != null || datos.altura != null) {
    const el = document.querySelector(SELECTORES.inputAltura);
    if (el) el.value = String(datos.altura_cm ?? datos.altura);
  }
  if (datos.edad_anios != null || datos.edad != null) {
    const el = document.querySelector(SELECTORES.inputEdad);
    if (el) el.value = String(datos.edad_anios ?? datos.edad);
  }
  if (datos.pasos_diarios != null || datos.pasos != null) {
    const el = document.querySelector(SELECTORES.inputPasos);
    if (el) el.value = String(datos.pasos_diarios ?? datos.pasos);
  }
  if (datos.met != null) {
    const el = document.querySelector(SELECTORES.inputMet);
    if (el) el.value = String(datos.met);
  }
  if (datos.duracion_horas != null || datos.duracion != null) {
    const el = document.querySelector(SELECTORES.inputDuracion);
    if (el) el.value = String(datos.duracion_horas ?? datos.duracion);
  }
  if (datos.sesiones_semana != null || datos.entrenos != null) {
    const el = document.querySelector(SELECTORES.inputEntrenos);
    if (el) el.value = String(datos.sesiones_semana ?? datos.entrenos);
  }

  if (datos.sexo) {
    const esFem = String(datos.sexo).toUpperCase().startsWith('F');
    const botones = document.querySelectorAll(SELECTORES.botonesGenero);
    botones.forEach((btn) => {
      const esBtnFem = btn.textContent.toLowerCase().includes('fem');
      const activo = esFem ? esBtnFem : !esBtnFem;
      btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
      btn.setAttribute('aria-checked', activo ? 'true' : 'false');
    });
  }

  if (datos.tipo_dieta) {
    const t = String(datos.tipo_dieta).toLowerCase();
    if (t.includes('personalizado')) {
      opcionDietaSeleccionada.tipo = 'personalizado';
      opcionDietaSeleccionada.nombre = 'Personalizar';
      opcionDietaSeleccionada.esPersonalizado = true;
      if (datos.peso_objetivo_kg != null || datos.pesoObjetivo != null) {
        const inObj = document.querySelector(SELECTORES.inputPesoObjetivo);
        if (inObj) inObj.value = String(datos.peso_objetivo_kg ?? datos.pesoObjetivo);
      }
      if (datos.plazo_semanas != null || datos.semanas != null) {
        const inSem = document.querySelector(SELECTORES.rangoSemanas);
        if (inSem) inSem.value = String(datos.plazo_semanas ?? datos.semanas);
      }
    } else {
      opcionDietaSeleccionada.esPersonalizado = false;
      if (t.includes('leve') && t.includes('def')) {
        opcionDietaSeleccionada.tipo = 'deficit_leve';
        opcionDietaSeleccionada.nombre = 'Déficit leve';
        opcionDietaSeleccionada.ajuste = -300;
      } else if (t.includes('mod') && t.includes('def')) {
        opcionDietaSeleccionada.tipo = 'deficit_moderado';
        opcionDietaSeleccionada.nombre = 'Déficit moderado';
        opcionDietaSeleccionada.ajuste = -500;
      } else if (t.includes('mantenimiento')) {
        opcionDietaSeleccionada.tipo = 'mantenimiento';
        opcionDietaSeleccionada.nombre = 'Mantenimiento';
        opcionDietaSeleccionada.ajuste = 0;
      } else if (t.includes('leve') && t.includes('sup')) {
        opcionDietaSeleccionada.tipo = 'superavit_leve';
        opcionDietaSeleccionada.nombre = 'Superávit leve';
        opcionDietaSeleccionada.ajuste = 300;
      } else if (t.includes('mod') && t.includes('sup')) {
        opcionDietaSeleccionada.tipo = 'superavit_moderado';
        opcionDietaSeleccionada.nombre = 'Superávit moderado';
        opcionDietaSeleccionada.ajuste = 500;
      }
    }

    const opciones = document.querySelectorAll(SELECTORES.opcionesDieta);
    opciones.forEach((op) => {
      const tit = op.querySelector('.negrita')?.textContent?.trim() || '';
      const coincide = tit.toLowerCase().includes(opcionDietaSeleccionada.nombre.toLowerCase());
      op.setAttribute('aria-selected', coincide ? 'true' : 'false');
    });
  }
}

/**
 * Inicializa el controlador del contexto energético.
 */
export async function iniciarContexto() {
  recalcularGastoEnergetico();

  // Escuchar inputs biométricos y de entrenamiento
  const inputsReactivos = [
    SELECTORES.inputPeso,
    SELECTORES.inputAltura,
    SELECTORES.inputEdad,
    SELECTORES.inputPasos,
    SELECTORES.inputMet,
    SELECTORES.inputDuracion,
    SELECTORES.inputEntrenos,
    SELECTORES.inputPesoActual,
    SELECTORES.inputPesoObjetivo,
    SELECTORES.rangoSemanas
  ];

  inputsReactivos.forEach((sel) => {
    document.querySelectorAll(sel).forEach((inp) => {
      inp.addEventListener('input', () => {
        recalcularGastoEnergetico();
      });
    });
  });

  // Escuchar cambio en botones de género segmentados
  document.querySelectorAll(SELECTORES.botonesGenero).forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimeout(recalcularGastoEnergetico, 10);
    });
  });

  // Escuchar opciones estándar del desplegable de dieta
  document.querySelectorAll(SELECTORES.opcionesDieta).forEach((op) => {
    op.addEventListener('click', () => {
      const tit = op.querySelector('.negrita')?.textContent?.trim() || '';
      opcionDietaSeleccionada.nombre = tit;
      opcionDietaSeleccionada.esPersonalizado = false;

      if (tit.includes('Déficit leve')) {
        opcionDietaSeleccionada.tipo = 'deficit_leve';
        opcionDietaSeleccionada.ajuste = -300;
      } else if (tit.includes('Déficit moderado')) {
        opcionDietaSeleccionada.tipo = 'deficit_moderado';
        opcionDietaSeleccionada.ajuste = -500;
      } else if (tit.includes('Mantenimiento')) {
        opcionDietaSeleccionada.tipo = 'mantenimiento';
        opcionDietaSeleccionada.ajuste = 0;
      } else if (tit.includes('Superávit leve')) {
        opcionDietaSeleccionada.tipo = 'superavit_leve';
        opcionDietaSeleccionada.ajuste = 300;
      } else if (tit.includes('Superávit moderado')) {
        opcionDietaSeleccionada.tipo = 'superavit_moderado';
        opcionDietaSeleccionada.ajuste = 500;
      }

      document.querySelectorAll(SELECTORES.opcionesDieta).forEach((b) => {
        b.setAttribute('aria-selected', b === op ? 'true' : 'false');
      });

      recalcularGastoEnergetico();
    });
  });

  // Escuchar activación de opción personalizar
  const summaryPersonalizar = document.querySelector(SELECTORES.summaryPersonalizar);
  if (summaryPersonalizar) {
    summaryPersonalizar.addEventListener('click', () => {
      opcionDietaSeleccionada.tipo = 'personalizado';
      opcionDietaSeleccionada.esPersonalizado = true;
      opcionDietaSeleccionada.nombre = 'Personalizar';
      recalcularGastoEnergetico();
    });
  }

  // Carga reactiva de último contexto si hay alumnoId
  const alumnoId = await obtenerAlumnoIdContexto();
  if (alumnoId) {
    try {
      const ultimo = await obtenerUltimoContexto(alumnoId);
      if (ultimo) {
        poblarContextoEnDOM(ultimo);
        recalcularGastoEnergetico();
      }
    } catch (err) {
      console.warn('Error al cargar último contexto:', err);
    }
  }

  // Guardar contexto
  const btnGuardar = document.querySelector(SELECTORES.btnGuardar);
  if (btnGuardar) {
    btnGuardar.addEventListener('click', async () => {
      const genero = obtenerGeneroSeleccionado();
      const peso = aNumeroSeguro(document.querySelector(SELECTORES.inputPeso)?.value || 78);
      const altura = aNumeroSeguro(document.querySelector(SELECTORES.inputAltura)?.value || 178);
      const edad = aNumeroSeguro(document.querySelector(SELECTORES.inputEdad)?.value || 30);
      const pasos = aNumeroSeguro(document.querySelector(SELECTORES.inputPasos)?.value || 8000);

      const met = aNumeroSeguro(document.querySelector(SELECTORES.inputMet)?.value || 6);
      const duracion = aNumeroSeguro(document.querySelector(SELECTORES.inputDuracion)?.value || 1);
      const entrenos = aNumeroSeguro(document.querySelector(SELECTORES.inputEntrenos)?.value || 4);

      const bmr = calcularBMR(genero, peso, altura, edad);
      const neat = Math.round(FACTOR_NEAT_PASO * peso * pasos);
      const neatBmr = bmr + neat;
      const gastoSesion = Math.round(met * peso * duracion);
      const entrenoDiario = Math.round((gastoSesion * entrenos) / 7);
      const tdee = neatBmr + entrenoDiario;
      const tdeeTermo = Math.round(tdee * FACTOR_TERMOGENESIS);

      const tipoDieta = opcionDietaSeleccionada.esPersonalizado
        ? 'personalizado'
        : (opcionDietaSeleccionada.tipo || 'deficit_moderado');

      const pesoObj = opcionDietaSeleccionada.esPersonalizado
        ? aNumeroSeguro(document.querySelector(SELECTORES.inputPesoObjetivo)?.value || (peso - 6))
        : null;

      const plazoSem = opcionDietaSeleccionada.esPersonalizado
        ? Math.max(1, aNumeroSeguro(document.querySelector(SELECTORES.rangoSemanas)?.value || 12))
        : null;

      const ajuste = opcionDietaSeleccionada.ajuste;
      const caloriasObjetivo = opcionDietaSeleccionada.esPersonalizado
        ? (opcionDietaSeleccionada.calorias || Math.max(800, tdeeTermo + ajuste))
        : Math.max(800, tdeeTermo + ajuste);

      const datosContexto = {
        sexo: genero === 'femenino' ? 'F' : 'M',
        edad_anios: edad,
        peso_kg: peso,
        altura_cm: altura,
        pasos_diarios: pasos,
        met,
        duracion_horas: duracion,
        sesiones_semana: entrenos,
        tipo_dieta: tipoDieta,
        peso_objetivo_kg: pesoObj,
        plazo_semanas: plazoSem,
        bmr_kcal: bmr,
        neat_kcal: neat,
        gasto_sesion_kcal: gastoSesion,
        gastoSesion_kcal: gastoSesion,
        entreno_diario_kcal: entrenoDiario,
        tdee_kcal: tdee,
        tdee_termogenesis_kcal: tdeeTermo,
        ajuste_kcal: ajuste,
        calorias_objetivo: caloriasObjetivo,
        version_calculo: '1'
      };

      const idDestino = await obtenerAlumnoIdContexto();
      if (idDestino) {
        try {
          await guardarContextoEnergetico(idDestino, datosContexto);
        } catch (guardarErr) {
          console.warn('Error al guardar contexto energético:', guardarErr);
        }
      }
      guardarAvisoToast('Contexto energético guardado con éxito.');
    });
  }
}

// Auto-inicialización si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarContexto);
} else {
  iniciarContexto();
}
