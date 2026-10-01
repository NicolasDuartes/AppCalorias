// Controlador Principal de la Aplicación (AppCalorias)
// Integra reactividad, interfaz de usuario, cálculos y persistencia

import { FOOD_CATEGORIES, TOLERANCES, INITIAL_STATE } from './data/food-catalog.js';
import {
  calculateBMR,
  calculateNEAT,
  calculateTrainingExpenditure,
  calculateTDEE,
  getContextOptions,
  calculateTargetMacros,
  calculatePortionsTotals,
  calculateFoodItemNutrients,
  calculateMealSubtotal,
  calculateTotalDayMeals,
  evaluateTolerance
} from './utils/calculator.js';
import {
  getAllFoods,
  findFood,
  calculateFoodConversion
} from './utils/equivalences.js';
import {
  loadAppState,
  saveAppState,
  resetToDefaults
} from './utils/storage.js';

// Estado global en memoria
let state = loadAppState();

// Elementos DOM principales
const DOM = {
  themeToggle: document.getElementById('btn-theme-toggle'),
  resetExcelBtn: document.getElementById('btn-reset-excel'),
  printBtn: document.getElementById('btn-print'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),

  // HUD
  hudContextBadge: document.getElementById('hud-context-badge'),
  hudTargetCals: document.getElementById('hud-target-cals'),
  hudTdeeSubtext: document.getElementById('hud-tdee-subtext'),
  hudCalsProgress: document.getElementById('hud-cals-progress'),
  hudMealStatus: document.getElementById('hud-meal-status'),
  hudRealCals: document.getElementById('hud-real-cals'),
  hudCalsDiff: document.getElementById('hud-cals-diff'),
  hudMealCalsFill: document.getElementById('hud-meal-cals-fill'),
  hudPReal: document.getElementById('hud-p-real'),
  hudPTarget: document.getElementById('hud-p-target'),
  hudPDiff: document.getElementById('hud-p-diff'),
  hudPProgress: document.getElementById('hud-p-progress'),
  hudGReal: document.getElementById('hud-g-real'),
  hudGTarget: document.getElementById('hud-g-target'),
  hudGDiff: document.getElementById('hud-g-diff'),
  hudGProgress: document.getElementById('hud-g-progress'),
  hudChReal: document.getElementById('hud-ch-real'),
  hudChTarget: document.getElementById('hud-ch-target'),
  hudChDiff: document.getElementById('hud-ch-diff'),
  hudChProgress: document.getElementById('hud-ch-progress'),

  // Context Tab Inputs
  gender: document.getElementById('input-gender'),
  weight: document.getElementById('input-weight'),
  height: document.getElementById('input-height'),
  age: document.getElementById('input-age'),
  steps: document.getElementById('input-steps'),
  stepsBadge: document.getElementById('steps-badge'),
  met: document.getElementById('input-met'),
  hours: document.getElementById('input-hours'),
  sessions: document.getElementById('input-sessions'),
  customCals: document.getElementById('input-custom-cals'),
  btnSyncContext: document.getElementById('btn-sync-context'),
  contextGrid: document.getElementById('context-options-grid'),

  // Context Calculations Outputs
  valBmr: document.getElementById('val-bmr'),
  valNeat: document.getElementById('val-neat'),
  valBmrNeat: document.getElementById('val-bmr-neat'),
  valMetSession: document.getElementById('val-met-session'),
  valMetDay: document.getElementById('val-met-day'),
  valTdeeBase: document.getElementById('val-tdee-base'),
  valTef: document.getElementById('val-tef'),
  valTdeeTef: document.getElementById('val-tdee-tef'),

  // Portions & Macros Tab
  percP: document.getElementById('input-perc-p'),
  percG: document.getElementById('input-perc-g'),
  percCh: document.getElementById('input-perc-ch'),
  valTargetP: document.getElementById('val-target-p'),
  valTargetG: document.getElementById('val-target-g'),
  valTargetCh: document.getElementById('val-target-ch'),
  descMacroP: document.getElementById('desc-macro-p'),
  descMacroG: document.getElementById('desc-macro-g'),
  descMacroCh: document.getElementById('desc-macro-ch'),
  tbodyPortions: document.getElementById('tbody-portions-scheme'),
  footCount: document.getElementById('foot-portions-count'),
  footCh: document.getElementById('foot-portions-ch'),
  footP: document.getElementById('foot-portions-p'),
  footG: document.getElementById('foot-portions-g'),
  footKcal: document.getElementById('foot-portions-kcal'),
  btnResetPortions: document.getElementById('btn-reset-portions'),
  verif1Grid: document.getElementById('verif-1-grid'),

  // Meals Tab
  mealsContainer: document.getElementById('meals-container'),
  btnLoadSampleMeals: document.getElementById('btn-load-sample-meals'),
  btnAddMeal: document.getElementById('btn-add-meal'),
  verif2Grid: document.getElementById('verif-2-grid'),

  // Converter Tool
  convSourceFood: document.getElementById('conv-source-food'),
  convSourceAmount: document.getElementById('conv-source-amount'),
  convSourceUnit: document.getElementById('conv-source-unit'),
  convTargetFood: document.getElementById('conv-target-food'),
  convResultAmount: document.getElementById('conv-result-amount'),
  convResultPortions: document.getElementById('conv-result-portions'),
  convSummaryText: document.getElementById('conv-summary-text'),

  // Catalog
  catalogSearch: document.getElementById('catalog-search'),
  catalogFilters: document.getElementById('catalog-filters'),
  catalogGrid: document.getElementById('catalog-grid'),

  // Modal Add Item
  modalAddItem: document.getElementById('modal-add-item'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSubmitBtn: document.getElementById('modal-submit-btn'),
  modalMealId: document.getElementById('modal-meal-id'),
  modalMealName: document.getElementById('modal-meal-name'),
  modalCatSelect: document.getElementById('modal-category-select'),
  modalFoodSelect: document.getElementById('modal-food-select'),
  modalPortionsInput: document.getElementById('modal-portions-input'),
  modalDescInput: document.getElementById('modal-desc-input'),
  modalPrevCh: document.getElementById('modal-prev-ch'),
  modalPrevP: document.getElementById('modal-prev-p'),
  modalPrevG: document.getElementById('modal-prev-g'),
  modalPrevKcal: document.getElementById('modal-prev-kcal'),

  // Toast
  toastContainer: document.getElementById('toast-container')
};

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, icon = '✅') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// TABS NAVIGATION
// ==========================================
function setupTabs() {
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      DOM.tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// ==========================================
// THEME TOGGLE
// ==========================================
function setupTheme() {
  const savedTheme = localStorage.getItem('app_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  DOM.themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  DOM.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
    DOM.themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
  });
}

