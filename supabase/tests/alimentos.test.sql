-- ==========================================================
-- Pruebas de 20261017120000_alimentos.sql
--
-- Simula al equipo (SQL Editor), dos alumnos (uno con coach), dos coaches y
-- un usuario sin sesión. Verifica la carga, los controles de calidad, la
-- revisión, las correcciones, quién ve qué y la búsqueda.
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

-- ---------- Usuarios: coach1 tiene a alumno1; alumno2 no tiene coach ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-4444-4444-4444-4444444444c1', 'ali.coach1@test.com', '{"role":"coach","username":"ali.coach1"}'),
  ('44444444-4444-4444-4444-4444444444c2', 'ali.coach2@test.com', '{"role":"coach","username":"ali.coach2"}'),
  ('44444444-4444-4444-4444-4444444444a1', 'ali.alumno1@test.com', '{"role":"alumno","username":"ali.alumno1"}'),
  ('44444444-4444-4444-4444-4444444444a2', 'ali.alumno2@test.com', '{"role":"alumno","username":"ali.alumno2"}');
update public.profiles set coach_id = '44444444-4444-4444-4444-4444444444c1'
where id = '44444444-4444-4444-4444-4444444444a1';

-- ---------- El equipo carga desde la planilla (SQL Editor): entra tal cual ----------
insert into public.alimentos
  (nombre, categoria, coccion, marca, kcal, proteinas, carbohidratos, grasas,
   porcion_g, unidad_nombre, unidad_g, sinonimos, fuente, fuente_ref, estado_revision)
values
  ('Pechuga de pollo', 'carnes', 'cocido', null, 165, 31, 0, 3.6, 150, null, null, '{}', 'usda', '171477', 'aprobado'),
  ('Plátano', 'frutas', 'listo', null, 89, 1.1, 23, 0.3, 118, 'u', 118, '{banana}', 'equipo', null, 'aprobado'),
  ('Palta', 'frutas', 'listo', null, 160, 2, 8.5, 14.7, 50, null, null, '{aguacate}', 'equipo', null, 'aprobado'),
  ('Avena arrollada', 'cereales', 'crudo', 'Quaker', 375, 12.5, 67.5, 7.5, 40, null, null, '{copos de avena}', 'equipo', null, 'aprobado'),
  -- Excepción revisada por el equipo: calorías del alcohol, no coinciden con los macros
  ('Cerveza rubia', 'bebidas', 'listo', null, 43, 0.5, 3.6, 0, 330, 'lata', 354, '{}', 'equipo', null, 'aprobado');

do $$
begin
  assert (select count(*) from public.alimentos where estado_revision = 'aprobado') = 5,
    'la carga del equipo tiene que entrar aprobada';
  assert (select fuente from public.alimentos where nombre = 'Pechuga de pollo') = 'usda',
    'la carga del equipo tiene que conservar su fuente';

  -- Controles que valen para todos, también para el equipo
  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente, estado_revision)
    values ('Imposible', 'otros', 'listo', 100, 10, 10, 1, 'equipo', 'aprobado');
    raise exception 'FALLO: se aceptó una categoría que no existe';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente, estado_revision)
    values ('Imposible', 'frutas', 'listo', 500, 60, 50, 10, 'equipo', 'aprobado');
    raise exception 'FALLO: se aceptaron macros que suman más de 100 g cada 100 g';
  exception when check_violation then null;
  end;
  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente, estado_revision, unidad_nombre)
    values ('Sin peso de unidad', 'frutas', 'listo', 50, 1, 11, 0, 'equipo', 'aprobado', 'u');
    raise exception 'FALLO: se aceptó una unidad sin su peso';
  exception when check_violation then null;
  end;
  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente, estado_revision)
    values ('PLATANO ', 'frutas', 'listo', 89, 1.1, 23, 0.3, 'equipo', 'aprobado');
    raise exception 'FALLO: se aceptó un duplicado (mismo nombre sin tildes ni mayúsculas)';
  exception when unique_violation then null;
  end;
end;
$$;

