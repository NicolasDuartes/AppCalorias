-- ==========================================================
-- REVERSIÓN de 20261006120000_contexto_y_antropometria.sql
--
-- Deja el esquema como estaba antes de la migración.
-- Se pierden: todos los contextos energéticos y antropometrías cargados, los
-- permisos por sección y el sexo / fecha de nacimiento de los perfiles.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

drop trigger if exists limpiar_permisos_al_cambiar_coach on public.profiles;

drop table if exists public.contextos_energeticos;
drop table if exists public.antropometrias;
drop table if exists public.permisos_alumno;

drop function if exists public.registrar_autor();
drop function if exists public.limpiar_permisos_al_cambiar_coach();
drop function if exists public.actualizar_datos_personales(uuid, text, date);
drop function if exists public.puede_escribir_alumno(uuid, text);
drop function if exists public.puede_ver_alumno(uuid);
drop function if exists public.es_coach_de(uuid);

alter table public.profiles
  drop constraint if exists profiles_sexo_valido,
  drop constraint if exists profiles_fecha_nacimiento_valida;
alter table public.profiles
  drop column if exists sexo,
  drop column if exists fecha_nacimiento;

commit;