// ==========================================
// POPULATE INITIAL FORM VALUES
// ==========================================
function populateInputsFromState() {
  const p = state.profile;
  DOM.gender.value = p.gender;
  DOM.weight.value = p.weight;
  DOM.height.value = p.height;
  DOM.age.value = p.age;
  DOM.steps.value = p.steps;
  DOM.stepsBadge.textContent = `${Number(p.steps).toLocaleString()} pasos`;
  DOM.met.value = p.met;
  DOM.hours.value = p.trainingHours;
  DOM.sessions.value = p.sessionsPerWeek;
  DOM.customCals.value = p.customCalories;

  DOM.percP.value = state.macroPercentages.protein;
  DOM.percG.value = state.macroPercentages.fat;
  DOM.percCh.value = state.macroPercentages.carbs;
}

// ==========================================
// RENDER CONTEXT OPTIONS
// ==========================================
function renderContextCards(contextOptions, selectedContext) {
  DOM.contextGrid.innerHTML = '';
  for (const [name, cals] of Object.entries(contextOptions)) {
    const card = document.createElement('div');
    card.className = `context-option ${name === selectedContext ? 'selected' : ''}`;
    let diffText = '0 kcal';
    if (name === 'Déficit moderado') diffText = '-500 kcal';
    if (name === 'Déficit leve') diffText = '-300 kcal';
    if (name === 'Mantenimiento') diffText = 'Mismo gasto';
    if (name === 'Superávit leve') diffText = '+300 kcal';
    if (name === 'Superávit moderado') diffText = '+500 kcal';

    card.innerHTML = `
      <div class="context-name">${name}</div>
      <div class="context-cals">${Math.round(cals).toLocaleString()} <small style="font-size:0.75rem; color:var(--text-muted);">kcal</small></div>
      <div class="context-diff">${diffText}</div>
    `;

    card.addEventListener('click', () => {
      state.profile.context = name;
      state.profile.customCalories = cals;
      DOM.customCals.value = cals;
      saveAppState(state);
      updateAppCalculations();
      showToast(`Contexto "${name}" seleccionado (${Math.round(cals)} kcal)`);
    });

    DOM.contextGrid.appendChild(card);
  }
}

