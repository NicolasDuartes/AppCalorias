## Estructura del frontend

```
frontend/
├── index.html                 # Iniciar sesión (punto de entrada)
├── registro.html              # Crear cuenta
├── css/
│   ├── base.css               # Tokens, reseteo, marco de pantalla, tipografía (se carga 1º)
│   ├── components.css         # Piezas que usan coach y alumno (se carga 2º)
│   └── pages/                 # Estilos propios de cada sección (se carga 3º)
│       ├── alumno.css
│       ├── coach.css
│       └── cuenta.css         # Login y registro
├── js/
│   ├── data/
│   │   └── supabase.js        # Cliente de Supabase
│   └── ui/                    # Un archivo por pantalla
│       ├── login-ui.js        # index.html
│       ├── cuenta-ui.js       # registro.html
│       ├── dashboard-ui.js    # alumno/dashboard.html (rueda de días)
│       ├── perfil-ui.js       # alumno/perfil.html (cuenta y coach)
│       ├── objetivo-ui.js     # alumno/perfil.html (registro de peso)
│       ├── clientes-ui.js     # coach/clientes.html
│       ├── cliente-ui.js      # coach/cliente.html
│       ├── perfil-coach-ui.js # coach/perfil.html
│       └── rol-ui.js          # shared/contexto.html (adapta la pantalla al rol)
└── pages/
    ├── alumno/
    │   ├── dashboard.html     # Día, calorías, comidas y agua
    │   ├── cantidad.html      # Cantidad de un alimento (se escribe)
    │   ├── reemplazar.html    # Reemplazar un alimento
    │   ├── agregar.html       # Agregar alimentos a una comida
    │   ├── crear-alimento.html
    │   ├── editar-alimento.html
    │   ├── perfil.html
    │   └── plan.html
    ├── coach/
    │   ├── clientes.html
    │   ├── cliente.html
    │   ├── perfil.html        # Cuenta y cerrar sesión
    │   ├── plan-nuevo.html
    │   ├── plan-editor.html
    │   ├── plan-editor-vacio.html
    │   ├── plan-activo.html
    │   ├── plan-archivado.html
    │   ├── historial.html
    │   ├── historial-vacio.html
    │   └── buscar-alimento.html
    └── shared/                # Pantallas usadas por más de un rol
        └── contexto.html
```
