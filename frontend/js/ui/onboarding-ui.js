/* ==========================================================
   onboarding-ui.js — Asistente interactivo de Onboarding del Alumno (5 pasos)
   - Flujo guiado paso a paso para configurar el perfil biológico y calórico:
     * Paso 1: Sexo biológico y edad / fecha de nacimiento (Mifflin-St Jeor).
     * Paso 2: Altura (cm) y peso inicial (kg).
     * Paso 3: Movimiento diario no deportivo (NEAT: pasos diarios promedio).
     * Paso 4: Entrenamiento semanal (frecuencia, duración y METs).
     * Paso 5: Objetivo calórico (Déficit, Mantenimiento o Superávit).
   - Control de acceso por rol con exigirRol('alumno').
   - Desacople completo del DOM mediante el mapa SELECTORES.
   - Validación reactiva de rangos fisiológicos en cada transición.
   - Cálculo instantáneo de BMR, NEAT, gasto de entreno, TDEE, TDEE + TEF y calorías objetivo.
   - Persistencia resiliente con guardarContextoEnergetico() y notificación toast.
   - Módulo ES nativo puro: sin frameworks ni compiladores.
   ========================================================== */

import { exigirRol } from '../data/sesion.js';
import { guardarContextoEnergetico } from '../data/contexto-api.js';
import { guardarAvisoToast } from '../utils/navegacion.js';
import '../utils/navegacion.js';
import { normalizarDecimal, formatearKcal } from '../calc/formato-calc.js';
import { aNumeroSeguro } from '../calc/nutricion-calc.js';

/**
 * Mapa centralizado de selectores del DOM para onboarding.html.
 */
export const SELECTORES = {
  formulario: '#form-onboarding',
  pasos: '.paso-asistente',
  stepperIndicador: '#stepper-indicador',
  stepperTitulo: '#stepper-titulo',
  stepperBarra: '#stepper-barra',
  stepperProgreso: '#stepper-progreso',
  btnAnterior: '#btn-anterior',
  btnSiguiente: '#btn-siguiente',
  btnFinalizar: '#btn-finalizar',
  paso1: '#paso-1',
  segmentadoSexo: '#segmentado-sexo',
  btnSexoM: '#btn-sexo-m',
  btnSexoF: '#btn-sexo-f',
  inputFechaNacimiento: '#input-fecha-nacimiento',
  inputEdad: '#input-edad',
  errorPaso1: '#error-paso-1',
  errorPaso1Texto: '#error-paso-1-texto',
  paso2: '#paso-2',
  inputAltura: '#input-altura',
  inputPeso: '#input-peso',
  errorPaso2: '#error-paso-2',
  errorPaso2Texto: '#error-paso-2-texto',
  paso3: '#paso-3',
  opcionesNeat: '#opciones-neat',
  opcionNeatSedentario: '#opcion-neat-sedentario',
  opcionNeatModerado: '#opcion-neat-moderado',
  opcionNeatActivo: '#opcion-neat-activo',
  opcionNeatPersonalizado: '#opcion-neat-personalizado',
  campoPasosPersonalizado: '#campo-pasos-personalizado',
  inputPasos: '#input-pasos',
  errorPaso3: '#error-paso-3',
  errorPaso3Texto: '#error-paso-3-texto',
  paso4: '#paso-4',
  inputSesiones: '#input-sesiones',
  inputDuracionMinutos: '#input-duracion-minutos',
  segmentadoIntensidad: '#segmentado-intensidad',
  btnIntensidadSuave: '#btn-intensidad-suave',
  btnIntensidadMedia: '#btn-intensidad-media',
  btnIntensidadIntensa: '#btn-intensidad-intensa',
  ayudaIntensidad: '#ayuda-intensidad',
  inputMet: '#input-met',
  errorPaso4: '#error-paso-4',
  errorPaso4Texto: '#error-paso-4-texto',
  paso5: '#paso-5',
  cardResumenObjetivo: '#card-resumen-objetivo',
  resumenCaloriasObjetivo: '#resumen-calorias-objetivo',
  resumenMetabolismoDetalle: '#resumen-metabolismo-detalle',
  opcionesObjetivo: '#opciones-objetivo',
  opcionDeficitLeve: '#opcion-deficit-leve',
  opcionDeficitMod: '#opcion-deficit-mod',
  opcionMantenimiento: '#opcion-mantenimiento',
  opcionSuperavitLeve: '#opcion-superavit-leve',
  opcionSuperavitMod: '#opcion-superavit-mod',
  numObjDeficitLeve: '#num-obj-deficit-leve',
  numObjDeficitMod: '#num-obj-deficit-mod',
  numObjMantenimiento: '#num-obj-mantenimiento',
  numObjSuperavitLeve: '#num-obj-superavit-leve',
  numObjSuperavitMod: '#num-obj-superavit-mod',
  errorPaso5: '#error-paso-5',
  errorPaso5Texto: '#error-paso-5-texto'
};

