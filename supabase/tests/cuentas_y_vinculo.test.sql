-- ==========================================================
-- Pruebas de 20261005120000_cuentas_y_vinculo.sql
--
-- Simula usuarios (coaches, alumnos y anónimo) y verifica qué puede hacer
-- cada uno. Corre todo en una transacción y al final hace ROLLBACK:
-- no deja usuarios ni datos de prueba.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run.
-- Si todo está bien, termina sin errores y muestra "OK: todas las pruebas pasaron".
-- Si algo falla, se corta con un error que dice qué prueba falló.
-- ==========================================================

begin;

-- Cambia el usuario simulado (null = anónimo)
create or replace function pg_temp.como(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_id is null then '' else json_build_object('sub', p_id, 'role', 'authenticated')::text end,
    true);
end;
$$;

-- ---------- Altas (como lo haría supabase.auth.signUp) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-1111111111c1', 'martina@test.com', '{"role":"coach","username":"coach.martina"}'),
  ('11111111-1111-1111-1111-1111111111c2', 'otro@test.com',    '{"role":"coach","username":"otro.coach"}'),
  ('11111111-1111-1111-1111-1111111111a1', 'benja@test.com',   '{"role":"alumno","username":"Benja.Blason"}'),
  ('11111111-1111-1111-1111-1111111111a2', 'colado@test.com',  '{"role":"admin","username":"colado"}');

do $$
declare r record;
begin
  select * into r from public.profiles where id = '11111111-1111-1111-1111-1111111111c1';
  assert r.role = 'coach', 'el coach no quedó con role coach';
  assert r.client_code is null, 'un coach no debe tener ID de cliente';

  select * into r from public.profiles where id = '11111111-1111-1111-1111-1111111111a1';
  assert r.role = 'alumno', 'el alumno no quedó con role alumno';
  assert r.username = 'benja.blason', 'el @usuario no se guardó en minúsculas';
  assert r.email = 'benja@test.com', 'no se guardó el correo';
  assert r.client_code ~ '^NF-[0-9]{4}-[A-Z]{2}$', 'el ID de cliente no tiene el formato NF-1234-AB';
  assert r.coach_id is null, 'un alumno nuevo no debe tener coach';

  select * into r from public.profiles where id = '11111111-1111-1111-1111-1111111111a2';
  assert r.role = 'alumno', 'un rol inválido en el registro debe quedar como alumno';
end;
$$;

-- @usuario repetido: el registro falla
do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-1111111111d1', 'dup@test.com', '{"username":"coach.martina"}');
    raise exception 'FALLO: se permitió un @usuario repetido';
  exception when unique_violation then null;
  end;
end;
$$;

-- ---------- Anónimo ----------
set local role anon;
select pg_temp.como(null);
do $$
begin
  assert public.usuario_disponible('nuevo.usuario'), 'usuario_disponible: un @usuario libre figura tomado';
  assert not public.usuario_disponible('COACH.MARTINA'), 'usuario_disponible: un @usuario tomado figura libre';
  assert (select count(*) from public.profiles) = 0, 'anónimo puede leer perfiles';
  assert (select count(*) from public.coach_alumno_summary) = 0, 'anónimo puede leer coach_alumno_summary';
  assert (select count(*) from public.alumnos) = 0, 'anónimo puede leer la tabla alumnos';
  begin
    perform public.vincular_alumno('NF-0000-AA');
    raise exception 'FALLO: anónimo pudo llamar a vincular_alumno';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- Alumno antes de vincularse ----------
set local role authenticated;
select pg_temp.como('11111111-1111-1111-1111-1111111111a1');
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'el alumno ve perfiles ajenos';

  update public.profiles set full_name = 'Benja Blason' where id = auth.uid();
  assert (select full_name from public.profiles where id = auth.uid()) = 'Benja Blason', 'el alumno no puede editar su nombre';

  begin
    update public.profiles set role = 'coach' where id = auth.uid();
    raise exception 'FALLO: el alumno pudo cambiarse el rol';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set coach_id = '11111111-1111-1111-1111-1111111111c1' where id = auth.uid();
    raise exception 'FALLO: el alumno pudo asignarse un coach';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set client_code = 'NF-0000-AA' where id = auth.uid();
    raise exception 'FALLO: el alumno pudo cambiar su ID de cliente';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.vincular_alumno('NF-0000-AA');
    raise exception 'FALLO: un alumno pudo vincular';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Guardar el ID de cliente del alumno para usarlo como coach
select set_config('prueba.codigo',
  (select client_code from public.profiles where id = '11111111-1111-1111-1111-1111111111a1'), true);

-- ---------- Coach 1 vincula al alumno ----------
set local role authenticated;
select pg_temp.como('11111111-1111-1111-1111-1111111111c1');
do $$
declare r public.profiles;
begin
  assert (select count(*) from public.profiles where role = 'alumno') = 0, 'el coach ve alumnos antes de vincularlos';

  begin
    perform public.vincular_alumno('NF-9999-ZZ');
    raise exception 'FALLO: se vinculó un ID de cliente inexistente';
  exception when no_data_found then null;
  end;

  -- Acepta el código en minúsculas y con espacios
  r := public.vincular_alumno('  ' || lower(current_setting('prueba.codigo')) || ' ');
  assert r.coach_id = auth.uid(), 'vincular_alumno no asignó el coach';
  assert (select count(*) from public.profiles where role = 'alumno') = 1, 'el coach no ve a su alumno vinculado';

  -- Vincular de nuevo al mismo alumno no da error
  perform public.vincular_alumno(current_setting('prueba.codigo'));
end;
$$;
reset role;

-- ---------- Coach 2 intenta quedarse con el alumno ----------
set local role authenticated;
select pg_temp.como('11111111-1111-1111-1111-1111111111c2');
do $$
begin
  begin
    perform public.vincular_alumno(current_setting('prueba.codigo'));
    raise exception 'FALLO: otro coach pudo vincular a un alumno ya vinculado';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  assert (select count(*) from public.profiles where role = 'alumno') = 0, 'un coach ve alumnos de otro coach';
  begin
    perform public.desvincular_alumno('11111111-1111-1111-1111-1111111111a1');
    raise exception 'FALLO: otro coach pudo desvincular a un alumno ajeno';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- Alumno vinculado ----------
set local role authenticated;
select pg_temp.como('11111111-1111-1111-1111-1111111111a1');
do $$
begin
  assert (select username from public.profiles where role = 'coach') = 'coach.martina', 'el alumno no ve a su coach';
  assert (select count(*) from public.profiles) = 2, 'el alumno ve perfiles que no son suyos ni de su coach';

  -- El alumno puede desvincularse
  perform public.desvincular_alumno(auth.uid());
  assert (select coach_id from public.profiles where id = auth.uid()) is null, 'el alumno no pudo desvincularse';
  assert (select count(*) from public.profiles) = 1, 'el alumno sigue viendo al coach después de desvincularse';
end;
$$;
reset role;

-- ---------- Datos que ya existían ----------
do $$
begin
  assert not exists (select 1 from public.profiles where role = 'alumno' and client_code is null),
    'quedaron alumnos sin ID de cliente';
  assert not exists (select 1 from pg_proc where proname = 'approve_alumno'), 'approve_alumno sigue existiendo';
end;
$$;

select 'OK: todas las pruebas pasaron' as resultado;

rollback;
