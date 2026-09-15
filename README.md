# AppCalorias 🥑
### Calculadora Nutricional, Macros y Equivalencias • Sistema Nico Duartes

Aplicación web interactiva, moderna, minimalista y eficaz para el cálculo del gasto energético diario (BMR, NEAT, METs, TDEE), distribución de macronutrientes, esquema de porciones y equivalencias de alimentos, convertida a partir de la planilla `Calculadora Nico Duartes.xlsx`.

---

## 🚀 Características Principales

1. **Contexto Energético & Gasto Diario (TDEE)**:
   - **Metabolismo Basal (BMR)**: Ecuación científica Mifflin-St Jeor para Hombres y Mujeres.
   - **Actividad Cotidiana (NEAT)**: Cálculo exacto por pasos diarios promedio (`pasos × 0.04`).
   - **Gasto por Entrenamiento (METs)**: Estimación por intensidad MET, horas de entrenamiento y frecuencia semanal (`(MET × Peso × Horas × Días) / 7`).
   - **Efecto Termogénico de los Alimentos (TEF)**: Suma de la termogénesis (`BMR × 10%`) para el TDEE total.
   - **Objetivos Calóricos**: Déficit moderado (-500 kcal), Déficit leve (-300 kcal), Mantenimiento (0 kcal), Superávit leve (+300 kcal), Superávit moderado (+500 kcal) y objetivo personalizado.

2. **Esquema de Porciones y Macronutrientes**:
   - Desglose de macronutrientes requerido: Proteínas (18%), Grasas (23%) y Carbohidratos (59%).
   - Las 8 categorías oficiales de porciones:
     - **HC** (Hidratos de carbono): 40g CH, 5g P, 1g G (~189 kcal)
     - **F** (Fruta): 20g CH, 1g P, 0g G (~84 kcal)
     - **D** (Dulce): 20g CH, 0g P, 0g G (~80 kcal)
     - **P** (Proteína magra): 0g CH, 25g P, 3g G (~127 kcal)
     - **PG** (Proteína grasa): 0g CH, 8.5g P, 10g G (~124 kcal)
     - **M** (Legumbre / mixta): 20g CH, 8g P, 0g G (~112 kcal)
     - **L** (Lácteos): 20g CH, 10g P, 0g G (~120 kcal)
     - **G** (Fruta oleosa / Grasas): 0g CH, 0g P, 15g G (~135 kcal)
   - **Verificación 1**: Comparación en tiempo real entre el esquema de porciones planificado y el requerimiento teórico con márgenes de tolerancia.

3. **Plan Alimenticio por Comidas**:
   - Distribución dinámica para Desayuno, Almuerzo, Merienda, Cena (con opción de agregar comidas y colaciones personalizadas).
   - Selección de alimentos con cómputo automático de porciones, gramos y macronutrientes.
   - **Verificación 2**: Comparación en tiempo real entre el consumo real en comidas y el requerimiento objetivo con alertas de coherencia.

4. **Calculadora Inteligente de Equivalencias**:
   - Permite sustituir cualquier alimento por otro dentro del mismo grupo (o grupos afines).
   - Calcula al instante los gramos exactos y medidas caseras equivalentes (tazas, fetas, cucharadas, unidades).
   - Buscador en tiempo real de alimentos y medidas caseras.

5. **Diseño & Experiencia de Usuario**:
   - Interfaz minimalista con **Dark Mode** y **Light Mode**.
   - Barra HUD de estado fija con balances de calorías y progreso de macros.
   - Persistencia automática en `localStorage`.
   - Soporte para impresión y exportación en PDF.
   - Cero dependencias externas complejas (HTML5 + CSS3 + Vanilla ES6 Modules).

---

## 🛠️ Ejecución Local

Puedes abrir directamente el archivo `index.html` en cualquier navegador moderno o servirlo con el servidor ligero de Python:

```bash
# Iniciar servidor local
python -m http.server 8000
```
Luego abre tu navegador en `http://localhost:8000`.

---

## 📂 Estructura del Código

```
AppCalorias/
├── index.html           # Interfaz semántica, layout responsive, HUD y modales
├── css/
│   └── styles.css       # Sistema de diseño, tokens CSS, dark/light mode y animaciones
├── js/
│   ├── data.js          # Base de datos de alimentos, categorías y valores iniciales
│   ├── calculator.js    # Fórmulas de cálculo de BMR, NEAT, METs, TDEE, macros y tolerancias
│   ├── equivalences.js  # Conversor y buscador de equivalencias nutricionales
│   ├── storage.js       # Persistencia en localStorage y respaldo
│   └── app.js           # Controlador reactivo y renderizado del DOM
└── README.md            # Documentación técnica
```

---

## 🌿 Rama Git
Desarrollado en la rama:
`feature-Juan-Gimenez`