/**
 * Constantes metabólicas y textos del asistente.
 */
const TITULOS_PASOS = {
  1: 'Sexo y edad',
  2: 'Altura y peso inicial',
  3: 'Actividad diaria no deportiva',
  4: 'Entrenamiento semanal',
  5: 'Objetivo calórico'
};

const FACTOR_NEAT_PASO = 0.0005;
const FACTOR_TERMOGENESIS = 1.10;

const AJUSTES_OBJETIVO = {
  deficit_leve: -300,
  deficit_moderado: -500,
  mantenimiento: 0,
  superavit_leve: 300,
  superavit_moderado: 500
};

const DESCRIPCIONES_INTENSIDAD = {
  3: 'Suave: caminata liviana, yoga, pilates o estiramientos (~3 METs).',
  6: 'Media: pesas en gimnasio, trote moderado o natación recreativa (~6 METs).',
  9: 'Intensa: CrossFit, circuitos HIIT, running o deportes intensos (~9 METs).'
};

let pasoActual = 1;
let cuentaActual = null;

const estado = {
  sexo: 'M',
  edad: 28,
  altura: 175,
  peso: 75.0,
  pasos: 8000,
  sesiones: 4,
  duracionMinutos: 60,
  met: 6,
  tipoDieta: 'deficit_moderado'
};

/**
 * Calcula la Tasa Metabólica Basal (BMR) por Mifflin-St Jeor.
 * @param {'M'|'F'} sexo
 * @param {number} peso en kg
 * @param {number} altura en cm
 * @param {number} edad en años
 * @returns {number}
 */
export function calcularBMR(sexo, peso, altura, edad) {
  if (peso <= 0 || altura <= 0 || edad <= 0) return 0;
  const base = 10 * peso + 6.25 * altura - 5 * edad;
  return Math.round(sexo === 'F' ? base - 161 : base + 5);
}

/**
 * Realiza el cálculo energético integral según el estado del asistente.
 * @returns {{
 *   bmr: number,
 *   neat: number,
 *   gastoSesion: number,
 *   promedioEntreno: number,
 *   tdee: number,
 *   tdeeTermo: number,
 *   ajuste: number,
 *   caloriasObjetivo: number
 * }}
 */
