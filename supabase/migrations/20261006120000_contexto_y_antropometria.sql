-- ==========================================================
-- Contexto energético y antropometría
--
-- Qué hace:
--   1. profiles guarda sexo y fecha de nacimiento (se cargan una vez; la edad
--      la calcula el frontend).
--   2. contextos_energeticos y antropometrias guardan cada carga como una
--      fila nueva (historial): los datos que se cargan y los resultados que
--      calcula el frontend en JavaScript, tal como se mostraron.
--   3. Quién carga: si el alumno no tiene coach, él mismo. Si tiene coach,
--      solo el coach, salvo las secciones que el coach le habilite
--      (permisos_alumno). Ver: el alumno y su coach.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

-- ----------------------------------------------------------
-- 1. Datos fijos de la persona
-- ----------------------------------------------------------
alter table public.profiles
  add column if not exists sexo text,
  add column if not exists fecha_nacimiento date;

alter table public.profiles drop constraint if exists profiles_sexo_valido;
alter table public.profiles
  add constraint profiles_sexo_valido check (sexo in ('M', 'F'));

alter table public.profiles drop constraint if exists profiles_fecha_nacimiento_valida;
alter table public.profiles
  add constraint profiles_fecha_nacimiento_valida
    check (fecha_nacimiento >= date '1900-01-01');

-- ----------------------------------------------------------
-- 2. Permisos que el coach le da al alumno, por sección
--    Si existe la fila, el alumno puede cargar y editar esa sección.
-- ----------------------------------------------------------
create table if not exists public.permisos_alumno (
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  seccion text not null check (seccion in ('contexto', 'antropometria', 'plan')),
  habilitado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (alumno_id, seccion)
);

-- ----------------------------------------------------------
-- 3. Reglas de acceso (se usan en todas las políticas)
-- ----------------------------------------------------------
-- Ver datos de un alumno: el propio alumno o su coach
create or replace function public.puede_ver_alumno(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_alumno_id
      and role = 'alumno'
      and (id = auth.uid() or coach_id = auth.uid())
  );
$$;

-- Cargar o editar una sección de un alumno:
--   su coach siempre; el alumno si no tiene coach o si el coach lo habilitó
create or replace function public.puede_escribir_alumno(p_alumno_id uuid, p_seccion text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles a
    where a.id = p_alumno_id
      and a.role = 'alumno'
      and (
        a.coach_id = auth.uid()
        or (
          a.id = auth.uid()
          and (
            a.coach_id is null
            or exists (
              select 1 from public.permisos_alumno pa
              where pa.alumno_id = a.id and pa.seccion = p_seccion
            )
          )
        )
      )
  );
$$;

-- Coach: solo el coach del alumno da o quita permisos
create or replace function public.es_coach_de(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_alumno_id and role = 'alumno' and coach_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------
-- 4. Contexto energético: una fila por cada vez que se guarda
-- ----------------------------------------------------------
create table if not exists public.contextos_energeticos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  cargado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Datos que se cargan
  sexo text not null check (sexo in ('M', 'F')),
  edad_anios integer not null check (edad_anios between 10 and 110),
  peso_kg numeric(5,2) not null check (peso_kg between 20 and 400),
  altura_cm numeric(5,1) not null check (altura_cm between 80 and 260),
  pasos_diarios integer not null default 0 check (pasos_diarios between 0 and 100000),
  met numeric(4,1) not null default 0 check (met between 0 and 25),
  duracion_horas numeric(4,2) not null default 0 check (duracion_horas between 0 and 12),
  sesiones_semana integer not null default 0 check (sesiones_semana between 0 and 14),
  tipo_dieta text not null check (tipo_dieta in (
    'deficit_leve', 'deficit_moderado', 'mantenimiento',
    'superavit_leve', 'superavit_moderado', 'personalizado')),
  peso_objetivo_kg numeric(5,2) check (peso_objetivo_kg between 20 and 400),
  plazo_semanas integer check (plazo_semanas between 1 and 52),

  -- Resultados que calcula el frontend (JavaScript)
  bmr_kcal integer,
  neat_kcal integer,
  gasto_sesion_kcal integer,
  entreno_diario_kcal integer,
  tdee_kcal integer,
  tdee_termogenesis_kcal integer,
  ajuste_kcal integer,
  calorias_objetivo integer not null check (calorias_objetivo between 500 and 10000),
  version_calculo text not null default '1',

  -- "Personalizado" necesita peso objetivo y plazo; los demás tipos no los usan
  constraint contexto_personalizado_completo check (
    (tipo_dieta = 'personalizado') = (peso_objetivo_kg is not null and plazo_semanas is not null)
  )
);

