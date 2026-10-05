## Estructura del frontend

```
frontend/
├── index.html                 # Crear cuenta (punto de entrada)
├── css/
│   ├── base.css               # Variables, reseteo, marco de pantalla, tipografía (se carga 1º)
│   ├── components.css         # Componentes reutilizables: botones, cards, inputs, listas (se carga 2º)
│   └── pages/                 # Estilos propios de cada sección (se carga 3º)
│       ├── alumno.css
│       ├── coach.css
│       └── cuenta.css
├── js/
│   ├── app.js
│   ├── data/
│   ├── ui/
│   └── utils/
└── pages/
    ├── alumno/
    │   └── dashboard.html
    ├── coach/
    │   ├── clientes.html
    │   ├── cliente.html
    │   ├── plan-nuevo.html
    │   ├── plan-editor.html
    │   ├── plan-editor-vacio.html
    │   ├── plan-activo.html
    │   ├── plan-archivado.html
    │   ├── historial.html
    │   ├── historial-vacio.html
    │   └── buscar-alimento.html
    └── shared/                # Pantallas usadas por más de un rol
        ├── contexto.html
        └── antropometria.html
```

