-- ==========================================================
-- REVERSIÓN de 20261005120000_cuentas_y_vinculo.sql
--
-- Deja el esquema como estaba antes de la migración. Úsalo solo si hace falta
-- volver atrás.
--
-- Se pierde: los @usuario y los ID de cliente generados.
-- Se mantiene: los vínculos coach–alumno (coach_id) que se hayan hecho.
-- profiles.status: se recupera de la tabla profiles_status_backup si se creó
-- antes de aplicar la migración (ver README); si no existe, todos quedan en
-- 'pendiente', que era el valor por defecto.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

-- ----------------------------------------------------------
-- 1. Vuelve la columna status y sus valores
-- ----------------------------------------------------------
alter table public.profiles
  add column if not exists status text default 'pendiente';

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
    check (status = any (array['pendiente'::text, 'aprobado'::text, 'rechazado'::text]));

do $$
begin
  if to_regclass('public.profiles_status_backup') is not null then
    update public.profiles p
    set status = b.status
    from public.profiles_status_backup b
    where b.id = p.id;
  end if;
end;
$$;

-- ----------------------------------------------------------
-- 2. Funciones originales
-- ----------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'alumno'),
        'pendiente'
    );
    RETURN NEW;
END;
$function$;

create or replace function public.approve_alumno(alumno_id uuid)
returns void
language plpgsql
security definer
as $function$
BEGIN
  UPDATE public.profiles
  SET status = 'aprobado'
  WHERE id = alumno_id AND role = 'alumno';
END;
$function$;

grant execute on function public.handle_new_user() to public, anon, authenticated;
grant execute on function public.approve_alumno(uuid) to public, anon, authenticated;

-- ----------------------------------------------------------
-- 3. Políticas originales de profiles
-- ----------------------------------------------------------
drop policy if exists "Alumno can view their coach" on public.profiles;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "New users can insert their profile" on public.profiles;
create policy "New users can insert their profile" on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Coaches can view pending alumnos" on public.profiles;
create policy "Coaches can view pending alumnos" on public.profiles
  for select
  using ((status = 'pendiente'::text) and is_coach());

-- Permisos originales sobre la tabla
revoke update (full_name, username, avatar_url) on public.profiles from authenticated;
grant insert, update, delete on public.profiles to anon, authenticated;

-- ----------------------------------------------------------
-- 4. Se quita lo que agregó la migración
-- ----------------------------------------------------------
drop function if exists public.vincular_alumno(text);
drop function if exists public.desvincular_alumno(uuid);
drop function if exists public.usuario_disponible(text);
drop function if exists public.mi_coach_id();
drop function if exists public.generar_codigo_cliente();

alter table public.profiles
  drop constraint if exists profiles_client_code_solo_alumnos,
  drop constraint if exists profiles_coach_sin_coach,
  drop constraint if exists profiles_username_formato;
drop index if exists public.profiles_username_key;
drop index if exists public.profiles_client_code_key;
alter table public.profiles
  drop column if exists username,
  drop column if exists client_code;

-- ----------------------------------------------------------
-- 5. Vista y tabla alumnos como estaban
-- ----------------------------------------------------------
alter view public.coach_alumno_summary reset (security_invoker);
alter table public.alumnos disable row level security;

commit;
