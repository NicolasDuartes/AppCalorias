# Base de datos (Supabase)

Los cambios al esquema se guardan acá como archivos SQL, en orden, para que
cualquiera del equipo pueda ver qué se aplicó y repetirlo.

```
supabase/
├── migrations/   # Cambios al esquema, en orden por fecha (AAAAMMDDHHMMSS_nombre.sql)
└── tests/        # Pruebas: simulan usuarios y verifican permisos (no dejan datos)
```

## Aplicar una migración

1. Supabase → **SQL Editor** → New query.
2. Pegar el archivo completo de `migrations/` y **Run**.
3. Pegar el test correspondiente de `tests/` y **Run**: tiene que terminar con
   `OK: todas las pruebas pasaron`. El test corre en una transacción y hace
   `ROLLBACK`, así que no deja usuarios ni datos de prueba.

Cada migración corre en una transacción: si algo falla, no se aplica nada.

## Cuentas y vínculo coach–alumno (`20261005120000_cuentas_y_vinculo.sql`)

**Registro.** `supabase.auth.signUp` con estos datos en `options.data`:

```js
await supabase.auth.signUp({
  email, password,
  options: { data: { role: 'alumno' /* o 'coach' */, username: 'tu.usuario' } }
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
