-- ==========================================================
-- Pruebas de 20261006120000_contexto_y_antropometria.sql
--
-- Simula un alumno, su coach, otro coach y un usuario anónimo, y verifica
-- quién puede ver y cargar contexto energético y antropometría.
-- Corre todo en una transacción y al final hace ROLLBACK: no deja datos.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run.
-- Si todo está bien, termina mostrando "OK: todas las pruebas pasaron".
-- ==========================================================

begin;

create or replace function pg_temp.como(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_id is null then '' else json_build_object('sub', p_id, 'role', 'authenticated')::text end,
    true);
end;
$$;

-- Inserta un contexto mínimo para el alumno indicado (como el usuario actual)
create or replace function pg_temp.cargar_contexto(p_alumno uuid, p_kcal int) returns void language sql as $$
  insert into public.contextos_energeticos
    (alumno_id, sexo, edad_anios, peso_kg, altura_cm, tipo_dieta, calorias_objetivo)
  values (p_alumno, 'M', 30, 78, 178, 'deficit_moderado', p_kcal);
$$;

create or replace function pg_temp.cargar_antropometria(p_alumno uuid) returns void language sql as $$
  insert into public.antropometrias (alumno_id, sexo, edad_decimal, peso_kg, talla_cm, grasa_pct)
  values (p_alumno, 'M', 30.5, 78, 178, 19.9);
$$;

-- ---------- Usuarios ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('22222222-2222-2222-2222-2222222222c1', 'coach1@test.com', '{"role":"coach","username":"prueba.coach1"}'),
  ('22222222-2222-2222-2222-2222222222c2', 'coach2@test.com', '{"role":"coach","username":"prueba.coach2"}'),
  ('22222222-2222-2222-2222-2222222222a1', 'alumno1@test.com', '{"role":"alumno","username":"prueba.alumno1"}');

-- ---------- Alumno sin coach: carga todo lo suyo ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222a1');
do $$
declare v_autor uuid;
begin
  perform public.actualizar_datos_personales('22222222-2222-2222-2222-2222222222a1', 'M', '1996-03-10');
  assert (select sexo from public.profiles where id = auth.uid()) = 'M', 'el alumno no pudo guardar su sexo';

  perform pg_temp.cargar_contexto('22222222-2222-2222-2222-2222222222a1', 2000);
  perform pg_temp.cargar_antropometria('22222222-2222-2222-2222-2222222222a1');
  assert (select count(*) from public.contextos_energeticos) = 1, 'el alumno sin coach no pudo cargar su contexto';
  assert (select count(*) from public.antropometrias) = 1, 'el alumno sin coach no pudo cargar su antropometría';

  -- cargado_por lo pone la base, aunque el navegador mande otro valor
  insert into public.contextos_energeticos
    (alumno_id, cargado_por, sexo, edad_anios, peso_kg, altura_cm, tipo_dieta, calorias_objetivo)
  values (auth.uid(), '22222222-2222-2222-2222-2222222222c1', 'M', 30, 78, 178, 'mantenimiento', 2500)
  returning cargado_por into v_autor;
  assert v_autor = auth.uid(), 'cargado_por no lo puso la base';

  -- Validaciones
  begin
    insert into public.contextos_energeticos (alumno_id, sexo, edad_anios, peso_kg, altura_cm, tipo_dieta, calorias_objetivo)
    values (auth.uid(), 'M', 30, 78, 178, 'personalizado', 2000);
    raise exception 'FALLO: se aceptó un contexto personalizado sin peso objetivo ni plazo';
  exception when check_violation then null;
  end;
  begin
    insert into public.contextos_energeticos (alumno_id, sexo, edad_anios, peso_kg, altura_cm, tipo_dieta, calorias_objetivo)
    values (auth.uid(), 'M', 30, 78, 178, 'dieta_inventada', 2000);
    raise exception 'FALLO: se aceptó un tipo de dieta inválido';
  exception when check_violation then null;
  end;
  begin
    perform pg_temp.cargar_contexto('22222222-2222-2222-2222-2222222222c1', 2000);
    raise exception 'FALLO: se cargó un contexto para un coach';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- Coach que todavía no está vinculado ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222c1');
do $$
begin
  assert (select count(*) from public.contextos_energeticos) = 0, 'un coach ve datos de un alumno que no es suyo';
  begin
    perform pg_temp.cargar_contexto('22222222-2222-2222-2222-2222222222a1', 2100);
    raise exception 'FALLO: un coach cargó datos de un alumno que no es suyo';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Vincular al alumno con el coach 1
select set_config('prueba.codigo',
  (select client_code from public.profiles where id = '22222222-2222-2222-2222-2222222222a1'), true);
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222c1');
select public.vincular_alumno(current_setting('prueba.codigo'));