create index if not exists contextos_energeticos_alumno_fecha
  on public.contextos_energeticos (alumno_id, created_at desc);

-- ----------------------------------------------------------
-- 5. Antropometría: una fila por medición
-- ----------------------------------------------------------
create table if not exists public.antropometrias (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  cargado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Datos generales
  fecha_medicion date not null default current_date,
  sexo text not null check (sexo in ('M', 'F')),
  edad_decimal numeric(4,1) not null check (edad_decimal between 10 and 110),
  peso_kg numeric(5,2) not null check (peso_kg between 20 and 400),
  talla_cm numeric(5,1) not null check (talla_cm between 80 and 260),

  -- 9 perímetros (cm)
  cuello_cm numeric(5,1) check (cuello_cm > 0),
  torax_cm numeric(5,1) check (torax_cm > 0),
  brazo_relajado_cm numeric(5,1) check (brazo_relajado_cm > 0),
  brazo_flexionado_cm numeric(5,1) check (brazo_flexionado_cm > 0),
  antebrazo_cm numeric(5,1) check (antebrazo_cm > 0),
  cintura_cm numeric(5,1) check (cintura_cm > 0),
  caderas_cm numeric(5,1) check (caderas_cm > 0),
  muslo_medial_cm numeric(5,1) check (muslo_medial_cm > 0),
  pantorrilla_cm numeric(5,1) check (pantorrilla_cm > 0),

  -- 8 pliegues (mm)
  pliegue_triceps_mm numeric(4,1) check (pliegue_triceps_mm > 0),
  pliegue_biceps_mm numeric(4,1) check (pliegue_biceps_mm > 0),
  pliegue_subescapular_mm numeric(4,1) check (pliegue_subescapular_mm > 0),
  pliegue_cresta_iliaca_mm numeric(4,1) check (pliegue_cresta_iliaca_mm > 0),
  pliegue_supraespinal_mm numeric(4,1) check (pliegue_supraespinal_mm > 0),
  pliegue_abdominal_mm numeric(4,1) check (pliegue_abdominal_mm > 0),
  pliegue_muslo_mm numeric(4,1) check (pliegue_muslo_mm > 0),
  pliegue_pantorrilla_mm numeric(4,1) check (pliegue_pantorrilla_mm > 0),

  -- 3 diámetros óseos (cm)
  diametro_muneca_cm numeric(4,1) check (diametro_muneca_cm > 0),
  diametro_rodilla_cm numeric(4,1) check (diametro_rodilla_cm > 0),
  diametro_codo_cm numeric(4,1) check (diametro_codo_cm > 0),

  -- PDF original de la medición (ruta en Supabase Storage, más adelante)
  pdf_path text,

  -- Resultados que calcula el frontend (JavaScript)
  imc numeric(5,2),
  indice_cintura_cadera numeric(4,2),
  indice_cintura_talla numeric(4,2),
  area_muscular_brazo_cm2 numeric(6,2),
  suma_8_pliegues_mm numeric(6,1),
  grasa_pct numeric(5,2),
  grasa_kg numeric(5,2),
  masa_osea_kg numeric(5,2),
  musculo_pct numeric(5,2),
  musculo_kg numeric(5,2),
  residual_pct numeric(5,2),
  residual_kg numeric(5,2),
  relacion_musculo_hueso numeric(5,2),
  version_calculo text not null default '1'
);

create index if not exists antropometrias_alumno_fecha
  on public.antropometrias (alumno_id, fecha_medicion desc, created_at desc);

-- ----------------------------------------------------------
-- 6. Quién cargó y fechas: los pone la base, no el navegador
-- ----------------------------------------------------------
create or replace function public.registrar_autor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.cargado_por := auth.uid();
    new.created_at := now();
  else
    -- No se puede cambiar de quién es el registro ni quién lo cargó
    new.alumno_id := old.alumno_id;
    new.cargado_por := old.cargado_por;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists registrar_autor on public.contextos_energeticos;
create trigger registrar_autor before insert or update on public.contextos_energeticos
  for each row execute function public.registrar_autor();

drop trigger if exists registrar_autor on public.antropometrias;
create trigger registrar_autor before insert or update on public.antropometrias
  for each row execute function public.registrar_autor();

-- Al cambiar el coach de un alumno (vincular o desvincular), sus permisos se borran
create or replace function public.limpiar_permisos_al_cambiar_coach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.permisos_alumno where alumno_id = new.id;
  return new;
end;
$$;

drop trigger if exists limpiar_permisos_al_cambiar_coach on public.profiles;
create trigger limpiar_permisos_al_cambiar_coach
  after update of coach_id on public.profiles
  for each row when (old.coach_id is distinct from new.coach_id)
  execute function public.limpiar_permisos_al_cambiar_coach();