// ==========================================
// RENDER PORTIONS SCHEME TABLE
// ==========================================
function renderPortionsTable(portionsTotals) {
  DOM.tbodyPortions.innerHTML = '';
  let totalPortionsCount = 0;

  for (const [code, cat] of Object.entries(FOOD_CATEGORIES)) {
    const qty = state.portionsScheme[code] || 0;
    totalPortionsCount += qty;
    const catDetails = portionsTotals.details[code];

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="badge ${cat.badgeClass}" style="margin-right: 0.5rem;">${code}</span>
        <strong>${cat.name}</strong>
        <div style="font-size: 0.725rem; color: var(--text-muted);">${cat.description}</div>
      </td>
      <td>
        <div class="stepper">
          <button class="stepper-btn btn-portion-dec" data-code="${code}">-</button>
          <input type="number" class="stepper-input input-portion" data-code="${code}" value="${qty}" min="0" max="25" step="0.5">
          <button class="stepper-btn btn-portion-inc" data-code="${code}">+</button>
        </div>
      </td>
      <td><strong>${catDetails.ch}</strong> g</td>
      <td><strong>${catDetails.p}</strong> g</td>
      <td><strong>${catDetails.g}</strong> g</td>
      <td style="font-weight: 700; color: var(--text-primary);">${catDetails.kcal} kcal</td>
    `;
    DOM.tbodyPortions.appendChild(tr);
  }

  DOM.footCount.textContent = `${totalPortionsCount.toFixed(1)} porc.`;
  DOM.footCh.textContent = `${portionsTotals.ch} g`;
  DOM.footP.textContent = `${portionsTotals.p} g`;
  DOM.footG.textContent = `${portionsTotals.g} g`;
  DOM.footKcal.textContent = `${portionsTotals.kcal.toLocaleString()} kcal`;

  // Stepper events
  DOM.tbodyPortions.querySelectorAll('.btn-portion-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      const cur = parseFloat(state.portionsScheme[code]) || 0;
      if (cur > 0) {
        state.portionsScheme[code] = Math.max(0, cur - 0.5);
        saveAppState(state);
        updateAppCalculations();
      }
    });
  });

  DOM.tbodyPortions.querySelectorAll('.btn-portion-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      const cur = parseFloat(state.portionsScheme[code]) || 0;
      state.portionsScheme[code] = cur + 0.5;
      saveAppState(state);
      updateAppCalculations();
    });
  });

  DOM.tbodyPortions.querySelectorAll('.input-portion').forEach(inp => {
    inp.addEventListener('change', () => {
      const code = inp.getAttribute('data-code');
      const val = Math.max(0, parseFloat(inp.value) || 0);
      state.portionsScheme[code] = val;
      saveAppState(state);
      updateAppCalculations();
    });
  });
}

// ==========================================
// RENDER VERIFICATION CARDS (1 & 2)
// ==========================================
function renderVerificationGrid(container, targetMacros, actualTotals) {
  container.innerHTML = '';

  const items = [
    { key: 'protein', name: 'Proteínas', req: targetMacros.protein.grams, act: actualTotals.p, unit: 'g' },
    { key: 'fat', name: 'Grasas', req: targetMacros.fat.grams, act: actualTotals.g, unit: 'g' },
    { key: 'carbs', name: 'Carbohidratos', req: targetMacros.carbs.grams, act: actualTotals.ch, unit: 'g' },
    { key: 'calories', name: 'Calorías', req: targetMacros.calories, act: actualTotals.kcal, unit: 'kcal' }
  ];

  for (const item of items) {
    const evalResult = evaluateTolerance(item.req, item.act, item.key);
    const card = document.createElement('div');
    card.className = 'verif-card';
    card.innerHTML = `
      <div class="verif-card-header">
        <span>${item.name}</span>
        <span class="status-pill ${evalResult.status}">${evalResult.label}</span>
      </div>
      <div class="verif-numbers">
        <span class="verif-val">${Math.round(item.act)} <small>${item.unit}</small></span>
        <span class="verif-target">Obj: ${Math.round(item.req)} ${item.unit}</span>
      </div>
      <div class="verif-footer">
        <span style="font-weight: 700; color: ${evalResult.inRange ? 'var(--status-optimal)' : 'var(--status-warning)'};">
          Diferencia: ${evalResult.diffFormatted}
        </span>
        <span style="color: var(--text-muted); font-size: 0.7rem;">Tol: ${evalResult.toleranceText}</span>
      </div>
    `;
    container.appendChild(card);
  }
}

// ==========================================
// RENDER MEALS
// ==========================================
function renderMeals(meals) {
  DOM.mealsContainer.innerHTML = '';

  meals.forEach((meal, mealIdx) => {
    const subtotal = calculateMealSubtotal(meal.items);

    const mealBlock = document.createElement('div');
    mealBlock.className = 'meal-block';
    mealBlock.setAttribute('data-meal-id', meal.id);

    // Header
    let itemsHtml = '';
    if (meal.items.length === 0) {
      itemsHtml = `<div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Sin alimentos en esta comida. Haz clic en "+ Agregar Alimento".</div>`;
    } else {
      itemsHtml = meal.items.map((item, itemIdx) => {
        const cat = FOOD_CATEGORIES[item.category] || { badgeClass: 'badge-hc', name: item.category };
        const nuts = calculateFoodItemNutrients(item.category, item.portions);
        return `
          <div class="meal-item-row" data-item-idx="${itemIdx}">
            <div class="meal-item-info">
              <span class="badge ${cat.badgeClass}">${item.category}</span>
              <div>
                <div class="meal-item-title">${item.foodName}</div>
                <div class="meal-item-amount">${item.amountDesc || ''} (${item.portions} porc.)</div>
              </div>
            </div>
            <div class="meal-item-macros">
              <span>CH: <strong>${nuts.ch}g</strong></span>
              <span>P: <strong>${nuts.p}g</strong></span>
              <span>G: <strong>${nuts.g}g</strong></span>
              <span style="color: var(--accent-primary);"><strong>${nuts.kcal} kcal</strong></span>
            </div>
            <div class="meal-item-actions">
              <button class="btn btn-ghost btn-sm btn-delete-item" data-meal-idx="${mealIdx}" data-item-idx="${itemIdx}" title="Eliminar alimento">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    mealBlock.innerHTML = `
      <div class="meal-header">
        <div class="meal-name">
          <span>🍽️</span> ${meal.name}
        </div>
        <div class="meal-subtotal-badge">
          Subtotal: <strong>${subtotal.kcal} kcal</strong> (CH: ${subtotal.ch}g | P: ${subtotal.p}g | G: ${subtotal.g}g)
        </div>
      </div>
      <div class="meal-items-list">
        ${itemsHtml}
      </div>
      <div class="meal-footer">
        <button class="btn btn-outline btn-sm btn-add-food-to-meal" data-meal-id="${meal.id}" data-meal-name="${meal.name}">
          + Agregar Alimento
        </button>
        ${meals.length > 1 ? `<button class="btn btn-ghost btn-sm btn-remove-meal" data-meal-idx="${mealIdx}" title="Eliminar esta comida" style="color: var(--accent-rose);">Eliminar Comida</button>` : ''}
      </div>
    `;

    DOM.mealsContainer.appendChild(mealBlock);
  });

  // Event Listeners for Meal Actions
  DOM.mealsContainer.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const mIdx = parseInt(btn.getAttribute('data-meal-idx'), 10);
      const iIdx = parseInt(btn.getAttribute('data-item-idx'), 10);
      state.meals[mIdx].items.splice(iIdx, 1);
      saveAppState(state);
      updateAppCalculations();
      showToast('Alimento eliminado');
    });
  });

  DOM.mealsContainer.querySelectorAll('.btn-add-food-to-meal').forEach(btn => {
    btn.addEventListener('click', () => {
      const mealId = btn.getAttribute('data-meal-id');
      const mealName = btn.getAttribute('data-meal-name');
      openAddItemModal(mealId, mealName);
    });
  });

  DOM.mealsContainer.querySelectorAll('.btn-remove-meal').forEach(btn => {
    btn.addEventListener('click', () => {
      const mIdx = parseInt(btn.getAttribute('data-meal-idx'), 10);
      const name = state.meals[mIdx].name;
      if (confirm(`¿Seguro que deseas eliminar la comida "${name}"?`)) {
        state.meals.splice(mIdx, 1);
        saveAppState(state);
        updateAppCalculations();
        showToast(`Comida "${name}" eliminada`);
      }
    });
  });
}

