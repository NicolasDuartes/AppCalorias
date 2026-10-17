# Base de datos (Supabase)

Los cambios al esquema se guardan acá como archivos SQL, en orden, para que
cualquiera del equipo pueda ver qué se aplicó y repetirlo.

Cómo están organizados los datos (tablas, relaciones y permisos): [ESQUEMA.md](ESQUEMA.md).

```
supabase/
├── migrations/   # Cambios al esquema, en orden por fecha (AAAAMMDDHHMMSS_nombre.sql)
├── rollback/     # Reversión de cada migración (mismo nombre + .down.sql)
├── tests/        # Pruebas: simulan usuarios y verifican permisos (no dejan datos)
└── alimentos/    # Planilla de alimentos y el script que la convierte en la carga
```

## Aplicar una migración

1. Supabase → **SQL Editor** → New query.
2. Pegar el archivo completo de `migrations/` y **Run**.
3. Pegar el test correspondiente de `tests/` y **Run**: tiene que terminar con
   `OK: todas las pruebas pasaron`. El test corre en una transacción y hace
   `ROLLBACK`, así que no deja usuarios ni datos de prueba.

Cada migración corre en una transacción: si algo falla, no se aplica nada.

## Volver atrás

Si una migración se aplicó bien pero hay que deshacerla, se corre su archivo de
`rollback/` en el SQL Editor. También corre en una transacción.

Para `20261005120000_cuentas_y_vinculo`, **antes de aplicar la migración**, guardar
los valores de `status` (la migración borra esa columna):

```sql
create table public.profiles_status_backup as select id, status from public.profiles;
```

La reversión los recupera de esa tabla. Cuando ya no haga falta volver atrás:
`drop table public.profiles_status_backup;`

## Cuentas y vínculo coach–alumno (`20261005120000_cuentas_y_vinculo.sql`)

**Registro.** `supabase.auth.signUp` con estos datos en `options.data`:

```js
await supabase.auth.signUp({
  email, password,
  options: { data: {
    role: 'alumno' /* o 'coach' */, username: 'tu.usuario',
    sexo: 'F', fecha_nacimiento: '1998-07-21' // solo alumnos; si son inválidos quedan vacíos
  } }
})
```

Un trigger crea la fila en `profiles` con el rol, el `@usuario` (en minúsculas)
y el correo. Si es alumno, le genera un **ID de cliente** único (`NF-1234-AB`).
Antes de registrar se puede chequear el usuario con
`supabase.rpc('usuario_disponible', { p_usuario })`.

**Vínculo.** El alumno le pasa su ID de cliente al coach, y el coach lo ingresa:

| Acción | Llamada | Quién |
|---|---|---|
| Vincular | `supabase.rpc('vincular_alumno', { p_codigo })` | Coach |
| Desvincular | `supabase.rpc('desvincular_alumno', { p_alumno_id })` | El coach del alumno o el propio alumno |

**Quién ve qué en `profiles`.**
- Cada usuario ve y edita su propio perfil, pero solo `full_name`, `username` y `avatar_url`.
- El coach ve a sus alumnos vinculados.
- El alumno ve a su coach.
- `role`, `coach_id`, `client_code` y `email` no se pueden cambiar desde el navegador.

Reemplaza el flujo viejo de aprobación: se eliminaron `profiles.status` y `approve_alumno`.

## Contexto energético y antropometría (`20261006120000_contexto_y_antropometria.sql`)

Cada carga es una fila nueva (historial); la vigente es la más reciente.
Cada fila guarda los datos cargados **y** los resultados que calcula el
frontend en JavaScript (`version_calculo` indica con qué versión de las fórmulas).
Las etiquetas Bajo / Normal / Alto no se guardan: las calcula el frontend.

| Tabla | Qué guarda |
|---|---|
| `profiles.sexo`, `profiles.fecha_nacimiento` | Datos fijos. Se cambian con `rpc('actualizar_datos_personales', { p_alumno_id, p_sexo, p_fecha_nacimiento })`. |
| `contextos_energeticos` | Peso, altura, edad, pasos, entrenamiento, tipo de dieta → BMR, NEAT, TDEE, calorías objetivo. |
| `antropometrias` | Peso, talla, 9 perímetros, 8 pliegues, 3 diámetros → IMC, índices, % y kg de grasa, músculo, hueso y residual. |
| `permisos_alumno` | Secciones que el coach habilita al alumno: `contexto`, `antropometria`, `plan`. |

**Quién carga y edita.**
- Alumno sin coach: él mismo.
- Alumno con coach: su coach. El alumno, solo en las secciones habilitadas en `permisos_alumno`.
- `cargado_por` y las fechas los pone la base; no se pueden falsificar desde el navegador.

**Quién ve.** El alumno y su coach. Al desvincular, el coach deja de ver,
los permisos se borran y el alumno vuelve a poder cargar todo; los registros quedan.

```js
// Contexto vigente de un alumno
const { data } = await supabase.from('contextos_energeticos')
  .select('*').eq('alumno_id', alumnoId)
  .order('created_at', { ascending: false }).limit(1).maybeSingle();

// El coach habilita la antropometría al alumno
await supabase.from('permisos_alumno')
  .insert({ alumno_id: alumnoId, seccion: 'antropometria', habilitado_por: coachId });
```

