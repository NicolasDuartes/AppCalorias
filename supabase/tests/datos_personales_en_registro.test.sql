-- ==========================================================
-- Pruebas de 20261006130000_datos_personales_en_registro.sql
--
-- Simula registros (como supabase.auth.signUp) y verifica que el alta guarde
-- sexo y fecha de nacimiento solo para alumnos y que un valor inválido no
-- haga fallar el registro. Hace ROLLBACK al final: no deja datos.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run.
-- Si todo está bien, termina mostrando "OK: todas las pruebas pasaron".
-- ==========================================================

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-3333333333a1', 'reg.alumno@test.com',
   '{"role":"alumno","username":"reg.alumno","sexo":"F","fecha_nacimiento":"1998-07-21"}'),
  ('33333333-3333-3333-3333-3333333333c1', 'reg.coach@test.com',
   '{"role":"coach","username":"reg.coach","sexo":"M","fecha_nacimiento":"1990-01-01"}'),
  ('33333333-3333-3333-3333-3333333333a2', 'reg.invalido@test.com',
   '{"role":"alumno","username":"reg.invalido","sexo":"X","fecha_nacimiento":"2026-02-31"}'),
  ('33333333-3333-3333-3333-3333333333a3', 'reg.futuro@test.com',
   '{"role":"alumno","username":"reg.futuro","sexo":"M","fecha_nacimiento":"2999-01-01"}'),
  ('33333333-3333-3333-3333-3333333333a4', 'reg.sin.datos@test.com',
   '{"role":"alumno","username":"reg.sin.datos"}');

do $$
declare r record;
begin
  select * into r from public.profiles where id = '33333333-3333-3333-3333-3333333333a1';
  assert r.sexo = 'F', 'no se guardó el sexo del alumno';
  assert r.fecha_nacimiento = '1998-07-21', 'no se guardó la fecha de nacimiento del alumno';
  assert r.client_code is not null and r.username = 'reg.alumno', 'el alta del alumno perdió datos de la cuenta';

  select * into r from public.profiles where id = '33333333-3333-3333-3333-3333333333c1';
  assert r.role = 'coach' and r.sexo is null and r.fecha_nacimiento is null,
    'a un coach no se le guardan sexo ni fecha de nacimiento';

  select * into r from public.profiles where id = '33333333-3333-3333-3333-3333333333a2';
  assert r.role = 'alumno' and r.sexo is null and r.fecha_nacimiento is null,
    'valores inválidos tienen que quedar vacíos sin romper el registro';

  select * into r from public.profiles where id = '33333333-3333-3333-3333-3333333333a3';
  assert r.sexo = 'M' and r.fecha_nacimiento is null, 'una fecha futura tiene que quedar vacía';

  select * into r from public.profiles where id = '33333333-3333-3333-3333-3333333333a4';
  assert r.role = 'alumno' and r.sexo is null and r.fecha_nacimiento is null,
    'un registro sin estos datos tiene que funcionar igual';
end;
$$;

select 'OK: todas las pruebas pasaron' as resultado;

rollback;