// ==========================================
// MODAL: ADD FOOD ITEM
// ==========================================
function openAddItemModal(mealId, mealName) {
  DOM.modalMealId.value = mealId;
  DOM.modalMealName.textContent = mealName;
  DOM.modalCatSelect.value = 'HC';
  DOM.modalPortionsInput.value = '1.0';
  populateModalFoodsList('HC');
  updateModalPreview();
  DOM.modalAddItem.classList.add('open');
}

function closeModal() {
  DOM.modalAddItem.classList.remove('open');
}

function populateModalFoodsList(catCode) {
  const cat = FOOD_CATEGORIES[catCode];
  DOM.modalFoodSelect.innerHTML = '';
  if (!cat) return;

  cat.items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.textContent = `${item.name} (${item.servingDesc})`;
    opt.setAttribute('data-serving-grams', item.servingGrams);
    opt.setAttribute('data-unit', item.unit);
    opt.setAttribute('data-desc', item.servingDesc);
    DOM.modalFoodSelect.appendChild(opt);
  });

  updateModalFoodDesc();
}

function updateModalFoodDesc() {
  const selectedOpt = DOM.modalFoodSelect.selectedOptions[0];
  const portions = parseFloat(DOM.modalPortionsInput.value) || 1;
  if (selectedOpt) {
    const grams = parseFloat(selectedOpt.getAttribute('data-serving-grams')) || 0;
    const unit = selectedOpt.getAttribute('data-unit') || 'gr';
    const totalGrams = Math.round(grams * portions * 10) / 10;
    DOM.modalDescInput.value = `${totalGrams}${unit} (${portions} porc.)`;
  }
}

