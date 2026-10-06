# Base de datos (Supabase)

Los cambios al esquema se guardan acá como archivos SQL, en orden, para que
cualquiera del equipo pueda ver qué se aplicó y repetirlo.

Cómo están organizados los datos (tablas, relaciones y permisos): [ESQUEMA.md](ESQUEMA.md).

```
supabase/
├── migrations/   # Cambios al esquema, en orden por fecha (AAAAMMDDHHMMSS_nombre.sql)
├── rollback/     # Reversión de cada migración (mismo nombre + .down.sql)
└── tests/        # Pruebas: simulan usuarios y verifican permisos (no dejan datos)
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