-- ---------- Alumno1 crea alimentos desde la app ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a1');
do $$
declare r public.alimentos;
begin
  assert (select count(*) from public.categorias_alimento) = 12, 'el alumno no ve las categorías';

  -- Intenta cargarlo aprobado, como si fuera de USDA y a nombre de otro: la base lo corrige
  insert into public.alimentos
    (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente, fuente_ref, estado_revision, creado_por)
  values ('Galletitas de avena caseras', 'cereales', 'cocido', 450, 8, 65, 17, 'usda', '999', 'aprobado',
          '44444444-4444-4444-4444-4444444444c1')
  returning * into r;
  assert r.estado_revision = 'pendiente', 'lo cargado desde la app tiene que quedar pendiente';
  assert r.fuente = 'alumno' and r.fuente_ref is null, 'la fuente la pone la base';
  assert r.creado_por = auth.uid(), 'creado_por lo pone la base';

  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente)
    values ('Calorías mal', 'cereales', 'listo', 900, 10, 10, 1, 'alumno');
    raise exception 'FALLO: desde la app se aceptaron calorías que no coinciden con los macros';
  exception when check_violation then null;
  end;

  begin
    insert into public.alimentos (nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, fuente)
    values ('palta', 'frutas', 'listo', 160, 2, 8.5, 14.7, 'alumno');
    raise exception 'FALLO: desde la app se aceptó un duplicado de un alimento aprobado';
  exception when unique_violation then null;
  end;

  -- Ve lo aprobado y lo suyo
  assert (select count(*) from public.alimentos) = 6, 'el alumno tiene que ver 5 aprobados y 1 propio';

  -- Puede editar lo suyo pendiente, pero no aprobarlo
  update public.alimentos set kcal = 445, estado_revision = 'aprobado'
  where nombre = 'Galletitas de avena caseras' returning * into r;
  assert r.kcal = 445 and r.estado_revision = 'pendiente', 'el alumno se aprobó su propio alimento';

  -- No puede editar ni borrar un alimento aprobado
  update public.alimentos set kcal = 1 where nombre = 'Palta';
  assert (select kcal from public.alimentos where nombre = 'Palta') = 160, 'el alumno editó un alimento aprobado';
  delete from public.alimentos where nombre = 'Palta';
  assert exists (select 1 from public.alimentos where nombre = 'Palta'), 'el alumno borró un alimento aprobado';

  begin
    perform public.revisar_alimento((select id from public.alimentos where nombre = 'Galletitas de avena caseras'), true);
    raise exception 'FALLO: un alumno revisó un alimento';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Id del alimento de alumno1, para usarlo como otros usuarios aunque no lo vean
select set_config('prueba.galletitas',
  (select id::text from public.alimentos where nombre = 'Galletitas de avena caseras'), true);

-- ---------- Alumno2 (otro alumno) no ve lo pendiente de alumno1 ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a2');
do $$
begin
  assert (select count(*) from public.alimentos) = 5, 'un alumno ve alimentos pendientes de otro';
end;
$$;
reset role;

-- ---------- Coach2 (no es su coach) no lo ve ni lo puede revisar ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444c2');
do $$
begin
  assert (select count(*) from public.alimentos) = 5, 'otro coach ve alimentos pendientes de un alumno ajeno';
  begin
    perform public.revisar_alimento(current_setting('prueba.galletitas')::uuid, true);
    raise exception 'FALLO: otro coach revisó un alimento de un alumno ajeno';
  exception when no_data_found then null;
  end;
  begin
    perform public.revisar_alimento(current_setting('prueba.galletitas')::uuid, false, 'No me gusta');
    raise exception 'FALLO: otro coach rechazó un alimento de un alumno ajeno';
  exception when no_data_found then null;
  end;
end;
$$;
reset role;

-- ---------- Coach1 lo revisa ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444c1');
do $$
declare
  v_id uuid;
  r public.alimentos;
begin
  select id into v_id from public.alimentos where nombre = 'Galletitas de avena caseras';
  assert v_id is not null, 'el coach no ve el alimento pendiente de su alumno';

  begin
    perform public.revisar_alimento(v_id, false, '  ');
    raise exception 'FALLO: se rechazó sin motivo';
  exception when check_violation then null;
  end;

  r := public.revisar_alimento(v_id, true);
  assert r.estado_revision = 'aprobado' and r.revisado_por = auth.uid() and r.revisado_el is not null,
    'el coach no pudo aprobar el alimento';

  begin
    perform public.revisar_alimento(v_id, true);
    raise exception 'FALLO: se revisó dos veces el mismo alimento';
  exception when check_violation then null;
  end;
end;
$$;
reset role;

-- ---------- Ya aprobado, lo ven todos ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a2');
do $$
begin
  assert (select count(*) from public.alimentos) = 6, 'un alimento aprobado no lo ven todos';
end;
$$;
reset role;

-- ---------- Ya aprobado, su autor tampoco lo edita ni lo borra directo ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a1');
do $$
begin
  update public.alimentos set nombre = 'Galletitas cambiadas' where id = current_setting('prueba.galletitas')::uuid;
  delete from public.alimentos where id = current_setting('prueba.galletitas')::uuid;