function updateModalPreview() {
  const catCode = DOM.modalCatSelect.value;
  const portions = parseFloat(DOM.modalPortionsInput.value) || 0;
  const nuts = calculateFoodItemNutrients(catCode, portions);

  DOM.modalPrevCh.textContent = nuts.ch;
  DOM.modalPrevP.textContent = nuts.p;
  DOM.modalPrevG.textContent = nuts.g;
  DOM.modalPrevKcal.textContent = nuts.kcal;
}

function setupModal() {
  DOM.modalCloseBtn.addEventListener('click', closeModal);
  DOM.modalCancelBtn.addEventListener('click', closeModal);

  DOM.modalCatSelect.addEventListener('change', () => {
    populateModalFoodsList(DOM.modalCatSelect.value);
    updateModalPreview();
  });

  DOM.modalFoodSelect.addEventListener('change', () => {
    updateModalFoodDesc();
    updateModalPreview();
  });

  DOM.modalPortionsInput.addEventListener('input', () => {
    updateModalFoodDesc();
    updateModalPreview();
  });

  DOM.modalSubmitBtn.addEventListener('click', () => {
    const mealId = DOM.modalMealId.value;
    const targetMeal = state.meals.find(m => m.id === mealId);
    if (!targetMeal) return;

    const foodName = DOM.modalFoodSelect.value;
    const category = DOM.modalCatSelect.value;
    const portions = parseFloat(DOM.modalPortionsInput.value) || 1;
    const amountDesc = DOM.modalDescInput.value;

    targetMeal.items.push({
      foodName,
      category,
      portions,
      amountDesc
    });

    saveAppState(state);
    updateAppCalculations();
    closeModal();
    showToast(`"${foodName}" agregado a ${targetMeal.name}`);
  });
}

// ==========================================
// EQUIVALENCE CONVERTER TOOL
// ==========================================
function setupEquivalenceConverter() {
  const allFoods = getAllFoods();

  // Populate Selects
  DOM.convSourceFood.innerHTML = '';
  DOM.convTargetFood.innerHTML = '';

  allFoods.forEach((f, idx) => {
    const optA = document.createElement('option');
    optA.value = f.name;
    optA.textContent = `[${f.categoryCode}] ${f.name} (Porción: ${f.servingDesc})`;
    DOM.convSourceFood.appendChild(optA);

    const optB = document.createElement('option');
    optB.value = f.name;
    optB.textContent = `[${f.categoryCode}] ${f.name} (Porción: ${f.servingDesc})`;
    DOM.convTargetFood.appendChild(optB);
  });

  // Default selections: Arroz -> Papa
  DOM.convSourceFood.value = 'Arroz';
  DOM.convTargetFood.value = 'Papa / Batata';
  DOM.convSourceAmount.value = '60';

  function runConversion() {
    const nameA = DOM.convSourceFood.value;
    const nameB = DOM.convTargetFood.value;
    const foodA = findFood(nameA);
    const foodB = findFood(nameB);

    if (!foodA || !foodB) return;

    DOM.convSourceUnit.value = foodA.unit;

    const amountA = parseFloat(DOM.convSourceAmount.value) || 0;
    const conversion = calculateFoodConversion({
      foodFrom: foodA,
      amountFrom: amountA,
      foodTo: foodB
    });

    if (conversion) {
      DOM.convResultAmount.value = `${conversion.equivalentGrams} ${conversion.unit}`;
      DOM.convResultPortions.value = `${conversion.portions} porciones`;

      if (conversion.sameCategory) {
        DOM.convSummaryText.innerHTML = `
          <strong>${amountA} ${foodA.unit} de "${foodA.name}"</strong> equivale a 
          <span style="color: var(--accent-primary);">${conversion.equivalentGrams} ${conversion.unit} de "${foodB.name}"</span> 
          (${conversion.portions} porción de ${foodA.categoryName}).
        `;
      } else {
        DOM.convSummaryText.innerHTML = `
          <span style="color: var(--status-warning);">Nota: Pertenecen a categorías diferentes (${foodA.categoryCode} vs ${foodB.categoryCode}).</span><br>
          Equivalencia aproximada por porciones: <strong>${conversion.equivalentGrams} ${conversion.unit}</strong> de "${foodB.name}".
        `;
      }
    }
  }

  DOM.convSourceFood.addEventListener('change', () => {
    const foodA = findFood(DOM.convSourceFood.value);
    if (foodA) {
      DOM.convSourceAmount.value = foodA.servingGrams;
      DOM.convSourceUnit.value = foodA.unit;
    }
    runConversion();
  });

  DOM.convTargetFood.addEventListener('change', runConversion);
  DOM.convSourceAmount.addEventListener('input', runConversion);

  runConversion();
}

