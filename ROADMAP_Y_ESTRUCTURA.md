# Roadmap y estructura

Dónde está cada cosa en el repositorio, qué decisiones ya se tomaron y qué
sigue. Para el detalle de cada parte, ver los documentos de la tabla.

## 1. Cómo está organizado

| Carpeta / archivo | Qué tiene | Documento |
|---|---|---|
| `frontend/` | La app: HTML, CSS y JS sin frameworks ni build | [Leemewacho.md](Leemewacho.md) (árbol de archivos) |
| `frontend/css/` | Tokens, componentes y estilos por sección | [DESIGN.md](DESIGN.md) |
| `frontend/js/ui/` | Un archivo por pantalla que maneja su interacción | Comentario al principio de cada archivo |
| `frontend/js/data/supabase.js` | Cliente de Supabase que usan las pantallas | — |
| `supabase/` | Migraciones, tests y reversiones de la base | [supabase/README.md](supabase/README.md), [supabase/ESQUEMA.md](supabase/ESQUEMA.md) |
| `docs/database/` | Explicación de las tablas del plan y del registro diario | [EXPLICACION_TABLAS_SUPABASE.md](docs/database/EXPLICACION_TABLAS_SUPABASE.md) |

**Para levantar la app:** `cd frontend` y `npx serve`, y abrir
`http://localhost:3000/`. Tiene que servirse desde `frontend/`, porque las
rutas de las páginas son relativas a esa carpeta.

## 2. Decisiones tomadas

- **Entrada:** la app arranca en "Iniciar sesión". El registro pide solo
  rol, @usuario, correo y contraseña; sexo y fecha de nacimiento se van a
  completar dentro de la app (onboarding).
- **Para quién:** el alumno típico quiere que le digan qué hacer. Ve
  acciones y su meta, no fórmulas ni datos técnicos (ver DESIGN.md §1).
- **Sin antropometría:** se quitó de la app, para coach y alumno. Son datos
  complejos que no mejoran la experiencia.
- **Supabase intacto en esta etapa:** se trabaja el frontend; la base no se
  toca hasta retomar el backend.
- **Estilos:** solo tokens, sin `style=""`, escala única de espacios y zona
  táctil de 44 px (ver DESIGN.md §3).

## 3. Hecho

- Login como pantalla de inicio y registro corto.
- Dashboard del alumno: título que cambia con el día (Hoy, Ayer o la fecha),
  rueda de días con el elegido al centro, calendario y tarjeta de calorías
  compacta.
- Limpieza: fuera `backend/`, `md entendimiento/`, las maquetas viejas de
  `docs/design/`, el JS que ninguna pantalla cargaba (calculadora, tabla de
  porciones, equivalencias viejas) y su test roto, y el CSS sin usar.
- Perfil del coach: @usuario, email, cantidad de clientes y "Cerrar
  sesión"; el botón "Perfil" de la barra del coach ya lleva ahí.
- Comidas del alumno (solo diseño): 4 tarjetas que se abren de a una, con
  reemplazo por alimento, y las pantallas de cantidad, reemplazo, agregar,
  crear y editar alimento.
- Perfil del alumno: "Mi objetivo" arriba con registro de peso en una regla
  deslizable; sin antropometría.
- Sistema de diseño: tokens de color, sombras y espacios; sin `style=""` en
  el HTML; DESIGN.md reescrito; borrado el JS que no se usaba.
- Responsive: sin marco de teléfono; desde 768 px menú lateral y contenido
  en una columna centrada.

## 4. Pendiente

### Frontend

1. **Onboarding del alumno:** 5 pasos (sexo, fecha de nacimiento, peso y
   altura, actividad, objetivo) que arman el contexto energético.
2. **Comidas (falta conectar datos):** las plantillas ya están (tarjetas del
   dashboard, `cantidad.html`, `reemplazar.html`, `agregar.html`,
   `crear-alimento.html` y `editar-alimento.html`), con "—" donde van los
   datos. Falta la API de alimentos, el algoritmo de equivalencias y el JS
   que llena las pantallas y guarda los cambios.
3. **Perfil:** ID de cliente como chip, nombre en solo lectura y
   preferencias guardadas.
4. **Coach:** ficha de solo lectura del cliente, con "Editar" por bloque.
5. **Contexto energético:** el alumno ve solo su meta diaria; el desglose
   (BMR, NEAT, TDEE) queda para el coach.
6. **Paleta:** decidir si se adopta la de PROPUESTADESIGN.md (Inter y
   emerald) o se queda la actual.

### Base de datos (cuando se retome)

- Migración que quite la tabla `antropometrias` y lo relacionado.
- Preferencias del alumno en una tabla propia, visibles para el coach.
- Criterios del coach (rangos, ajustes) en una tabla que solo él lea.
- Restringir el alta de cuentas de coach (invitación o aprobación).