end;
$$;
reset role;
do $$
declare r public.alimentos;
begin
  select * into r from public.alimentos where id = current_setting('prueba.galletitas')::uuid;
  assert r.id is not null, 'el autor borró su alimento ya aprobado';
  assert r.nombre = 'Galletitas de avena caseras' and r.estado_revision = 'aprobado',
    'el autor editó su alimento ya aprobado';
end;
$$;

-- ---------- Correcciones ("Editar alimento") ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a1');
do $$
declare
  v_palta uuid := (select id from public.alimentos where nombre = 'Palta');
  v_correccion uuid;
begin
  insert into public.correcciones_alimento
    (alimento_id, nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas, sinonimos, nota, estado)
  values (v_palta, 'Palta', 'frutas', 'listo', 167, 2, 8.6, 15.4, '{aguacate}', 'Según la etiqueta', 'aceptada')
  returning id into v_correccion;
  assert (select estado from public.correcciones_alimento where id = v_correccion) = 'pendiente',
    'una corrección propuesta tiene que quedar pendiente';
  assert (select kcal from public.alimentos where id = v_palta) = 160, 'la corrección cambió el alimento sin revisión';

  begin
    insert into public.correcciones_alimento (alimento_id, nombre, categoria, coccion, kcal, proteinas, carbohidratos, grasas)
    values (v_palta, 'Palta', 'frutas', 'listo', 900, 2, 8.6, 15.4);
    raise exception 'FALLO: se aceptó una corrección con calorías que no coinciden';
  exception when check_violation then null;
  end;

  begin
    update public.correcciones_alimento set kcal = 1 where id = v_correccion;
    raise exception 'FALLO: el alumno editó una corrección ya enviada';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444c2');
do $$
begin
  assert (select count(*) from public.correcciones_alimento) = 0, 'otro coach ve correcciones de un alumno ajeno';
end;
$$;
reset role;

set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444c1');
do $$
declare r public.correcciones_alimento;
begin
  r := public.revisar_correccion((select id from public.correcciones_alimento limit 1), true);
  assert r.estado = 'aceptada', 'el coach no pudo aceptar la corrección';
  assert (select kcal from public.alimentos where nombre = 'Palta') = 167, 'aceptar la corrección no cambió el alimento';
  assert (select estado_revision from public.alimentos where nombre = 'Palta') = 'aprobado',
    'aceptar una corrección no tiene que cambiar el estado del alimento';
end;
$$;
reset role;

-- ---------- Búsqueda ----------
set local role authenticated;
select pg_temp.como('44444444-4444-4444-4444-4444444444a2');
do $$
begin
  assert (select nombre from public.buscar_alimentos('POLLO') limit 1) = 'Pechuga de pollo', 'no ignora mayúsculas';
  assert (select nombre from public.buscar_alimentos('platano') limit 1) = 'Plátano', 'no ignora tildes';
  assert (select nombre from public.buscar_alimentos('banana') limit 1) = 'Plátano', 'no busca por sinónimo';
  assert (select nombre from public.buscar_alimentos('aguacate') limit 1) = 'Palta', 'no busca por sinónimo';
  assert (select nombre from public.buscar_alimentos('quaker') limit 1) = 'Avena arrollada', 'no busca por marca';
  assert (select nombre from public.buscar_alimentos('pollos') limit 1) = 'Pechuga de pollo', 'no tolera el plural';
  assert (select nombre from public.buscar_alimentos('avna') limit 1) = 'Avena arrollada', 'no tolera errores de tipeo';
  assert (select count(*) from public.buscar_alimentos('%')) = 0, 'el comodín % trajo todo';
  assert (select count(*) from public.buscar_alimentos('a')) = 0, 'con una sola letra no se busca';
  assert (select count(*) from public.buscar_alimentos('a', null, 1000)) <= 50, 'no respeta el máximo de resultados';
  assert (select count(*) from public.buscar_alimentos('pollo', 'carnes')) = 1
     and (select count(*) from public.buscar_alimentos('pollo', 'frutas')) = 0, 'no filtra por categoría';
  assert (select nombre from public.buscar_alimentos('platno') limit 1) = 'Plátano', 'no tolera una letra de menos';
end;
$$;
reset role;

-- ---------- Sin sesión: no ve nada ----------
set local role anon;
select pg_temp.como(null);
do $$
begin
  begin
    perform count(*) from public.alimentos;
    raise exception 'FALLO: un usuario sin sesión vio alimentos';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.buscar_alimentos('pollo');
    raise exception 'FALLO: un usuario sin sesión pudo buscar';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'OK: todas las pruebas pasaron' as resultado;

rollback;