// ==========================================
// FOOD CATALOG RENDERING & FILTER
// ==========================================
function renderFoodCatalog(filterCategory = 'all', searchQuery = '') {
  DOM.catalogGrid.innerHTML = '';
  const allFoods = getAllFoods();
  const query = searchQuery.trim().toLowerCase();

  const filtered = allFoods.filter(item => {
    const matchCategory = filterCategory === 'all' || item.categoryCode === filterCategory;
    const matchQuery = !query || item.name.toLowerCase().includes(query) || item.servingDesc.toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });

  if (filtered.length === 0) {
    DOM.catalogGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">No se encontraron alimentos con los filtros actuales.</div>`;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.innerHTML = `
      <div>
        <div class="food-card-header">
          <span class="food-card-title">${item.name}</span>
          <span class="badge badge-${item.categoryCode.toLowerCase()}">${item.categoryCode}</span>
        </div>
        <div class="food-card-desc">
          <strong>1 porción:</strong> ${item.servingDesc}
          ${item.subtype ? `<br><small style="color:var(--text-muted);">${item.subtype}</small>` : ''}
        </div>
      </div>
      <div class="food-card-macros">
        <span>CH: ${item.macros.ch}g</span>
        <span>P: ${item.macros.p}g</span>
        <span>G: ${item.macros.g}g</span>
        <span style="font-weight:700; color:var(--text-primary);">${item.macros.kcal} kcal</span>
      </div>
    `;
    DOM.catalogGrid.appendChild(card);
  });
}

function setupCatalog() {
  let activeFilter = 'all';

  DOM.catalogFilters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.catalogFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderFoodCatalog(activeFilter, DOM.catalogSearch.value);
    });
  });

  DOM.catalogSearch.addEventListener('input', () => {
    renderFoodCatalog(activeFilter, DOM.catalogSearch.value);
  });

  renderFoodCatalog('all', '');
}

// ==========================================
// MASTER RECALCULATION & SYNC
// ==========================================
function updateAppCalculations() {
  const p = state.profile;

  // 1) BMR
  const bmr = calculateBMR(p.gender, p.weight, p.height, p.age);
  DOM.valBmr.textContent = `${bmr.toLocaleString()} kcal`;

  // 2) NEAT
  const neat = calculateNEAT(p.steps);
  DOM.valNeat.textContent = `${neat.toLocaleString()} kcal`;
  DOM.valBmrNeat.textContent = `${Math.round(bmr + neat).toLocaleString()} kcal`;

  // 3) Training
  const training = calculateTrainingExpenditure(p.met, p.weight, p.trainingHours, p.sessionsPerWeek);
  DOM.valMetSession.textContent = `${training.perSession.toLocaleString()} kcal`;
  DOM.valMetDay.textContent = `${training.perDay.toLocaleString()} kcal`;

  // 4) TDEE & TEF
  const tdeeResults = calculateTDEE(bmr, neat, training.perDay);
  DOM.valTdeeBase.textContent = `${tdeeResults.tdee.toLocaleString()} kcal`;
  DOM.valTef.textContent = `+${tdeeResults.tef.toLocaleString()} kcal`;
  DOM.valTdeeTef.textContent = `${tdeeResults.tdeeWithTEF.toLocaleString()} kcal`;

  // 5) Context options
  const contextOptions = getContextOptions(tdeeResults.tdeeWithTEF);
  renderContextCards(contextOptions, p.context);

  // Target calories
  const targetCalories = parseFloat(p.customCalories) || contextOptions[p.context] || tdeeResults.tdeeWithTEF;
  
  // 6) Target Macros
  const targetMacros = calculateTargetMacros(targetCalories, state.macroPercentages);
  DOM.valTargetP.textContent = `${targetMacros.protein.grams} g`;
  DOM.valTargetG.textContent = `${targetMacros.fat.grams} g`;
  DOM.valTargetCh.textContent = `${targetMacros.carbs.grams} g`;

  DOM.descMacroP.textContent = `${Math.round(targetMacros.protein.kcal)} kcal (${targetMacros.protein.percentage}%)`;
  DOM.descMacroG.textContent = `${Math.round(targetMacros.fat.kcal)} kcal (${targetMacros.fat.percentage}%)`;
  DOM.descMacroCh.textContent = `${Math.round(targetMacros.carbs.kcal)} kcal (${targetMacros.carbs.percentage}%)`;

  // 7) Portions Scheme Totals & Verificación 1
  const portionsTotals = calculatePortionsTotals(state.portionsScheme);
  renderPortionsTable(portionsTotals);
  renderVerificationGrid(DOM.verif1Grid, targetMacros, portionsTotals);

  // 8) Real Meals Totals & Verificación 2
  const dayMealsTotals = calculateTotalDayMeals(state.meals);
  renderMeals(state.meals);
  renderVerificationGrid(DOM.verif2Grid, targetMacros, dayMealsTotals);

  // 9) Update Quick HUD
  DOM.hudContextBadge.textContent = p.context;
  DOM.hudTargetCals.textContent = Math.round(targetCalories).toLocaleString();
  DOM.hudTdeeSubtext.textContent = `TDEE + Termogénesis: ${Math.round(tdeeResults.tdeeWithTEF).toLocaleString()} kcal`;

  DOM.hudRealCals.textContent = Math.round(dayMealsTotals.kcal).toLocaleString();
  const calsDiff = Math.round(dayMealsTotals.kcal - targetCalories);
  const sign = calsDiff > 0 ? '+' : '';
  DOM.hudCalsDiff.textContent = `${sign}${calsDiff} kcal vs objetivo`;

  const calsPercent = targetCalories > 0 ? Math.min(150, Math.round((dayMealsTotals.kcal / targetCalories) * 100)) : 0;
  DOM.hudMealCalsFill.style.width = `${calsPercent}%`;

  const mealEval = evaluateTolerance(targetCalories, dayMealsTotals.kcal, 'calories');
  DOM.hudMealStatus.className = `status-pill ${mealEval.status}`;
  DOM.hudMealStatus.textContent = mealEval.label;

  // Protein HUD
  DOM.hudPReal.textContent = Math.round(dayMealsTotals.p);
  DOM.hudPTarget.textContent = `${Math.round(targetMacros.protein.grams)}g`;
  const pDiff = Math.round((dayMealsTotals.p - targetMacros.protein.grams) * 10) / 10;
  DOM.hudPDiff.textContent = `${pDiff > 0 ? '+' : ''}${pDiff}g vs req.`;
  const pPercent = targetMacros.protein.grams > 0 ? Math.min(150, Math.round((dayMealsTotals.p / targetMacros.protein.grams) * 100)) : 0;
  DOM.hudPProgress.style.width = `${pPercent}%`;

  // Fat HUD
  DOM.hudGReal.textContent = Math.round(dayMealsTotals.g * 10) / 10;
  DOM.hudGTarget.textContent = `${Math.round(targetMacros.fat.grams)}g`;
  const gDiff = Math.round((dayMealsTotals.g - targetMacros.fat.grams) * 10) / 10;
  DOM.hudGDiff.textContent = `${gDiff > 0 ? '+' : ''}${gDiff}g vs req.`;
  const gPercent = targetMacros.fat.grams > 0 ? Math.min(150, Math.round((dayMealsTotals.g / targetMacros.fat.grams) * 100)) : 0;
  DOM.hudGProgress.style.width = `${gPercent}%`;

  // Carbs HUD
  DOM.hudChReal.textContent = Math.round(dayMealsTotals.ch);
  DOM.hudChTarget.textContent = `${Math.round(targetMacros.carbs.grams)}g`;
  const chDiff = Math.round((dayMealsTotals.ch - targetMacros.carbs.grams) * 10) / 10;
  DOM.hudChDiff.textContent = `${chDiff > 0 ? '+' : ''}${chDiff}g vs req.`;
  const chPercent = targetMacros.carbs.grams > 0 ? Math.min(150, Math.round((dayMealsTotals.ch / targetMacros.carbs.grams) * 100)) : 0;
  DOM.hudChProgress.style.width = `${chPercent}%`;
}

// ==========================================
// EVENT LISTENERS FOR CONTROLS
// ==========================================
function setupEventListeners() {
  // Personal profile inputs
  const profileInputs = [DOM.gender, DOM.weight, DOM.height, DOM.age, DOM.steps, DOM.met, DOM.hours, DOM.sessions];
  profileInputs.forEach(input => {
    input.addEventListener('input', () => {
      state.profile.gender = DOM.gender.value;
      state.profile.weight = parseFloat(DOM.weight.value) || 0;
      state.profile.height = parseFloat(DOM.height.value) || 0;
      state.profile.age = parseFloat(DOM.age.value) || 0;
      state.profile.steps = parseInt(DOM.steps.value, 10) || 0;
      DOM.stepsBadge.textContent = `${state.profile.steps.toLocaleString()} pasos`;
      state.profile.met = parseFloat(DOM.met.value) || 5;
      state.profile.trainingHours = parseFloat(DOM.hours.value) || 1;
      state.profile.sessionsPerWeek = parseFloat(DOM.sessions.value) || 4;

      saveAppState(state);
      updateAppCalculations();
    });
  });

  // Custom calories input
  DOM.customCals.addEventListener('change', () => {
    const val = parseFloat(DOM.customCals.value) || 0;
    if (val > 500) {
      state.profile.customCalories = val;
      saveAppState(state);
      updateAppCalculations();
      showToast(`Calorías objetivo actualizadas a ${Math.round(val)} kcal`);
    }
  });

  // Sync context button
  DOM.btnSyncContext.addEventListener('click', () => {
    const bmr = calculateBMR(state.profile.gender, state.profile.weight, state.profile.height, state.profile.age);
    const neat = calculateNEAT(state.profile.steps);
    const training = calculateTrainingExpenditure(state.profile.met, state.profile.weight, state.profile.trainingHours, state.profile.sessionsPerWeek);
    const tdee = calculateTDEE(bmr, neat, training.perDay);
    const contextOptions = getContextOptions(tdee.tdeeWithTEF);

    const autoCals = contextOptions[state.profile.context] || tdee.tdeeWithTEF;
    state.profile.customCalories = autoCals;
    DOM.customCals.value = autoCals;
    saveAppState(state);
    updateAppCalculations();
    showToast(`Sincronizado con contexto: ${Math.round(autoCals)} kcal`);
  });

  // Macro percentages inputs
  const macroInputs = [DOM.percP, DOM.percG, DOM.percCh];
  macroInputs.forEach(input => {
    input.addEventListener('change', () => {
      state.macroPercentages.protein = parseFloat(DOM.percP.value) || 0;
      state.macroPercentages.fat = parseFloat(DOM.percG.value) || 0;
      state.macroPercentages.carbs = parseFloat(DOM.percCh.value) || 0;
      saveAppState(state);
      updateAppCalculations();
    });
  });

  // Reset Portions Button
  DOM.btnResetPortions.addEventListener('click', () => {
    state.portionsScheme = { ...INITIAL_STATE.portionsScheme };
    saveAppState(state);
    updateAppCalculations();
    showToast('Esquema de porciones restablecido a valores del Excel');
  });

  // Load Sample Meals Button
  DOM.btnLoadSampleMeals.addEventListener('click', () => {
    state.meals = JSON.parse(JSON.stringify(INITIAL_STATE.meals));
    saveAppState(state);
    updateAppCalculations();
    showToast('Plan de comidas cargado con el ejemplo del Excel');
  });

  // Add Meal Button
  DOM.btnAddMeal.addEventListener('click', () => {
    const name = prompt('Nombre de la nueva comida (ej: Colación / Snack / Pre-entreno):');
    if (name && name.trim()) {
      const newId = 'meal_' + Date.now();
      state.meals.push({
        id: newId,
        name: name.trim(),
        items: []
      });
      saveAppState(state);
      updateAppCalculations();
      showToast(`Comida "${name.trim()}" agregada`);
    }
  });

  // Reset to full Excel values
  DOM.resetExcelBtn.addEventListener('click', () => {
    if (confirm('¿Restablecer todos los datos a los valores originales de la planilla de Nico Duartes?')) {
      state = resetToDefaults();
      populateInputsFromState();
      updateAppCalculations();
      showToast('Todos los datos fueron restablecidos a los originales del Excel');
    }
  });

  // Print / PDF Button
  DOM.printBtn.addEventListener('click', () => {
    window.print();
  });
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  setupTheme();
  setupTabs();
  populateInputsFromState();
  setupEventListeners();
  setupModal();
  setupEquivalenceConverter();
  setupCatalog();
  updateAppCalculations();
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