export function calcularMetabolismoCompleto() {
  const peso = estado.peso > 0 ? estado.peso : 70;
  const altura = estado.altura > 0 ? estado.altura : 170;
  const edad = estado.edad > 0 ? estado.edad : 30;
  const sexo = estado.sexo === 'F' ? 'F' : 'M';
  const pasos = Math.max(0, estado.pasos);
  const met = Math.max(0, estado.met);
  const duracionHoras = Math.max(0, estado.duracionMinutos) / 60;
  const sesiones = Math.max(0, estado.sesiones);

  // 1. Metabolismo basal (Mifflin-St Jeor)
  const bmr = calcularBMR(sexo, peso, altura, edad);

  // 2. NEAT (gasto por movimiento espontáneo)
  const neat = Math.round(FACTOR_NEAT_PASO * peso * pasos);

  // 3. Gasto por sesión y promedio diario
  const gastoSesion = Math.round(met * peso * duracionHoras);
  const promedioEntreno = Math.round((gastoSesion * sesiones) / 7);

  // 4. Gasto energético diario total (TDEE)
  const tdee = bmr + neat + promedioEntreno;

  // 5. TDEE + Termogénesis (efecto térmico de los alimentos, TEF 10%)
  const tdeeTermo = Math.round(tdee * FACTOR_TERMOGENESIS);

  // 6. Ajuste según objetivo seleccionado
  const ajuste = AJUSTES_OBJETIVO[estado.tipoDieta] ?? -500;
  const caloriasObjetivo = Math.max(800, tdeeTermo + ajuste);

  return {
    bmr,
    neat,
    gastoSesion,
    promedioEntreno,
    tdee,
    tdeeTermo,
    ajuste,
    caloriasObjetivo
  };
}

/**
 * Muestra un mensaje de error accesible en el paso correspondiente.
 * @param {number} paso
 * @param {string} mensaje
 */
function mostrarError(paso, mensaje) {
  const contenedorError = document.querySelector(SELECTORES[`errorPaso${paso}`]);
  const textoError = document.querySelector(SELECTORES[`errorPaso${paso}Texto`]);
  if (contenedorError && textoError) {
    textoError.textContent = mensaje;
    contenedorError.hidden = false;
  }
}

/**
 * Oculta el mensaje de error del paso correspondiente.
 * @param {number} paso
 */
function ocultarError(paso) {
  const contenedorError = document.querySelector(SELECTORES[`errorPaso${paso}`]);
  if (contenedorError) {
    contenedorError.hidden = true;
  }
}

/**
 * Valida los campos del paso actual respetando rangos fisiológicos.
 * @param {number} paso
 * @returns {boolean}
 */
