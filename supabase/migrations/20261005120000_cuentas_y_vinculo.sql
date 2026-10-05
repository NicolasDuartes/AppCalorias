-- ==========================================================
-- Cuentas, tipo de cuenta y vínculo coach–alumno por ID de cliente
--
-- Qué hace:
--   1. profiles guarda el @usuario y, para alumnos, un ID de cliente
--      (NF-1234-AB) que se genera solo al registrarse.
--   2. El coach vincula a un alumno ingresando ese ID (vincular_alumno).
--      Reemplaza el flujo viejo de aprobación (status + approve_alumno).
--   3. El rol, el coach y el ID de cliente ya no se pueden cambiar desde
--      el navegador: solo full_name, username y avatar_url.
--   4. Cierra accesos abiertos: la vista coach_alumno_summary respeta RLS
--      y la tabla vieja alumnos queda bloqueada.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

-- ----------------------------------------------------------
-- 1. Columnas nuevas en profiles
-- ----------------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists client_code text;

-- @usuario: minúsculas, números, punto y guion bajo, de 3 a 30 caracteres
alter table public.profiles drop constraint if exists profiles_username_formato;
alter table public.profiles
  add constraint profiles_username_formato
    check (username ~ '^[a-z0-9._]{3,30}$');
create unique index if not exists profiles_username_key on public.profiles (username);
create unique index if not exists profiles_client_code_key on public.profiles (client_code);

-- ----------------------------------------------------------
-- 2. ID de cliente: NF-1234-AB, único
-- ----------------------------------------------------------
create or replace function public.generar_codigo_cliente()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_codigo text;
begin
  loop
    v_codigo := 'NF-'
      || lpad(floor(random() * 10000)::int::text, 4, '0') || '-'
      || chr(65 + floor(random() * 26)::int)
      || chr(65 + floor(random() * 26)::int);
    exit when not exists (select 1 from public.profiles where client_code = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- Alumnos que ya existían
update public.profiles
set client_code = public.generar_codigo_cliente()
where role = 'alumno' and client_code is null;

-- Solo los alumnos tienen ID de cliente; un coach no tiene coach.
-- NOT VALID: se exige para filas nuevas o editadas sin revisar las viejas.
alter table public.profiles
  drop constraint if exists profiles_client_code_solo_alumnos,
  drop constraint if exists profiles_coach_sin_coach;
alter table public.profiles
  add constraint profiles_client_code_solo_alumnos
    check ((role = 'alumno') = (client_code is not null)) not valid,
  add constraint profiles_coach_sin_coach
    check (role = 'alumno' or coach_id is null) not valid;

-- ----------------------------------------------------------
-- 3. Alta de usuarios: el trigger crea el perfil al registrarse
--    El frontend manda en options.data: { role, username, full_name }
-- ----------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'alumno' end;
begin
  insert into public.profiles (id, full_name, username, email, role, client_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), ''),
    new.email,
    v_rol,
    case when v_rol = 'alumno' then public.generar_codigo_cliente() end
  );
  return new;
end;
$$;

-- Para avisar en el formulario antes de registrarse si el @usuario está tomado
create or replace function public.usuario_disponible(p_usuario text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(p_usuario))
  );
$$;

-- ----------------------------------------------------------
-- 4. Vínculo coach–alumno
-- ----------------------------------------------------------
-- El coach ingresa el ID de cliente que le pasó el alumno
create or replace function public.vincular_alumno(p_codigo text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno public.profiles;
begin
  if not public.is_coach() then
    raise exception 'Solo un coach puede vincular alumnos' using errcode = '42501';
  end if;

  select * into v_alumno
  from public.profiles
  where client_code = upper(trim(p_codigo)) and role = 'alumno'
  for update;

  if not found then
    raise exception 'No existe un alumno con el ID %', upper(trim(p_codigo)) using errcode = 'P0002';
  end if;

  if v_alumno.coach_id is not null and v_alumno.coach_id <> auth.uid() then
    raise exception 'Ese alumno ya está vinculado a otro coach' using errcode = 'P0001';
  end if;

  update public.profiles
  set coach_id = auth.uid(), updated_at = now()
  where id = v_alumno.id
  returning * into v_alumno;

  return v_alumno;
end;
$$;

-- Corta el vínculo: lo puede hacer el coach del alumno o el propio alumno
create or replace function public.desvincular_alumno(p_alumno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set coach_id = null, updated_at = now()
  where id = p_alumno_id
    and role = 'alumno'
    and coach_id is not null
    and (coach_id = auth.uid() or id = auth.uid());

  if not found then
    raise exception 'No se pudo desvincular: el alumno no está vinculado a vos' using errcode = '42501';
  end if;
end;
$$;

-- Coach del usuario actual. Security definer para usarla en políticas de
-- profiles sin que la política se consulte a sí misma (recursión).
create or replace function public.mi_coach_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coach_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------
-- 5. Se retira el flujo de aprobación
-- ----------------------------------------------------------
drop policy if exists "Coaches can view pending alumnos" on public.profiles;
drop function if exists public.approve_alumno(uuid);

-- La columna status ya no se usa. Si alguna vista depende de ella, no se
-- borra: se marca a todos como aprobados para que no bloquee a nadie.
do $$
begin
  alter table public.profiles drop column if exists status;
exception when dependent_objects_still_exist then
  update public.profiles set status = 'aprobado';
  alter table public.profiles alter column status set default 'aprobado';
  raise notice 'profiles.status no se borró porque una vista la usa; quedó en aprobado';
end;
$$;

-- ----------------------------------------------------------
-- 6. Políticas de profiles
-- ----------------------------------------------------------
-- El perfil lo crea el trigger; el navegador no inserta perfiles
drop policy if exists "New users can insert their profile" on public.profiles;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- El alumno ve el perfil de su coach (nombre en "Tu coach")
drop policy if exists "Alumno can view their coach" on public.profiles;
create policy "Alumno can view their coach" on public.profiles
  for select to authenticated
  using (id = public.mi_coach_id());

-- Siguen vigentes: "Users can view own profile" y "Coach can view their alumnos"

-- Desde el navegador solo se pueden editar estas columnas.
-- role, coach_id, client_code y email quedan fuera: solo cambian por las funciones de arriba.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, username, avatar_url) on public.profiles to authenticated;

-- ----------------------------------------------------------
-- 7. Permisos de las funciones
-- ----------------------------------------------------------
revoke execute on function public.generar_codigo_cliente() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.vincular_alumno(text) from public, anon;
revoke execute on function public.desvincular_alumno(uuid) from public, anon;
revoke execute on function public.mi_coach_id() from public, anon;
grant execute on function public.vincular_alumno(text) to authenticated;
grant execute on function public.desvincular_alumno(uuid) to authenticated;
grant execute on function public.mi_coach_id() to authenticated;
grant execute on function public.usuario_disponible(text) to anon, authenticated;

-- ----------------------------------------------------------
-- 8. Accesos que estaban abiertos
-- ----------------------------------------------------------
-- La vista corría con los permisos de su dueño y salteaba RLS:
-- cualquiera con la clave pública veía nombres y correos de todos los alumnos.
alter view public.coach_alumno_summary set (security_invoker = true);

-- Tabla vieja sin uso y sin RLS: queda bloqueada (sin políticas = nadie accede
-- desde el navegador). Se puede borrar más adelante.
alter table public.alumnos enable row level security;

commit;
