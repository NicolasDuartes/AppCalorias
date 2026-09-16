# AppCalorias 🥑
### Calculadora Nutricional, Macros y Equivalencias • Sistema Nico Duartes

Aplicación web interactiva, moderna, minimalista y eficaz para el cálculo del gasto energético diario (BMR, NEAT, METs, TDEE), distribución de macronutrientes, esquema de porciones y equivalencias de alimentos, convertida a partir de la planilla `Calculadora Nico Duartes.xlsx`.

# AppCalorias - Diario Nutricional 🍏

Aplicación para el registro diario de comidas, cálculo de porciones y control de macronutrientes.

## 🚀 Cómo levantar el proyecto localmente

Para poder ejecutar la aplicación y que se conecte correctamente a la base de datos, seguí estos pasos:

### 1. Clonar el repositorio
Abrí una terminal y descargá el proyecto:
\`\`\`bash
git clone [ACA_PONE_EL_LINK_DE_TU_REPO_DE_GITHUB]
cd AppCalorias
\`\`\`

### 2. Instalar dependencias
Asegurate de tener Node.js instalado. Luego, ejecutá:
\`\`\`bash
npm install
\`\`\`

### 3. Configurar variables de entorno (¡MUY IMPORTANTE!) ⚠️
Por seguridad, el archivo con las claves de la base de datos NO se sube a GitHub. **Tenés que crearlo a mano**:

1. Creá un archivo en la raíz del proyecto (al mismo nivel que el `index.html`) y ponele exactamente este nombre: `.env`
2. Entrá a nuestro proyecto en [Supabase](https://supabase.com) (aceptá la invitación que te llegó al mail si no lo hiciste).
3. Andá a la ruedita de configuración (Project Settings) -> API.
4. Pegá esto adentro de tu archivo `.env`, reemplazando con los valores que ves en Supabase:

\`\`\`env
VITE_SUPABASE_URL=pega_aca_la_URL_del_proyecto
VITE_SUPABASE_ANON_KEY=pega_aca_la_clave_anon_public
\`\`\`
*Nota: Guardá el archivo. No te preocupes, Git está configurado para ignorarlo y no subirlo accidentalmente.*

### 4. Levantar el servidor
Una vez que tengas el `.env` guardado, ejecutá:
\`\`\`bash
npx vite
\`\`\`
Hacé clic en el enlace local (suele ser `http://localhost:5173/`) y ¡listo!
Para apagar el servidor, presioná `Ctrl + C` en la terminal.


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
