    import { supabase } from '../../../backend/config/supabase.js';

    let currentMode = 'porciones';
    let activeMealId = 'desayuno';

    // Dynamic targets from meal_plans
    let targetKcal = 2300;
    let targetP = 140;
    let targetHC = 260;
    let targetG = 65;
    let targetPorc = 15;

    const mealsData = {
      desayuno: {
        title: 'Desayuno',
        time: '08:30 AM',
        icon: '☀️',
        bgIcon: '#FEF3C7',
        colorIcon: '#D97706',
        items: []
      },
      almuerzo: {
        title: 'Almuerzo',
        time: '01:15 PM',
        icon: '🍲',
        bgIcon: '#FEE2E2',
        colorIcon: '#DC2626',
        items: []
      },
      merienda: {
        title: 'Merienda',
        time: '05:00 PM',
        icon: '☕',
        bgIcon: '#E0E7FF',
        colorIcon: '#4F46E5',
        items: []
      },
      cena: {
        title: 'Cena',
        time: '09:00 PM',
        icon: '🌙',
        bgIcon: '#F3E8FF',
        colorIcon: '#9333EA',
        items: []
      }
    };

    const replacementOptions = {
      HC: [
        { name: 'Pan integral', desc: '70g • 2 miñones' },
        { name: 'Galletas de arroz', desc: '60g • 8 unidades' },
        { name: 'Pan de molde / lactal', desc: '85g • 3 rebanadas' },
        { name: 'Avena en copos', desc: '70g • 3/4 taza' },
        { name: 'Copos de maíz (sin azúcar)', desc: '50g • 1 taza' }
      ],
      Dulce: [
        { name: 'Dulce de leche', desc: '25g (1 cda sopera)' },
        { name: 'Miel pura', desc: '25g (1 cda sopera)' },
        { name: 'Mermelada común', desc: '30g (1.5 cdas soperas)' },
        { name: 'Chocolate semi-amargo (>60%)', desc: '20g (2 cuadraditos)' }
      ],
      Fruta: [
        { name: 'Banana madura', desc: '110g (1 chica)' },
        { name: 'Manzana / Pera', desc: '170g (1 mediana)' },
        { name: 'Cítricos (naranja/mandarina)', desc: '200g (2 medianas)' },
        { name: 'Frutos rojos (arándanos/frutillas)', desc: '220g (1.5 tazas)' }
      ],
      'P. Magra': [
        { name: 'Pechuga de pollo', desc: '110g crudo (90g cocido)' },
        { name: 'Carne vacuna magra (peceto)', desc: '110g crudo' },
        { name: 'Atún al natural', desc: '130g escurrido (1 lata)' },
        { name: 'Scoop Proteína Whey', desc: '30g (1 scoop colmado)' },
        { name: 'Claras de huevo', desc: '210g (7 unidades)' }
      ],
      'P. Grasa': [
        { name: 'Huevo entero', desc: '1 unidad (60g)' },
        { name: 'Queso semi-duro (tybo)', desc: '35g (1 feta gruesa)' },
        { name: 'Queso untable descremado', desc: '60g (2 cdas soperas)' }
      ],
      Lácteo: [
        { name: 'Yogur griego natural', desc: '150g (1 pote)' },
        { name: 'Leche descremada', desc: '250ml (1 taza grande)' },
        { name: 'Yogur bebible descremado', desc: '250ml (1 vaso grande)' }
      ],
      Grasa: [
        { name: 'Crema de maní natural', desc: '30g (1 cda sopera colmada)' },
        { name: 'Palta (aguacate)', desc: '75g (media unidad chica)' },
        { name: 'Aceite de oliva / girasol', desc: '14g (1 cda sopera)' },
        { name: 'Frutos secos (nueces/almendras)', desc: '30g (1 puñado)' }
      ]
    };

    const addFoodCatalog = {
      P: {
        label: 'Subcategorías de proteína',
        badge: '1 porc. = 25g Proteína base',
        subgroups: [
          {
            id: 'magras',
            title: 'Proteínas magras',
            desc: '1 porc. = 25g P • 3-15g G',
            icon: '🥩',
            bgIcon: 'bg-rose-50',
            groupKey: 'P. Magra',
            items: [
              { name: 'Carne magra (vaca/pollo)', desc: '110g crudo = 1 porc.', icon: '🥩', p: 25, hc: 0, g: 3, kcal: 130 },
              { name: 'Scoop de proteína (Whey)', desc: '30g = 1 porc.', icon: '🥤', p: 24, hc: 2, g: 1.5, kcal: 120 },
              { name: 'Claras de huevo', desc: '7 unidades = 1 porc.', icon: '🥚', p: 24, hc: 1, g: 0.5, kcal: 110 },
              { name: 'Atún al natural', desc: '1 lata (130g) = 1 porc.', icon: '🐟', p: 28, hc: 0, g: 1, kcal: 120 }
            ]
          },
          {
            id: 'grasas',
            title: 'Proteínas grasas',
            desc: '1 porc. = 10g G • 8.5g P',
            icon: '🍳',
            bgIcon: 'bg-amber-50',
            groupKey: 'P. Grasa',
            items: [
              { name: 'Huevo entero', desc: '1 unidad = 1 porc.', icon: '🍳', p: 7, hc: 0.5, g: 5, kcal: 75 },
              { name: 'Queso semi-duro', desc: '40g = 1 porc.', icon: '🧀', p: 9, hc: 1, g: 10, kcal: 130 },
              { name: 'Queso untable', desc: '60g = 1 porc.', icon: '🥣', p: 6, hc: 3, g: 4, kcal: 72 }
            ]
          },
          {
            id: 'legumbres',
            title: 'Legumbres',
            desc: '1 porc. = 20g HC • 8g P',
            icon: '🫘',
            bgIcon: 'bg-orange-50',
            groupKey: 'HC',
            items: [
              { name: 'Lentejas cocidas', desc: '130g = 1 porc.', icon: '🫘', p: 9, hc: 20, g: 0.5, kcal: 120 },
              { name: 'Garbanzos cocidos', desc: '120g = 1 porc.', icon: '🫘', p: 8, hc: 22, g: 2, kcal: 140 }
            ]
          },
          {
            id: 'lacteos',
            title: 'Lácteos',
            desc: '1 porc. = 20g HC • 10g P',
            icon: '🥛',
            bgIcon: 'bg-sky-50',
            groupKey: 'Lácteo',
            items: [
              { name: 'Leche descremada', desc: '250ml = 1 porc.', icon: '🥛', p: 8, hc: 12, g: 1, kcal: 90 },
              { name: 'Yogur griego', desc: '150g = 1 porc.', icon: '🥛', p: 15, hc: 6, g: 4, kcal: 120 }
            ]
          }
        ]
      },
      HC: {
        label: 'Subcategorías de carbohidratos',
        badge: '1 porc. = 40g HC base',
        subgroups: [
          {
            id: 'hc_puros',
            title: 'Hidratos de carbono',
            desc: '1 porc. = 40g HC • 190 kcal',
            icon: '🌾',
            bgIcon: 'bg-amber-50',
            groupKey: 'HC',
            items: [
              { name: 'Arroz integral', desc: '60g crudo = 1 porc.', icon: '🍚', p: 4, hc: 45, g: 1.5, kcal: 210 },
              { name: 'Fideos / Pastas', desc: '60g crudo = 1 porc.', icon: '🍝', p: 6, hc: 44, g: 1, kcal: 210 },
              { name: 'Papa / Batata', desc: '210g = 1 porc.', icon: '🥔', p: 3, hc: 38, g: 0.2, kcal: 165 },
              { name: 'Pan integral', desc: '70g = 1 porc.', icon: '🍞', p: 5, hc: 35, g: 1.5, kcal: 175 }
            ]
          },
          {
            id: 'frutas',
            title: 'Frutas',
            desc: '1 porc. = 20g HC • 90 kcal',
            icon: '🍎',
            bgIcon: 'bg-rose-50',
            groupKey: 'Fruta',
            items: [
              { name: 'Manzana / Pera', desc: '170g = 1 porc.', icon: '🍎', p: 0.5, hc: 22, g: 0.2, kcal: 90 },
              { name: 'Banana madura', desc: '110g = 1 porc.', icon: '🍌', p: 1, hc: 23, g: 0.2, kcal: 95 }
            ]
          },
          {
            id: 'dulces',
            title: 'Dulces',
            desc: '1 porc. = 20g HC simples',
            icon: '🍯',
            bgIcon: 'bg-orange-50',
            groupKey: 'Dulce',
            items: [
              { name: 'Dulce de leche', desc: '25g = 1 porc.', icon: '🍯', p: 1.5, hc: 14, g: 2, kcal: 80 },
              { name: 'Miel pura', desc: '25g = 1 porc.', icon: '🍯', p: 0.1, hc: 20, g: 0, kcal: 80 }
            ]
          }
        ]
      },
      G: {
        label: 'Subcategorías de grasas',
        badge: '1 porc. = 15g Grasa base',
        subgroups: [
          {
            id: 'grasas_oleosas',
            title: 'Frutas oleosas / Grasas',
            desc: '1 porc. = 15g Grasa • 135 kcal',
            icon: '🥑',
            bgIcon: 'bg-emerald-50',
            groupKey: 'Grasa',
            items: [
              { name: 'Pasta de maní', desc: '30g = 1 porc.', icon: '🥜', p: 8, hc: 6, g: 15, kcal: 190 },
              { name: 'Aceite de oliva', desc: '15g = 1 porc.', icon: '🫒', p: 0, hc: 0, g: 15, kcal: 135 },
              { name: 'Palta (aguacate)', desc: '75g = 1 porc.', icon: '🥑', p: 1.5, hc: 3, g: 11, kcal: 120 },
              { name: 'Frutos secos', desc: '30g = 1 porc.', icon: '🌰', p: 5, hc: 4, g: 16, kcal: 180 }
            ]
          }
        ]
      }
    };

    let activeAddTab = 'P';
    let openedAccordionId = 'magras';
    let foodPortionCounters = {};

    let replacingMealId = null;
    let replacingItemId = null;
    let selectedReplacementName = null;

    let openSwipedCard = null;

    document.addEventListener('DOMContentLoaded', async () => {
      // 0. AUTH GUARD: Verificar que es un alumno autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '../index.html';
        return;
      }
      
      // Fetch latest active meal plan
      try {
        const { data: plans, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('alumno_id', session.user.id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && plans && plans.length > 0) {
          targetKcal = plans[0].target_calories;
          targetP = plans[0].target_protein_g;
          targetHC = plans[0].target_carbs_g;
          targetG = plans[0].target_fat_g;
          targetPorc = Math.round(targetKcal / 150); // rough estimation for portions mode
        }
      } catch (e) {
        console.error("Error fetching meal plan:", e);
      }

      renderMeals();
      updateBalance();
      setupScrollCollapsing();
      setupSwipeToReveal();
    });

    function closeCurrentSwipedCard() {
      if (openSwipedCard) {
        openSwipedCard.style.transition = 'transform 0.2s ease-out';
        openSwipedCard.style.transform = 'translateX(0px)';
        openSwipedCard.dataset.swiped = 'false';
        openSwipedCard = null;
      }
    }

    function handleCardButtonClick(event, callback) {
      const card = event.target.closest('.swipe-card');
      if (card && card.dataset.swiped === 'true') {
        event.stopPropagation();
        closeCurrentSwipedCard();
        return;
      }
      callback();
    }

    function deleteFoodItem(mealKey, itemId) {
      if (!mealsData[mealKey]) return;
      const index = mealsData[mealKey].items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        mealsData[mealKey].items.splice(index, 1);
        openSwipedCard = null;
        renderMeals();
        updateBalance();
      }
    }

    function setupSwipeToReveal() {
      const container = document.getElementById('meals-list-container');
      if (!container) return;

      let activeCard = null;
      let startX = 0;
      let startY = 0;
      let lastDiffX = 0;
      let isSwiping = false;
      let isHorizontal = null;
      let wasAlreadySwiped = false;
      let isMouseDown = false;

      // ---- TACTIL (TOUCH) ----
      container.addEventListener('touchstart', (e) => {
        if (e.target.closest('button')) return;

        const card = e.target.closest('.swipe-card');
        if (!card) {
          closeCurrentSwipedCard();
          return;
        }

        if (openSwipedCard && openSwipedCard !== card) {
          closeCurrentSwipedCard();
        }

        activeCard = card;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastDiffX = 0;
        isSwiping = false;
        isHorizontal = null;
        wasAlreadySwiped = card.dataset.swiped === 'true';
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        if (!activeCard) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        if (isHorizontal === null) {
          if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
            isHorizontal = Math.abs(diffX) > Math.abs(diffY);
            if (!isHorizontal) {
              activeCard = null;
              return;
            }
          } else {
            return;
          }
        }

        if (isHorizontal) {
          if (e.cancelable) e.preventDefault();
          isSwiping = true;
          lastDiffX = diffX;
          // Invertido: Ahora targetX es positivo (movimiento hacia la derecha)
          let targetX = (wasAlreadySwiped ? 75 : 0) + diffX;
          if (targetX < 0) targetX = 0; // No permite deslizar a la izquierda
          if (targetX > 90) targetX = 90; // Tope máximo a la derecha
          activeCard.style.transition = 'none';
          activeCard.style.transform = `translateX(${targetX}px)`;
        }
      }, { passive: false });

      const finishSwipe = () => {
        if (!activeCard) return;

        activeCard.style.transition = 'transform 0.2s ease-out';

        if (isSwiping) {
          if (wasAlreadySwiped) {
            // Si ya estaba abierto, y deslizamos un poco a la izquierda (negativo), cerramos
            if (lastDiffX < -20) {
              activeCard.style.transform = 'translateX(0px)';
              activeCard.dataset.swiped = 'false';
              if (openSwipedCard === activeCard) openSwipedCard = null;
            } else {
              activeCard.style.transform = 'translateX(75px)';
              activeCard.dataset.swiped = 'true';
              openSwipedCard = activeCard;
            }
          } else {
            // Si estaba cerrado, umbral de 60px hacia la DERECHA para revelar
            if (lastDiffX >= 60) {
              activeCard.style.transform = 'translateX(75px)';
              activeCard.dataset.swiped = 'true';
              openSwipedCard = activeCard;
            } else {
              activeCard.style.transform = 'translateX(0px)';
              activeCard.dataset.swiped = 'false';
              if (openSwipedCard === activeCard) openSwipedCard = null;
            }
          }
        } else if (wasAlreadySwiped && !isSwiping) {
          activeCard.style.transform = 'translateX(0px)';
          activeCard.dataset.swiped = 'false';
          if (openSwipedCard === activeCard) openSwipedCard = null;
        }

        activeCard = null;
        isSwiping = false;
        isHorizontal = null;
      };

      container.addEventListener('touchend', finishSwipe);
      container.addEventListener('touchcancel', finishSwipe);

      // ---- MOUSE (DESKTOP) ----
      container.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;

        const card = e.target.closest('.swipe-card');
        if (!card) {
          closeCurrentSwipedCard();
          return;
        }

        if (openSwipedCard && openSwipedCard !== card) {
          closeCurrentSwipedCard();
        }

        isMouseDown = true;
        activeCard = card;
        startX = e.clientX;
        startY = e.clientY;
        lastDiffX = 0;
        isSwiping = false;
        isHorizontal = null;
        wasAlreadySwiped = card.dataset.swiped === 'true';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isMouseDown || !activeCard) return;

        const diffX = e.clientX - startX;
        const diffY = e.clientY - startY;

        if (isHorizontal === null) {
          if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
            isHorizontal = Math.abs(diffX) > Math.abs(diffY);
            if (!isHorizontal) {
              activeCard = null;
              isMouseDown = false;
              return;
            }
          } else {
            return;
          }
        }

        if (isHorizontal) {
          isSwiping = true;
          lastDiffX = diffX;
          let targetX = (wasAlreadySwiped ? 75 : 0) + diffX;
          if (targetX < 0) targetX = 0;
          if (targetX > 90) targetX = 90;
          activeCard.style.transition = 'none';
          activeCard.style.transform = `translateX(${targetX}px)`;
        }
      });

      window.addEventListener('mouseup', () => {
        if (!isMouseDown) return;
        isMouseDown = false;
        finishSwipe();
      });

      // Cerrar al clickear fuera
      document.addEventListener('click', (e) => {
        if (openSwipedCard && !e.target.closest('.swipe-container')) {
          closeCurrentSwipedCard();
        }
      });
    }

    function setupScrollCollapsing() {
      const scrollContainer = document.getElementById('meals-list-container');
      const balanceCard = document.getElementById('balance-card');
      const mainNum = document.getElementById('balance-main-num');
      const subLabel = document.getElementById('balance-sub-label');
      const barsContainer = document.getElementById('balance-bars-container');

      scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollTop > 30) {
          balanceCard.classList.remove('p-3.5', 'rounded-[18px]');
          balanceCard.classList.add('p-2.5', 'rounded-xl', 'shadow-sm');

          subLabel.classList.add('hidden');
          mainNum.classList.remove('text-2xl');
          mainNum.classList.add('text-lg');

          barsContainer.classList.remove('space-y-2', 'mt-2.5');
          barsContainer.classList.add('grid', 'grid-cols-2', 'gap-x-3', 'gap-y-1', 'mt-1.5');

          document.querySelectorAll('#balance-bars-container .h-2').forEach(b => {
            b.classList.remove('h-2');
            b.classList.add('h-1.5');
          });
        } else {
          balanceCard.classList.add('p-3.5', 'rounded-[18px]');
          balanceCard.classList.remove('p-2.5', 'rounded-xl', 'shadow-sm');

          subLabel.classList.remove('hidden');
          mainNum.classList.add('text-2xl');
          mainNum.classList.remove('text-lg');

          barsContainer.classList.add('space-y-2', 'mt-2.5');
          barsContainer.classList.remove('grid', 'grid-cols-2', 'gap-x-3', 'gap-y-1', 'mt-1.5');

          document.querySelectorAll('#balance-bars-container [class*="h-1.5"]').forEach(b => {
            b.classList.add('h-2');
            b.classList.remove('h-1.5');
          });
        }
      });
    }

    function setAppMode(mode) {
      currentMode = mode;
      const btnKcal = document.getElementById('btn-mode-kcal');
      const btnPorc = document.getElementById('btn-mode-porciones');

      if (mode === 'kcal') {
        btnKcal.className = 'px-3 py-1 rounded-full bg-[#22C55E] text-[#0E141A] font-bold text-xs shadow transition-all';
        btnPorc.className = 'px-3 py-1 rounded-full font-semibold text-xs transition-all text-white/70';
      } else {
        btnPorc.className = 'px-3 py-1 rounded-full bg-[#22C55E] text-[#0E141A] font-bold text-xs shadow transition-all';
        btnKcal.className = 'px-3 py-1 rounded-full font-semibold text-xs transition-all text-white/70';
      }

      renderMeals();
      updateBalance();
    }

    function renderMeals() {
      const container = document.getElementById('meals-list-container');
      container.innerHTML = '';
      openSwipedCard = null;

      Object.entries(mealsData).forEach(([mealKey, meal]) => {
        const totalKcal = meal.items.reduce((sum, item) => sum + (item.checked ? item.kcal : 0), 0);
        const totalPorc = meal.items.reduce((sum, item) => sum + (item.checked ? item.portions : 0), 0);

        const badgeInfo = currentMode === 'kcal'
          ? `${totalKcal} kcal • P:${meal.items.reduce((s, i) => s + (i.checked ? i.p : 0), 0)}g`
          : `${totalPorc} porc. • ${totalKcal} kcal`;

        let mealHtml = `
          <section class="w-full bg-[#F8FAFC] rounded-[18px] p-3.5 shadow-sm border border-white/60">
            <div class="flex items-center justify-between pb-2.5">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style="background-color: ${meal.bgIcon}; color: ${meal.colorIcon};">
                  ${meal.icon}
                </span>
                <div>
                  <h3 class="font-bold text-[#1E293B] text-sm">${meal.title}</h3>
                  <span class="text-[11px] text-[#64748B]">${meal.time}</span>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-[#E2E8F0] text-[#1E293B] font-bold text-[11px]">
                ${badgeInfo}
              </span>
            </div>

            <div class="space-y-2">
        `;

        meal.items.forEach(item => {
          const detailText = currentMode === 'kcal'
            ? `${item.grams}g • ${item.kcal} kcal • P: ${item.p}g • HC: ${item.hc}g`
            : `${item.grams}g • ${item.portions} porc. ${item.group}`;

          const checkedClass = item.checked ? 'bg-[#22C55E] text-white shadow-xs' : 'bg-[#E2E8F0] text-transparent';
          const textClass = item.checked
            ? 'text-[#94A3B8] line-through font-normal'
            : 'text-[#0F172A] font-extrabold';

          mealHtml += `
            <div class="swipe-container relative overflow-hidden rounded-xl select-none bg-transparent">
              <button onclick="deleteFoodItem('${mealKey}', '${item.id}')"
                class="absolute inset-y-0 left-0 w-[75px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-colors z-0 cursor-pointer"
                title="Eliminar">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Eliminar</span>
              </button>

              <div class="swipe-card relative z-10 bg-white p-2.5 rounded-xl border border-[#E2E8F0] flex items-center justify-between shadow-xs select-none cursor-grab active:cursor-grabbing"
                data-meal="${mealKey}" data-id="${item.id}">
                <div class="flex items-center gap-2 pointer-events-none">
                  <span class="px-1.5 py-0.5 rounded font-bold text-[10px] border ${item.badgeBg} ${item.badgeText} ${item.badgeBorder}">
                    ${item.groupBadge}
                  </span>
                  <div>
                    <p class="font-bold text-xs ${textClass}">${item.name}</p>
                    <p class="text-[10px] text-[#64748B] mt-0.5">${detailText}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <button onclick="handleCardButtonClick(event, () => openReemplazoModal('${mealKey}', '${item.id}'))" class="w-7 h-7 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-xs font-bold transition-colors border border-[#E2E8F0]" title="Reemplazar alimento">
                    ⇄
                  </button>
                  <button onclick="handleCardButtonClick(event, () => toggleItemCheck('${mealKey}', '${item.id}'))" class="w-6 h-6 rounded-full flex items-center justify-center transition-all ${checkedClass}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        });

        mealHtml += `
            </div>
            <button onclick="openAddFoodModal('${mealKey}')" class="w-full mt-2.5 py-2 rounded-xl bg-[#E2E8F0]/70 hover:bg-[#E2E8F0] text-[#1E293B] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path>
              </svg>
              Añadir alimento / porción
            </button>
          </section>
        `;

        container.innerHTML += mealHtml;
      });
    }

    function toggleItemCheck(mealKey, itemId) {
      const item = mealsData[mealKey].items.find(i => i.id === itemId);
      if (item) {
        item.checked = !item.checked;
        renderMeals();
        updateBalance();
      }
    }

    function updateBalance() {
      let totalKcal = 0;
      let totalP = 0;
      let totalHC = 0;
      let totalG = 0;
      let totalPorc = 0;
      let totalItems = 0;
      let checkedItems = 0;

      Object.values(mealsData).forEach(meal => {
        meal.items.forEach(i => {
          totalItems++;
          if (i.checked) {
            checkedItems++;
            totalKcal += i.kcal;
            totalP += i.p;
            totalHC += i.hc;
            totalG += i.g;
            totalPorc += i.portions;
          }
        });
      });

      const adherence = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 100;
      document.getElementById('adherence-percent-text').innerText = `${adherence}%`;

      if (currentMode === 'kcal') {
        const remainingKcal = Math.max(0, targetKcal - totalKcal);
        document.getElementById('balance-main-num').innerText = remainingKcal;
        document.getElementById('balance-main-label').innerText = 'kcal restantes';
        document.getElementById('balance-sub-label').innerText = `(${totalKcal} kcal consumidas hoy)`;

        document.getElementById('bar-text-kcal').innerText = `${totalKcal} / ${targetKcal} KCAL`;
        document.getElementById('bar-text-p').innerText = `${totalP} / ${targetP} g`;
        document.getElementById('bar-text-hc').innerText = `${totalHC} / ${targetHC} g`;
        document.getElementById('bar-text-g').innerText = `${totalG} / ${targetG} g`;
      } else {
        const remainingPorc = Math.max(0, Math.round((targetPorc - totalPorc) * 10) / 10);
        document.getElementById('balance-main-num').innerText = remainingPorc;
        document.getElementById('balance-main-label').innerText = 'porciones restantes';
        document.getElementById('balance-sub-label').innerText = `(${Math.max(0, targetKcal - totalKcal)} kcal restantes)`;

        document.getElementById('bar-text-kcal').innerText = `${totalKcal} / ${targetKcal}`;
        document.getElementById('bar-text-p').innerText = `${Math.round(totalP / 25)} / ${Math.round(targetP / 25)} porc.`;
        document.getElementById('bar-text-hc').innerText = `${Math.round(totalHC / 40)} / ${Math.round(targetHC / 40)} porc.`;
        document.getElementById('bar-text-g').innerText = `${Math.round(totalG / 15)} / ${Math.round(targetG / 15)} porc.`;
      }

      document.getElementById('bar-fill-kcal').style.width = `${Math.min(100, (totalKcal / targetKcal) * 100)}%`;
      document.getElementById('bar-fill-p').style.width = `${Math.min(100, (totalP / targetP) * 100)}%`;
      document.getElementById('bar-fill-hc').style.width = `${Math.min(100, (totalHC / targetHC) * 100)}%`;
      document.getElementById('bar-fill-g').style.width = `${Math.min(100, (totalG / targetG) * 100)}%`;
    }

    function openReemplazoModal(mealKey, itemId) {
      replacingMealId = mealKey;
      replacingItemId = itemId;
      const item = mealsData[mealKey].items.find(i => i.id === itemId);
      if (!item) return;

      selectedReplacementName = item.name;

      const badgeEl = document.getElementById('reemplazo-modal-badge');
      badgeEl.innerText = item.groupBadge || `[${item.group}]`;
      badgeEl.className = `px-1.5 py-0.5 rounded font-bold text-[10px] border ${item.badgeBg} ${item.badgeText} ${item.badgeBorder}`;

      document.getElementById('reemplazo-modal-title').innerText = `Reemplazar ${item.group}`;
      document.getElementById('reemplazo-modal-subtitle').innerText = `Porción fija: ${item.portions} porc. (~${item.kcal} kcal)`;

      const options = replacementOptions[item.group] || replacementOptions['HC'];
      const listContainer = document.getElementById('reemplazo-options-list');
      listContainer.innerHTML = '';

      options.forEach(opt => {
        const isSelected = opt.name === item.name;
        const borderClass = isSelected ? 'border-2 border-[#22C55E] bg-[#F0FDF4]' : 'border border-[#E2E8F0] bg-[#F8FAFC]';
        const radioIcon = isSelected
          ? `<div class="w-4 h-4 rounded-full border-2 border-[#22C55E] bg-[#22C55E] flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-white"></div></div>`
          : `<div class="w-4 h-4 rounded-full border-2 border-[#CBD5E1] bg-white"></div>`;

        listContainer.innerHTML += `
          <label onclick="selectReplacementOption('${opt.name}')" class="flex items-center justify-between p-3 rounded-xl ${borderClass} cursor-pointer transition-colors shadow-xs">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-[#0E141A]">${opt.name}</span>
                ${isSelected ? '<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#15803D]">Actual</span>' : ''}
              </div>
              <span class="text-[11px] text-[#64748B] font-medium mt-0.5">${opt.desc}</span>
            </div>
            ${radioIcon}
          </label>
        `;
      });

      document.getElementById('modal-reemplazo').classList.remove('hidden');
    }

    function selectReplacementOption(name) {
      selectedReplacementName = name;
      const item = mealsData[replacingMealId].items.find(i => i.id === replacingItemId);
      const options = replacementOptions[item.group] || replacementOptions['HC'];
      const listContainer = document.getElementById('reemplazo-options-list');
      listContainer.innerHTML = '';

      options.forEach(opt => {
        const isSelected = opt.name === name;
        const borderClass = isSelected ? 'border-2 border-[#22C55E] bg-[#F0FDF4]' : 'border border-[#E2E8F0] bg-[#F8FAFC]';
        const radioIcon = isSelected
          ? `<div class="w-4 h-4 rounded-full border-2 border-[#22C55E] bg-[#22C55E] flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-white"></div></div>`
          : `<div class="w-4 h-4 rounded-full border-2 border-[#CBD5E1] bg-white"></div>`;

        listContainer.innerHTML += `
          <label onclick="selectReplacementOption('${opt.name}')" class="flex items-center justify-between p-3 rounded-xl ${borderClass} cursor-pointer transition-colors shadow-xs">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-[#0E141A]">${opt.name}</span>
                ${isSelected ? '<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#15803D]">Seleccionado</span>' : ''}
              </div>
              <span class="text-[11px] text-[#64748B] font-medium mt-0.5">${opt.desc}</span>
            </div>
            ${radioIcon}
          </label>
        `;
      });
    }

    function confirmReemplazo() {
      if (replacingMealId && replacingItemId && selectedReplacementName) {
        const item = mealsData[replacingMealId].items.find(i => i.id === replacingItemId);
        if (item) {
          item.name = selectedReplacementName;
          renderMeals();
          updateBalance();
        }
      }
      closeReemplazoModal();
    }

    function closeReemplazoModal() {
      document.getElementById('modal-reemplazo').classList.add('hidden');
    }

    function openAddFoodModal(mealKey) {
      activeMealId = mealKey;
      const meal = mealsData[mealKey];
      document.getElementById('add-food-title').innerText = `Añadir a ${meal.title}`;
      document.getElementById('footer-active-meal-name').innerText = `Comida activa: ${meal.title}`;
      document.getElementById('modal-add-food').classList.remove('hidden');
      renderAddFoodAccordions();
    }

    function closeAddFoodModal() {
      document.getElementById('modal-add-food').classList.add('hidden');
    }

    function switchAddTab(tabKey) {
      activeAddTab = tabKey;

      ['p', 'hc', 'g'].forEach(k => {
        const btn = document.getElementById(`tab-macro-${k}`);
        const line = document.getElementById(`tab-macro-${k}-line`);
        if (k === tabKey.toLowerCase()) {
          btn.className = 'flex-1 bg-white rounded-xl py-2 px-1.5 flex flex-col items-center justify-center shadow-xs transition-all';
          line.className = `w-6 h-[2px] ${k === 'p' ? 'bg-[#22C55E]' : k === 'hc' ? 'bg-[#F97316]' : 'bg-[#3B82F6]'} rounded-full mt-1`;
        } else {
          btn.className = 'flex-1 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center transition-all';
          line.className = 'w-6 h-[2px] bg-transparent mt-1';
        }
      });

      const cat = addFoodCatalog[activeAddTab];
      if (cat && cat.subgroups.length > 0) {
        openedAccordionId = cat.subgroups[0].id;
      }

      renderAddFoodAccordions();
    }

    function toggleAccordion(subgroupId) {
      openedAccordionId = openedAccordionId === subgroupId ? null : subgroupId;
      renderAddFoodAccordions();
    }

    function changePortionCounter(foodName, delta) {
      if (!foodPortionCounters[foodName]) foodPortionCounters[foodName] = 1;
      foodPortionCounters[foodName] = Math.max(0.5, Math.round((foodPortionCounters[foodName] + delta) * 10) / 10);
      renderAddFoodAccordions();
    }

    function renderAddFoodAccordions(filterText = '') {
      const container = document.getElementById('add-food-accordion-container');
      container.innerHTML = '';

      const cat = addFoodCatalog[activeAddTab];
      if (!cat) return;

      container.innerHTML += `
        <div class="flex items-center justify-between py-1">
          <span class="text-[11px] font-extrabold tracking-wider uppercase text-gray-500">${cat.label}</span>
          <span class="bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#86EFAC]/60">
            ${cat.badge}
          </span>
        </div>
      `;

      cat.subgroups.forEach(sub => {
        const isOpened = openedAccordionId === sub.id;

        const visibleItems = filterText
          ? sub.items.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase()))
          : sub.items;

        if (filterText && visibleItems.length === 0) return;

        if (isOpened || filterText) {
          let subHtml = `
            <div class="rounded-2xl border-2 border-[#22C55E]/60 bg-white overflow-hidden shadow-xs flex-shrink-0">
              <div onclick="toggleAccordion('${sub.id}')" class="p-3.5 flex items-center justify-between bg-[#DCFCE7]/30 border-b border-[#86EFAC]/40 cursor-pointer">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl ${sub.bgIcon} flex items-center justify-center text-lg shrink-0 shadow-inner">
                    ${sub.icon}
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-gray-900 leading-tight">${sub.title}</h3>
                    <p class="text-xs font-semibold text-gray-600 mt-0.5">${sub.desc}</p>
                  </div>
                </div>
                <span class="w-7 h-7 rounded-full bg-white border border-[#22C55E]/40 flex items-center justify-center text-[#15803D] shadow-xs">
                  <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 15l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </span>
              </div>
              <div class="p-2.5 flex flex-col gap-2 bg-[#F8FAFC]">
          `;

          visibleItems.forEach(item => {
            const count = foodPortionCounters[item.name] || 1;
            subHtml += `
              <div class="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg ${sub.bgIcon} flex items-center justify-center text-base shrink-0">${item.icon}</div>
                  <div>
                    <p class="text-xs font-bold text-gray-800 leading-tight">${item.name}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5">${item.desc}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <div class="flex items-center bg-[#F1F5F9] border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700">
                    <button onclick="changePortionCounter('${item.name}', -0.5)" class="text-gray-400 hover:text-gray-700 mr-1.5 px-0.5">-</button>
                    <span>${count} porc.</span>
                    <button onclick="changePortionCounter('${item.name}', 0.5)" class="text-gray-400 hover:text-gray-700 ml-1.5 px-0.5">+</button>
                  </div>
                  <button onclick="addNewFoodToMeal('${sub.groupKey}', '${item.name}', ${count}, ${item.p}, ${item.hc}, ${item.g}, ${item.kcal})" class="bg-[#22C55E] hover:brightness-95 active:scale-95 text-[#0E141A] text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg shadow-xs transition-all">
                    + Añadir
                  </button>
                </div>
              </div>
            `;
          });

          subHtml += `</div></div>`;
          container.innerHTML += subHtml;
        } else {
          container.innerHTML += `
            <article onclick="toggleAccordion('${sub.id}')" class="w-full bg-[#F8FAFC] rounded-2xl p-3.5 border border-gray-200/80 shadow-xs flex items-center justify-between hover:border-gray-300 active:bg-gray-100/70 transition-all cursor-pointer shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl ${sub.bgIcon} flex items-center justify-center text-lg shrink-0 shadow-inner">
                  ${sub.icon}
                </div>
                <div class="flex flex-col">
                  <h3 class="text-sm font-bold text-gray-900 leading-tight">${sub.title}</h3>
                  <span class="text-xs font-semibold text-gray-700 mt-0.5">${sub.desc}</span>
                </div>
              </div>
              <div class="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 ml-2 shadow-xs">
                <svg class="w-3.5 h-3.5 text-gray-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </div>
            </article>
          `;
        }
      });
    }

    function filterAddFoodSearch(val) {
      renderAddFoodAccordions(val);
    }

    function addNewFoodToMeal(groupKey, name, portions, p, hc, g, kcal) {
      const meal = mealsData[activeMealId];
      if (!meal) return;

      const newItem = {
        id: `item_${Date.now()}`,
        name: name,
        group: groupKey,
        groupBadge: `[${groupKey}]`,
        badgeBg: groupKey.includes('P') ? 'bg-[#DCFCE7]' : groupKey === 'HC' ? 'bg-[#FEF3C7]' : groupKey === 'Dulce' ? 'bg-[#FEE2E2]' : 'bg-[#E0E7FF]',
        badgeText: groupKey.includes('P') ? 'text-[#15803D]' : groupKey === 'HC' ? 'text-[#D97706]' : groupKey === 'Dulce' ? 'text-[#DC2626]' : 'text-[#4F46E5]',
        badgeBorder: groupKey.includes('P') ? 'border-[#BBF7D0]' : groupKey === 'HC' ? 'border-[#FDE68A]' : groupKey === 'Dulce' ? 'border-[#FECACA]' : 'border-[#C7D2FE]',
        grams: Math.round(portions * 80),
        portions: portions,
        p: Math.round(p * portions),
        hc: Math.round(hc * portions),
        g: Math.round(g * portions),
        kcal: Math.round(kcal * portions),
        checked: true
      };

      meal.items.push(newItem);
      renderMeals();
      updateBalance();
      closeAddFoodModal();
    }

    // Exponer funciones globales (necesario al usar type="module")
    window.setAppMode = setAppMode;
    window.openAddFoodModal = openAddFoodModal;
    window.closeAddFoodModal = closeAddFoodModal;
    window.setAddFoodTab = setAddFoodTab;
    window.toggleAccordion = toggleAccordion;
    window.changePortionCounter = changePortionCounter;
    window.filterAddFoodSearch = filterAddFoodSearch;
    window.addNewFoodToMeal = addNewFoodToMeal;
    window.openReemplazoModal = openReemplazoModal;
    window.closeReemplazoModal = closeReemplazoModal;
    window.confirmReplacement = confirmReplacement;
    window.selectReplacementOption = selectReplacementOption;
    window.deleteFoodItem = deleteFoodItem;
    window.toggleItemCheck = toggleItemCheck;
    window.handleCardButtonClick = handleCardButtonClick;

    // Navegación entre pestañas
    function cambiarVista(vista) {
      const headerHoy = document.getElementById('header-hoy');
      const mealsList = document.getElementById('meals-list-container');
      const vistaMiPlan = document.getElementById('vista-mi-plan');
      const vistaProgreso = document.getElementById('vista-progreso');
      const vistaCoach = document.getElementById('vista-coach');

      const navHoy = document.getElementById('nav-hoy');
      const navMiPlan = document.getElementById('nav-mi-plan');
      const navProgreso = document.getElementById('nav-progreso');
      const navCoach = document.getElementById('nav-coach');

      const resetNav = (nav) => {
        nav.className = 'flex flex-col items-center justify-center flex-1 text-[#94A3B8] hover:text-white transition-colors gap-0.5';
        nav.querySelector('span:last-child').className = 'text-[10px] font-medium';
      };
      const activeNav = (nav) => {
        nav.className = 'flex flex-col items-center justify-center flex-1 text-[#22C55E] gap-0.5';
        nav.querySelector('span:last-child').className = 'text-[10px] font-bold';
      };

      resetNav(navHoy);
      resetNav(navMiPlan);
      resetNav(navProgreso);
      resetNav(navCoach);

      headerHoy.classList.add('hidden');
      mealsList.classList.add('hidden');
      vistaMiPlan.classList.add('hidden');
      vistaProgreso.classList.add('hidden');
      vistaCoach.classList.add('hidden');

      if (vista === 'hoy') {
        headerHoy.classList.remove('hidden');
        mealsList.classList.remove('hidden');
        activeNav(navHoy);
      } else if (vista === 'mi-plan') {
        vistaMiPlan.classList.remove('hidden');
        activeNav(navMiPlan);
      } else if (vista === 'progreso') {
        vistaProgreso.classList.remove('hidden');
        activeNav(navProgreso);
      } else if (vista === 'coach') {
        vistaCoach.classList.remove('hidden');
        activeNav(navCoach);
      }
    }

    // Registrar listeners de navegación al cargar el módulo
    document.getElementById('nav-hoy').addEventListener('click', () => cambiarVista('hoy'));
    document.getElementById('nav-mi-plan').addEventListener('click', () => cambiarVista('mi-plan'));
    document.getElementById('nav-progreso').addEventListener('click', () => cambiarVista('progreso'));
    document.getElementById('nav-coach').addEventListener('click', () => cambiarVista('coach'));