export function validarPaso(paso) {
  ocultarError(paso);

  if (paso === 1) {
    const inputEdad = document.querySelector(SELECTORES.inputEdad);
    const edad = parseInt(inputEdad?.value, 10);
    if (!Number.isFinite(edad) || edad < 10 || edad > 100) {
      mostrarError(1, 'Por favor ingresá una edad válida entre 10 y 100 años.');
      inputEdad?.focus();
      return false;
    }
    estado.edad = edad;
    return true;
  }

  if (paso === 2) {
    const inputAltura = document.querySelector(SELECTORES.inputAltura);
    const inputPeso = document.querySelector(SELECTORES.inputPeso);

    const altura = parseFloat(inputAltura?.value);
    if (!Number.isFinite(altura) || altura < 80 || altura > 250) {
      mostrarError(2, 'Por favor ingresá una altura válida entre 80 y 250 cm.');
      inputAltura?.focus();
      return false;
    }

    const pesoLimpio = normalizarDecimal(inputPeso?.value);
    const peso = parseFloat(pesoLimpio);
    if (!Number.isFinite(peso) || peso < 20 || peso > 350) {
      mostrarError(2, 'Por favor ingresá un peso inicial válido entre 20 y 350 kg.');
      inputPeso?.focus();
      return false;
    }

    estado.altura = Math.round(altura);
    estado.peso = Number(peso.toFixed(1));
    return true;
  }

  if (paso === 3) {
    const inputPasos = document.querySelector(SELECTORES.inputPasos);
    const pasos = parseInt(inputPasos?.value, 10);
    if (!Number.isFinite(pasos) || pasos < 0 || pasos > 50000) {
      mostrarError(3, 'Por favor ingresá una cantidad de pasos válida (entre 0 y 50.000).');
      inputPasos?.focus();
      return false;
    }
    estado.pasos = pasos;
    return true;
  }

  if (paso === 4) {
    const inputSesiones = document.querySelector(SELECTORES.inputSesiones);
    const inputDuracion = document.querySelector(SELECTORES.inputDuracionMinutos);
    const inputMet = document.querySelector(SELECTORES.inputMet);

    const sesiones = parseInt(inputSesiones?.value, 10);
    if (!Number.isFinite(sesiones) || sesiones < 0 || sesiones > 7) {
      mostrarError(4, 'Las sesiones semanales deben ser un número de 0 a 7 días.');
      inputSesiones?.focus();
      return false;
    }

    const duracion = parseInt(inputDuracion?.value, 10);
    if (!Number.isFinite(duracion) || duracion < 0 || duracion > 360) {
      mostrarError(4, 'La duración debe ser un valor válido entre 0 y 360 minutos.');
      inputDuracion?.focus();
      return false;
    }

    const met = parseFloat(inputMet?.value);
    if (!Number.isFinite(met) || met < 1 || met > 20) {
      mostrarError(4, 'La intensidad debe estar entre 1 y 20 METs.');
      return false;
    }

    estado.sesiones = sesiones;
    estado.duracionMinutos = duracion;
    estado.met = met;
    return true;
  }

  if (paso === 5) {
    if (!AJUSTES_OBJETIVO.hasOwnProperty(estado.tipoDieta)) {
      mostrarError(5, 'Por favor seleccioná un objetivo para tu plan.');
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Actualiza la vista previa de calorías del Paso 5.
 */
export function actualizarValoresPaso5() {
  const { tdeeTermo, caloriasObjetivo } = calcularMetabolismoCompleto();

  const elResumenCalorias = document.querySelector(SELECTORES.resumenCaloriasObjetivo);
  if (elResumenCalorias) {
    elResumenCalorias.textContent = formatearKcal(caloriasObjetivo);
  }

  const elDetalleMetabolismo = document.querySelector(SELECTORES.resumenMetabolismoDetalle);
  if (elDetalleMetabolismo) {
    elDetalleMetabolismo.textContent = `Gasto diario estimado (TDEE + digestión): ${formatearKcal(tdeeTermo)} kcal`;
  }

  // Actualizar cifras en cada botón de opción
  const mapaSelectoresNumeros = {
    deficit_leve: SELECTORES.numObjDeficitLeve,
    deficit_moderado: SELECTORES.numObjDeficitMod,
    mantenimiento: SELECTORES.numObjMantenimiento,
    superavit_leve: SELECTORES.numObjSuperavitLeve,
    superavit_moderado: SELECTORES.numObjSuperavitMod
  };

  for (const [tipo, ajuste] of Object.entries(AJUSTES_OBJETIVO)) {
    const sel = mapaSelectoresNumeros[tipo];
    const el = document.querySelector(sel);
    if (el) {
      const valorOpcion = Math.max(800, tdeeTermo + ajuste);
      el.textContent = formatearKcal(valorOpcion);
    }
  }
}

/**
 * Conmuta la visibilidad de los pasos y actualiza la barra del stepper.
 * @param {number} nuevoPaso
 */
export function cambiarPaso(nuevoPaso) {
  if (nuevoPaso < 1 || nuevoPaso > 5) return;
  pasoActual = nuevoPaso;

  // 1. Conmutar visibilidad de secciones mediante el atributo hidden
  const secciones = document.querySelectorAll(SELECTORES.pasos);
  secciones.forEach((sec, idx) => {
    sec.hidden = (idx + 1) !== pasoActual;
  });

  // 2. Actualizar Stepper Header
  const indicador = document.querySelector(SELECTORES.stepperIndicador);
  if (indicador) {
    indicador.textContent = `Paso ${pasoActual} de 5`;
  }

  const titulo = document.querySelector(SELECTORES.stepperTitulo);
  if (titulo) {
    titulo.textContent = TITULOS_PASOS[pasoActual] || '';
  }

  const barra = document.querySelector(SELECTORES.stepperBarra);
  if (barra) {
    barra.setAttribute('aria-valuenow', String(pasoActual));
  }

  const progreso = document.querySelector(SELECTORES.stepperProgreso);
  if (progreso) {
    progreso.style.width = `${pasoActual * 20}%`;
  }

  // 3. Navegación en el pie
  const btnAnterior = document.querySelector(SELECTORES.btnAnterior);
  const btnSiguiente = document.querySelector(SELECTORES.btnSiguiente);
  const btnFinalizar = document.querySelector(SELECTORES.btnFinalizar);

  if (btnAnterior) {
    btnAnterior.hidden = pasoActual === 1;
  }

  if (pasoActual < 5) {
    if (btnSiguiente) btnSiguiente.hidden = false;
    if (btnFinalizar) btnFinalizar.hidden = true;
  } else {
    if (btnSiguiente) btnSiguiente.hidden = true;
    if (btnFinalizar) btnFinalizar.hidden = false;
    actualizarValoresPaso5();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Guarda el contexto energético calculado y redirige a dashboard.html.
 */
export async function completarOnboarding() {
  if (!validarPaso(5)) return;

  const btnFinalizar = document.querySelector(SELECTORES.btnFinalizar);
  const textoOriginal = btnFinalizar?.textContent || 'Comenzar mi plan';
  if (btnFinalizar) {
    btnFinalizar.disabled = true;
    btnFinalizar.textContent = 'Guardando…';
  }

  try {
    const calc = calcularMetabolismoCompleto();
    const duracionHoras = estado.duracionMinutos / 60;

    const datosContexto = {
      sexo: estado.sexo,
      edad_anios: estado.edad,
      peso_kg: estado.peso,
      altura_cm: estado.altura,
      pasos_diarios: estado.pasos,
      met: estado.met,
      duracion_horas: Number(duracionHoras.toFixed(2)),
      sesiones_semana: estado.sesiones,
      tipo_dieta: estado.tipoDieta,
      bmr_kcal: calc.bmr,
      neat_kcal: calc.neat,
      gasto_sesion_kcal: calc.gastoSesion,
      entreno_diario_kcal: calc.promedioEntreno,
      tdee_kcal: calc.tdee,
      tdee_termogenesis_kcal: calc.tdeeTermo,
      ajuste_kcal: calc.ajuste,
      calorias_objetivo: calc.caloriasObjetivo,
      version_calculo: '1'
    };

    const usuarioId = cuentaActual?.usuarioId || 'alumno-local';
    await guardarContextoEnergetico(usuarioId, datosContexto);
    guardarAvisoToast('¡Perfil y objetivo configurados con éxito!');
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('[onboarding-ui] Error al guardar perfil y objetivo:', error);
    mostrarError(5, 'No se pudo guardar la configuración. Intentá nuevamente.');
    if (btnFinalizar) {
      btnFinalizar.disabled = false;
      btnFinalizar.textContent = textoOriginal;
    }
  }
}

/**
 * Configura los escuchadores de eventos reactivos para los 5 pasos.
 */
function configurarEventos() {
  // ===== PASO 1 =====
  const btnSexoM = document.querySelector(SELECTORES.btnSexoM);
  const btnSexoF = document.querySelector(SELECTORES.btnSexoF);
  const inputFechaNac = document.querySelector(SELECTORES.inputFechaNacimiento);
  const inputEdad = document.querySelector(SELECTORES.inputEdad);

  if (btnSexoM && btnSexoF) {
    btnSexoM.addEventListener('click', () => {
      btnSexoM.setAttribute('aria-checked', 'true');
      btnSexoF.setAttribute('aria-checked', 'false');
      estado.sexo = 'M';
      ocultarError(1);
    });

    btnSexoF.addEventListener('click', () => {
      btnSexoF.setAttribute('aria-checked', 'true');
      btnSexoM.setAttribute('aria-checked', 'false');
      estado.sexo = 'F';
      ocultarError(1);
    });
  }

  if (inputFechaNac && inputEdad) {
    inputFechaNac.addEventListener('change', () => {
      const val = inputFechaNac.value;
      if (val) {
        const fechaNac = new Date(val + 'T00:00:00');
        const hoy = new Date();
        let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
        const difMes = hoy.getMonth() - fechaNac.getMonth();
        if (difMes < 0 || (difMes === 0 && hoy.getDate() < fechaNac.getDate())) {
          edadCalculada--;
        }
        if (edadCalculada >= 10 && edadCalculada <= 100) {
          inputEdad.value = String(edadCalculada);
          estado.edad = edadCalculada;
          ocultarError(1);
        }
      }
    });

    inputEdad.addEventListener('input', () => {
      const n = parseInt(inputEdad.value, 10);
      if (Number.isFinite(n)) {
        estado.edad = n;
      }
    });
  }

  // ===== PASO 2 =====
  const inputAltura = document.querySelector(SELECTORES.inputAltura);
  const inputPeso = document.querySelector(SELECTORES.inputPeso);

  if (inputAltura) {
    inputAltura.addEventListener('input', () => {
      const a = parseFloat(inputAltura.value);
      if (Number.isFinite(a)) estado.altura = Math.round(a);
    });
  }

  if (inputPeso) {
    inputPeso.addEventListener('input', () => {
      const limpio = normalizarDecimal(inputPeso.value);
      const p = parseFloat(limpio);
      if (Number.isFinite(p)) estado.peso = Number(p.toFixed(1));
    });
  }

  // ===== PASO 3 =====
  const opcionSedentario = document.querySelector(SELECTORES.opcionNeatSedentario);
  const opcionModerado = document.querySelector(SELECTORES.opcionNeatModerado);
  const opcionActivo = document.querySelector(SELECTORES.opcionNeatActivo);
  const opcionPersonalizado = document.querySelector(SELECTORES.opcionNeatPersonalizado);
  const inputPasos = document.querySelector(SELECTORES.inputPasos);

  const opcionesNeat = [
    { btn: opcionSedentario, pasos: 4000 },
    { btn: opcionModerado, pasos: 8000 },
    { btn: opcionActivo, pasos: 12000 }
  ];

  function marcarOpcionNeat(btnElegido) {
    [opcionSedentario, opcionModerado, opcionActivo, opcionPersonalizado].forEach((b) => {
      if (b) b.setAttribute('aria-checked', b === btnElegido ? 'true' : 'false');
    });
  }

  opcionesNeat.forEach(({ btn, pasos }) => {
    if (btn) {
      btn.addEventListener('click', () => {
        marcarOpcionNeat(btn);
        if (inputPasos) inputPasos.value = String(pasos);
        estado.pasos = pasos;
        ocultarError(3);
      });
    }
  });

  if (opcionPersonalizado) {
    opcionPersonalizado.addEventListener('click', () => {
      marcarOpcionNeat(opcionPersonalizado);
      inputPasos?.focus();
      ocultarError(3);
    });
  }

  if (inputPasos) {
    inputPasos.addEventListener('input', () => {
      const p = parseInt(inputPasos.value, 10);
      if (Number.isFinite(p)) {
        estado.pasos = p;
        if (p === 4000) marcarOpcionNeat(opcionSedentario);
        else if (p === 8000) marcarOpcionNeat(opcionModerado);
        else if (p === 12000) marcarOpcionNeat(opcionActivo);
        else marcarOpcionNeat(opcionPersonalizado);
      }
    });
  }

  // ===== PASO 4 =====
  const inputSesiones = document.querySelector(SELECTORES.inputSesiones);
  const inputDuracion = document.querySelector(SELECTORES.inputDuracionMinutos);
  const btnSuave = document.querySelector(SELECTORES.btnIntensidadSuave);
  const btnMedia = document.querySelector(SELECTORES.btnIntensidadMedia);
  const btnIntensa = document.querySelector(SELECTORES.btnIntensidadIntensa);
  const ayudaIntensidad = document.querySelector(SELECTORES.ayudaIntensidad);
  const inputMet = document.querySelector(SELECTORES.inputMet);

  if (inputSesiones) {
    inputSesiones.addEventListener('input', () => {
      const s = parseInt(inputSesiones.value, 10);
      if (Number.isFinite(s)) estado.sesiones = s;
    });
  }

  if (inputDuracion) {
    inputDuracion.addEventListener('input', () => {
      const d = parseInt(inputDuracion.value, 10);
      if (Number.isFinite(d)) estado.duracionMinutos = d;
    });
  }

  const intensidades = [
    { btn: btnSuave, met: 3 },
    { btn: btnMedia, met: 6 },
    { btn: btnIntensa, met: 9 }
  ];

  intensidades.forEach(({ btn, met }) => {
    if (btn) {
      btn.addEventListener('click', () => {
        intensidades.forEach((item) => {
          item.btn?.setAttribute('aria-checked', item.btn === btn ? 'true' : 'false');
        });
        if (inputMet) inputMet.value = String(met);
        estado.met = met;
        if (ayudaIntensidad) {
          ayudaIntensidad.textContent = DESCRIPCIONES_INTENSIDAD[met] || '';
        }
        ocultarError(4);
      });
    }
  });

  // ===== PASO 5 =====
  const botonesObjetivo = [
    { btn: document.querySelector(SELECTORES.opcionDeficitLeve), tipo: 'deficit_leve' },
    { btn: document.querySelector(SELECTORES.opcionDeficitMod), tipo: 'deficit_moderado' },
    { btn: document.querySelector(SELECTORES.opcionMantenimiento), tipo: 'mantenimiento' },
    { btn: document.querySelector(SELECTORES.opcionSuperavitLeve), tipo: 'superavit_leve' },
    { btn: document.querySelector(SELECTORES.opcionSuperavitMod), tipo: 'superavit_moderado' }
  ];

  botonesObjetivo.forEach(({ btn, tipo }) => {
    if (btn) {
      btn.addEventListener('click', () => {
        botonesObjetivo.forEach((item) => {
          item.btn?.setAttribute('aria-checked', item.btn === btn ? 'true' : 'false');
        });
        estado.tipoDieta = tipo;
        actualizarValoresPaso5();
        ocultarError(5);
      });
    }
  });

  // ===== NAVEGACIÓN =====
  const btnAnterior = document.querySelector(SELECTORES.btnAnterior);
  const btnSiguiente = document.querySelector(SELECTORES.btnSiguiente);
  const btnFinalizar = document.querySelector(SELECTORES.btnFinalizar);

  if (btnSiguiente) {
    btnSiguiente.addEventListener('click', () => {
      if (validarPaso(pasoActual)) {
        cambiarPaso(pasoActual + 1);
      }
    });
  }

  if (btnAnterior) {
    btnAnterior.addEventListener('click', () => {
      ocultarError(pasoActual);
      cambiarPaso(pasoActual - 1);
    });
  }

  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
      completarOnboarding();
    });
  }
}

/**
 * Inicializa el asistente de Onboarding para el alumno autenticado.
 */
export async function iniciarOnboarding() {
  const form = document.querySelector(SELECTORES.formulario);
  if (!form) return;

  const cuenta = await exigirRol('alumno');
  if (!cuenta) return;
  cuentaActual = cuenta;

  configurarEventos();
  cambiarPaso(1);
}

// Auto-inicialización segura según el ciclo de vida del DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarOnboarding);
  } else {
    iniciarOnboarding();
  }
}