-- ----------------------------------------------------------
-- 7. Sexo y fecha de nacimiento: los cambia el alumno o su coach
-- ----------------------------------------------------------
create or replace function public.actualizar_datos_personales(
  p_alumno_id uuid,
  p_sexo text,
  p_fecha_nacimiento date
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.profiles;
begin
  if not public.puede_ver_alumno(p_alumno_id) then
    raise exception 'No podés modificar los datos de este alumno' using errcode = '42501';
  end if;

  update public.profiles
  set sexo = p_sexo, fecha_nacimiento = p_fecha_nacimiento, updated_at = now()
  where id = p_alumno_id
  returning * into v_perfil;

  return v_perfil;
end;
$$;

-- ----------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------
alter table public.permisos_alumno enable row level security;
alter table public.contextos_energeticos enable row level security;
alter table public.antropometrias enable row level security;

-- Permisos: los ven el alumno y su coach; solo el coach los da o los quita
drop policy if exists "Ver permisos" on public.permisos_alumno;
create policy "Ver permisos" on public.permisos_alumno
  for select to authenticated using (public.puede_ver_alumno(alumno_id));
drop policy if exists "Coach da permisos" on public.permisos_alumno;
create policy "Coach da permisos" on public.permisos_alumno
  for insert to authenticated with check (public.es_coach_de(alumno_id) and habilitado_por = auth.uid());
drop policy if exists "Coach quita permisos" on public.permisos_alumno;
create policy "Coach quita permisos" on public.permisos_alumno
  for delete to authenticated using (public.es_coach_de(alumno_id));

-- Contexto energético
drop policy if exists "Ver contexto" on public.contextos_energeticos;
create policy "Ver contexto" on public.contextos_energeticos
  for select to authenticated using (public.puede_ver_alumno(alumno_id));
drop policy if exists "Cargar contexto" on public.contextos_energeticos;
create policy "Cargar contexto" on public.contextos_energeticos
  for insert to authenticated with check (public.puede_escribir_alumno(alumno_id, 'contexto'));
drop policy if exists "Editar contexto" on public.contextos_energeticos;
create policy "Editar contexto" on public.contextos_energeticos
  for update to authenticated
  using (public.puede_escribir_alumno(alumno_id, 'contexto'))
  with check (public.puede_escribir_alumno(alumno_id, 'contexto'));
drop policy if exists "Borrar contexto" on public.contextos_energeticos;
create policy "Borrar contexto" on public.contextos_energeticos
  for delete to authenticated using (public.puede_escribir_alumno(alumno_id, 'contexto'));

-- Antropometría
drop policy if exists "Ver antropometria" on public.antropometrias;
create policy "Ver antropometria" on public.antropometrias
  for select to authenticated using (public.puede_ver_alumno(alumno_id));
drop policy if exists "Cargar antropometria" on public.antropometrias;
create policy "Cargar antropometria" on public.antropometrias
  for insert to authenticated with check (public.puede_escribir_alumno(alumno_id, 'antropometria'));
drop policy if exists "Editar antropometria" on public.antropometrias;
create policy "Editar antropometria" on public.antropometrias
  for update to authenticated
  using (public.puede_escribir_alumno(alumno_id, 'antropometria'))
  with check (public.puede_escribir_alumno(alumno_id, 'antropometria'));
drop policy if exists "Borrar antropometria" on public.antropometrias;
create policy "Borrar antropometria" on public.antropometrias
  for delete to authenticated using (public.puede_escribir_alumno(alumno_id, 'antropometria'));

-- ----------------------------------------------------------
-- 9. Permisos de tablas y funciones
-- ----------------------------------------------------------
revoke all on public.permisos_alumno, public.contextos_energeticos, public.antropometrias from anon;
grant select, insert, delete on public.permisos_alumno to authenticated;
grant select, insert, update, delete on public.contextos_energeticos, public.antropometrias to authenticated;

revoke execute on function public.registrar_autor() from public, anon, authenticated;
revoke execute on function public.limpiar_permisos_al_cambiar_coach() from public, anon, authenticated;
revoke execute on function public.puede_ver_alumno(uuid) from public, anon;
revoke execute on function public.puede_escribir_alumno(uuid, text) from public, anon;
revoke execute on function public.es_coach_de(uuid) from public, anon;
revoke execute on function public.actualizar_datos_personales(uuid, text, date) from public, anon;
grant execute on function public.puede_ver_alumno(uuid) to authenticated;
grant execute on function public.puede_escribir_alumno(uuid, text) to authenticated;
grant execute on function public.es_coach_de(uuid) to authenticated;
grant execute on function public.actualizar_datos_personales(uuid, text, date) to authenticated;

commit;