## Alimentos (`20261017120000_alimentos.sql`)

Base propia de alimentos, con los valores **cada 100 g**.

| Tabla | Qué guarda |
|---|---|
| `categorias_alimento` | Las 12 categorías (Carnes, Lácteos, Frutas…). Lista cerrada. |
| `alimentos` | Nombre, categoría, cocción (`crudo`, `cocido`, `listo`), kcal y macros cada 100 g, porción, unidad, sinónimos, marca y fuente. |
| `correcciones_alimento` | Cambios propuestos a un alimento aprobado ("Editar alimento"), hasta que un coach los acepta. |

**De dónde salen los alimentos.**
- **El equipo**, desde la planilla (ver abajo): entran aprobados.
- **Alumnos y coaches**, desde la app: entran `pendiente`. Solo los ven su
  autor y el coach del autor hasta que el coach los aprueba; ahí los ven todos.

**Controles de calidad** (los aplica la base, no se pueden saltear desde el navegador):
- kcal entre 0 y 900, cada macro entre 0 y 100 g y los tres juntos hasta 100 g.
- Las kcal tienen que coincidir con los macros (4·P + 4·C + 9·G, con 20 % o
  15 kcal de margen). Se exige a lo que llega desde la app; la planilla lo
  avisa y admite excepciones marcadas (ej. bebidas con alcohol).
- Unidad completa: nombre y peso juntos.
- Sin duplicados: mismo nombre, marca y cocción, sin importar tildes ni mayúsculas.
- Desde la app, el estado, el autor y la fuente los pone la base.

```js
// Buscar (sin tildes, por nombre, marca o sinónimo, tolera errores de tipeo)
const { data } = await supabase.rpc('buscar_alimentos', { p_texto: 'pollo', p_categoria: null, p_limite: 20 });

// Crear un alimento desde la app (queda pendiente)
await supabase.from('alimentos').insert({
  nombre: 'Galletitas de avena', categoria: 'cereales', coccion: 'listo',
  kcal: 450, proteinas: 8, carbohidratos: 65, grasas: 17, fuente: 'alumno'
});

// Proponer una corrección a un alimento aprobado
await supabase.from('correcciones_alimento').insert({ alimento_id, ...valoresCorregidos, nota: 'Según la etiqueta' });

// El coach revisa (rechazar pide motivo)
await supabase.rpc('revisar_alimento', { p_alimento_id, p_aprobar: true });
await supabase.rpc('revisar_correccion', { p_correccion_id, p_aceptar: false, p_motivo: 'Los valores eran por porción' });
```

### Cargar alimentos desde la planilla

La planilla es `supabase/alimentos/planilla_alimentos.xlsx`: una hoja por
categoría, con listas desplegables y una columna `control` que se pone en
rojo si una fila tiene un error. La hoja "Instrucciones" explica cada columna.

1. Instalar lo necesario (una sola vez): `pip install openpyxl`
2. Completar la planilla. La columna `control` tiene que decir OK en todas las filas.
3. Desde `supabase/alimentos/`: `python planilla_a_sql.py`
   - Si hay errores, los lista con hoja y fila y no genera nada.
   - Si está todo bien, genera `carga_alimentos.sql`.
4. Supabase → SQL Editor → pegar `carga_alimentos.sql` → Run.

Se puede repetir cada vez que se actualice la planilla: los alimentos que ya
están se actualizan en vez de duplicarse. Para empezar una planilla vacía:
`python crear_planilla.py` (pisa la que haya).

### Primera carga desde USDA, revisada en una tabla de prueba

La primera carga sale de USDA FoodData Central y se revisa en una tabla
aparte (`prueba.alimentos`) antes de tocar la definitiva. La app no ve esa
tabla: Supabase no expone el esquema `prueba`.

1. **Lista curada:** `supabase/alimentos/usda/mapeo_usda.csv` (se abre con
   Excel). Una fila por alimento: nombre en español, categoría, cocción, la
   descripción exacta en USDA y sinónimos. Para alimentos que se cuentan,
   `unidad_nombre` y qué porción de USDA buscar (`large`, `medium`, `slice`…).
2. **Bajar USDA:** de https://fdc.nal.usda.gov/download-datasets, los JSON de
   "SR Legacy" y "Foundation Foods". Dejar los `.zip` en `supabase/alimentos/usda/datos/`.
3. **Armar la planilla:** desde `supabase/alimentos/usda/`:
   `python importar_usda.py` → genera `planilla_usda.xlsx` (valores cada
   100 g) con la hoja "Mapeo USDA": qué alimento de USDA se usó y cuáles no se
   encontraron (con los nombres parecidos, para corregir el mapeo).
4. **Revisar la planilla** (columna `control` en OK) y generar la carga:
   desde `supabase/alimentos/`: `python planilla_a_sql.py --prueba usda/planilla_usda.xlsx`
5. **En Supabase (SQL Editor):** `prueba_crear.sql` → `carga_alimentos_prueba.sql`
   → `prueba_verificar.sql` para revisar (calorías raras, posibles duplicados,
   pesos por unidad, búsqueda).
6. **Cuando está bien:** aplicar la migración `20261017120000_alimentos.sql`
   y correr `prueba_pasar_y_borrar.sql`: pasa todo a la definitiva, aprobado,
   y borra la prueba.