-- ---------- Coach vinculado ----------
do $$
declare v_id uuid;
begin
  assert (select count(*) from public.contextos_energeticos) = 2, 'el coach no ve el historial de su alumno';
  assert (select fecha_nacimiento from public.profiles where id = '22222222-2222-2222-2222-2222222222a1') = '1996-03-10',
    'el coach no ve la fecha de nacimiento de su alumno';

  perform pg_temp.cargar_contexto('22222222-2222-2222-2222-2222222222a1', 2060);
  select id into v_id from public.contextos_energeticos where calorias_objetivo = 2060;
  assert (select cargado_por from public.contextos_energeticos where id = v_id) = auth.uid(), 'no quedó registrado que lo cargó el coach';

  -- Puede corregir un registro (incluso uno que cargó el alumno) pero no cambiar de quién es
  update public.contextos_energeticos set calorias_objetivo = 2010, alumno_id = auth.uid()
  where calorias_objetivo = 2000;
  assert exists (select 1 from public.contextos_energeticos where calorias_objetivo = 2010
                 and alumno_id = '22222222-2222-2222-2222-2222222222a1'), 'el coach no pudo corregir o se cambió el alumno';

  perform public.actualizar_datos_personales('22222222-2222-2222-2222-2222222222a1', 'M', '1996-03-11');
end;
$$;
reset role;

-- ---------- Alumno con coach y sin permisos: solo ve ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222a1');
do $$
declare n int;
begin
  assert (select count(*) from public.contextos_energeticos) = 3, 'el alumno no ve lo que cargó su coach';
  begin
    perform pg_temp.cargar_contexto(auth.uid(), 1800);
    raise exception 'FALLO: el alumno con coach cargó contexto sin permiso';
  exception when insufficient_privilege then null;
  end;
  update public.contextos_energeticos set calorias_objetivo = 1500;
  get diagnostics n = row_count;
  assert n = 0, 'el alumno con coach editó contexto sin permiso';
  delete from public.antropometrias;
  get diagnostics n = row_count;
  assert n = 0, 'el alumno con coach borró antropometría sin permiso';

  -- No puede darse permisos a sí mismo
  begin
    insert into public.permisos_alumno (alumno_id, seccion, habilitado_por) values (auth.uid(), 'contexto', auth.uid());
    raise exception 'FALLO: el alumno se dio permisos a sí mismo';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- El coach habilita la antropometría ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222c1');
insert into public.permisos_alumno (alumno_id, seccion, habilitado_por)
values ('22222222-2222-2222-2222-2222222222a1', 'antropometria', '22222222-2222-2222-2222-2222222222c1');
reset role;

set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222a1');
do $$
begin
  perform pg_temp.cargar_antropometria(auth.uid());
  assert (select count(*) from public.antropometrias) = 2, 'el alumno habilitado no pudo cargar antropometría';
  begin
    perform pg_temp.cargar_contexto(auth.uid(), 1800);
    raise exception 'FALLO: el permiso de antropometría habilitó también el contexto';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- Otro coach y anónimo: no ven nada ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222c2');
do $$
begin
  assert (select count(*) from public.contextos_energeticos) = 0, 'otro coach ve contextos ajenos';
  assert (select count(*) from public.antropometrias) = 0, 'otro coach ve antropometrías ajenas';
  assert (select count(*) from public.permisos_alumno) = 0, 'otro coach ve permisos ajenos';
  begin
    perform public.actualizar_datos_personales('22222222-2222-2222-2222-2222222222a1', 'F', '2000-01-01');
    raise exception 'FALLO: otro coach cambió datos personales de un alumno ajeno';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set local role anon;
select pg_temp.como(null);
do $$
begin
  begin
    perform count(*) from public.contextos_energeticos;
    raise exception 'FALLO: anónimo puede consultar contextos';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.antropometrias;
    raise exception 'FALLO: anónimo puede consultar antropometrías';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- ---------- Desvincular: el coach pierde acceso, el alumno vuelve a cargar ----------
set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222a1');
select public.desvincular_alumno('22222222-2222-2222-2222-2222222222a1');
reset role;

do $$
begin
  assert not exists (select 1 from public.permisos_alumno where alumno_id = '22222222-2222-2222-2222-2222222222a1'),
    'los permisos no se borraron al desvincular';
end;
$$;

set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222c1');
do $$
begin
  assert (select count(*) from public.contextos_energeticos) = 0, 'el coach sigue viendo datos después de desvincular';
end;
$$;
reset role;

set local role authenticated;
select pg_temp.como('22222222-2222-2222-2222-2222222222a1');
do $$
begin
  assert (select count(*) from public.contextos_energeticos) = 3, 'el alumno perdió su historial al desvincularse';
  perform pg_temp.cargar_contexto(auth.uid(), 1900);
  assert (select count(*) from public.contextos_energeticos) = 4, 'el alumno sin coach no pudo volver a cargar';
end;
$$;
reset role;

select 'OK: todas las pruebas pasaron' as resultado;

rollback;
