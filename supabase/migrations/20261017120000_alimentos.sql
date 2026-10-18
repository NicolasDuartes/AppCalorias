-- ==========================================================
-- Base propia de alimentos
--
-- - categorias_alimento: lista cerrada de categorías (Carnes, Lácteos, ...).
-- - alimentos: valores cada 100 g, porción, unidades, sinónimos y origen.
--   Los que carga el equipo desde la planilla entran aprobados; los que crean
--   alumnos y coaches desde la app entran "pendiente" y los revisa un coach.
-- - correcciones_alimento: "Editar alimento" sobre uno aprobado no lo cambia
--   directo: queda como propuesta hasta que un coach la acepta.
-- - buscar_alimentos(): búsqueda sin tildes, tolerante a errores de tipeo.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

-- unaccent (sacar tildes) y pg_trgm (parecido entre textos). Si ya estaban
-- instaladas en otro esquema, se usan donde estén.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set local search_path = public, extensions;

-- ----------------------------------------------------------
-- 1. Texto normalizado: minúsculas, sin tildes y sin espacios de más
-- ----------------------------------------------------------
create or replace function public.normalizar_texto(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions, pg_catalog
as $$
  select lower(trim(regexp_replace(unaccent('unaccent'::regdictionary, coalesce(p_texto, '')), '\s+', ' ', 'g')));
$$;

-- Todo lo que se busca de un alimento, junto y normalizado
create or replace function public.texto_busqueda_alimento(p_nombre text, p_marca text, p_sinonimos text[])
returns text
language sql
immutable
parallel safe
set search_path = public, extensions, pg_catalog
as $$
  select public.normalizar_texto(
    p_nombre || ' ' || coalesce(p_marca, '') || ' ' || coalesce(array_to_string(p_sinonimos, ' '), ''));
$$;

-- ----------------------------------------------------------
-- 2. Categorías
-- ----------------------------------------------------------
create table if not exists public.categorias_alimento (
  codigo text primary key check (codigo ~ '^[a-z_]+$'),
  nombre text not null unique,
  orden smallint not null
);

insert into public.categorias_alimento (codigo, nombre, orden) values
  ('carnes', 'Carnes', 1),
  ('pescados', 'Pescados y mariscos', 2),
  ('huevos', 'Huevos', 3),
  ('lacteos', 'Lácteos', 4),
  ('cereales', 'Cereales, panes y pastas', 5),
  ('legumbres', 'Legumbres', 6),
  ('verduras', 'Verduras', 7),
  ('frutas', 'Frutas', 8),
  ('grasas', 'Grasas, aceites y frutos secos', 9),
  ('dulces', 'Dulces y azúcares', 10),
  ('bebidas', 'Bebidas', 11),
  ('preparaciones', 'Preparaciones', 12)
on conflict (codigo) do update set nombre = excluded.nombre, orden = excluded.orden;

-- ----------------------------------------------------------
-- 3. Alimentos (valores cada 100 g)
-- ----------------------------------------------------------
create table if not exists public.alimentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  categoria text not null references public.categorias_alimento (codigo),
  coccion text not null check (coccion in ('crudo', 'cocido', 'listo')),
  marca text check (marca is null or char_length(trim(marca)) between 1 and 60),

  kcal numeric(5, 1) not null check (kcal > 0 and kcal <= 900),
  proteinas numeric(4, 1) not null check (proteinas between 0 and 100),
  carbohidratos numeric(4, 1) not null check (carbohidratos between 0 and 100),
  grasas numeric(4, 1) not null check (grasas between 0 and 100),
  constraint alimentos_macros_hasta_100 check (proteinas + carbohidratos + grasas <= 100),

  porcion_g numeric(6, 1) check (porcion_g is null or (porcion_g > 0 and porcion_g <= 2000)),
  porcion_texto text check (porcion_texto is null or char_length(porcion_texto) <= 40),
  unidad_nombre text check (unidad_nombre is null or char_length(trim(unidad_nombre)) between 1 and 20),
  unidad_g numeric(6, 1) check (unidad_g is null or (unidad_g > 0 and unidad_g <= 2000)),
  constraint alimentos_unidad_completa check ((unidad_nombre is null) = (unidad_g is null)),

  sinonimos text[] not null default '{}',

  fuente text not null check (fuente in ('equipo', 'tabla_ar', 'usda', 'off', 'coach', 'alumno')),
  fuente_ref text,                       -- id en la fuente (ej. fdcId de USDA o código de barras)

  estado_revision text not null default 'pendiente'
    check (estado_revision in ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo text,
  creado_por uuid references public.profiles (id) on delete set null,
  revisado_por uuid references public.profiles (id) on delete set null,
  revisado_el timestamptz,
  creado_el timestamptz not null default now(),
  actualizado_el timestamptz not null default now(),

  -- Para buscar y para detectar duplicados (los calcula la base)
  texto_busqueda text generated always as (public.texto_busqueda_alimento(nombre, marca, sinonimos)) stored,
  clave text generated always as (
    public.normalizar_texto(nombre) || '|' || public.normalizar_texto(marca) || '|' || coccion) stored
);

-- Un mismo alimento (nombre + marca + cocción) no puede estar dos veces,
-- salvo que el anterior haya sido rechazado
create unique index if not exists alimentos_clave_unica
  on public.alimentos (clave) where estado_revision <> 'rechazado';
create index if not exists alimentos_busqueda_trgm
  on public.alimentos using gin (texto_busqueda gin_trgm_ops);
create index if not exists alimentos_categoria on public.alimentos (categoria);
create index if not exists alimentos_pendientes on public.alimentos (creado_por) where estado_revision = 'pendiente';

-- ----------------------------------------------------------
-- 4. Controles de calidad
-- ----------------------------------------------------------
-- Las calorías tienen que coincidir con los macros (4, 4 y 9 kcal por gramo).
-- Tolera 20 % o 15 kcal, lo que sea mayor (fibra y redondeos de etiqueta).
-- Se exige a lo que se carga desde la app; la planilla lo avisa pero puede
-- cargar excepciones revisadas (ej. bebidas con alcohol).
create or replace function public.kcal_coinciden(p_kcal numeric, p_p numeric, p_c numeric, p_g numeric)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select abs(4 * p_p + 4 * p_c + 9 * p_g - p_kcal) <= greatest(0.2 * p_kcal, 15);
$$;

-- Quién está cargando: la app (rol authenticated) o el equipo (SQL Editor) y
-- las funciones de revisión (corren como dueño de la base). El navegador no
-- puede cambiar su rol, así que no puede saltearse los controles.
create or replace function public.es_carga_desde_app()
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select current_user in ('authenticated', 'anon');
$$;

create or replace function public.alimentos_antes_de_guardar()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_rol text;
begin
  new.actualizado_el := now();

  if not public.es_carga_desde_app() then
    return new; -- carga del equipo o revisión de un coach
  end if;

  if tg_op = 'INSERT' then
    select role into v_rol from public.profiles where id = auth.uid();
    new.creado_por := auth.uid();
    new.creado_el := now();
    new.fuente := case when v_rol = 'coach' then 'coach' else 'alumno' end;
    new.fuente_ref := null;
  else
    -- Desde la app no se cambia quién lo creó ni su origen
    new.creado_por := old.creado_por;
    new.creado_el := old.creado_el;
    new.fuente := old.fuente;
    new.fuente_ref := old.fuente_ref;
  end if;

  -- Lo cargado desde la app siempre queda para revisar
  new.estado_revision := 'pendiente';
  new.motivo_rechazo := null;
  new.revisado_por := null;
  new.revisado_el := null;

  if not public.kcal_coinciden(new.kcal, new.proteinas, new.carbohidratos, new.grasas) then
    raise exception 'Las calorías no coinciden con los macros. Revisá que los valores sean cada 100 g.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists alimentos_antes_de_guardar on public.alimentos;
create trigger alimentos_antes_de_guardar
  before insert or update on public.alimentos
  for each row execute function public.alimentos_antes_de_guardar();

-- ----------------------------------------------------------
-- 5. Correcciones propuestas ("Editar alimento")
--    Cada fila es la versión completa propuesta, no solo lo que cambia.
-- ----------------------------------------------------------
create table if not exists public.correcciones_alimento (
  id uuid primary key default gen_random_uuid(),
  alimento_id uuid not null references public.alimentos (id) on delete cascade,
  propuesto_por uuid references public.profiles (id) on delete set null,

  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  categoria text not null references public.categorias_alimento (codigo),
  coccion text not null check (coccion in ('crudo', 'cocido', 'listo')),
  marca text check (marca is null or char_length(trim(marca)) between 1 and 60),
  kcal numeric(5, 1) not null check (kcal > 0 and kcal <= 900),
  proteinas numeric(4, 1) not null check (proteinas between 0 and 100),
  carbohidratos numeric(4, 1) not null check (carbohidratos between 0 and 100),
  grasas numeric(4, 1) not null check (grasas between 0 and 100),
  constraint correcciones_macros_hasta_100 check (proteinas + carbohidratos + grasas <= 100),
  porcion_g numeric(6, 1) check (porcion_g is null or (porcion_g > 0 and porcion_g <= 2000)),
  porcion_texto text check (porcion_texto is null or char_length(porcion_texto) <= 40),
  unidad_nombre text check (unidad_nombre is null or char_length(trim(unidad_nombre)) between 1 and 20),
  unidad_g numeric(6, 1) check (unidad_g is null or (unidad_g > 0 and unidad_g <= 2000)),
  constraint correcciones_unidad_completa check ((unidad_nombre is null) = (unidad_g is null)),
  sinonimos text[] not null default '{}',

  nota text check (nota is null or char_length(nota) <= 300),   -- por qué se corrige
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  motivo_rechazo text,
  revisado_por uuid references public.profiles (id) on delete set null,
  revisado_el timestamptz,
  creado_el timestamptz not null default now()
);

create index if not exists correcciones_pendientes
  on public.correcciones_alimento (propuesto_por) where estado = 'pendiente';

create or replace function public.correcciones_antes_de_guardar()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if not public.es_carga_desde_app() then
    return new;
  end if;

  new.propuesto_por := auth.uid();
  new.creado_el := now();
  new.estado := 'pendiente';
  new.motivo_rechazo := null;
  new.revisado_por := null;
  new.revisado_el := null;

  if not exists (select 1 from public.alimentos where id = new.alimento_id and estado_revision = 'aprobado') then
    raise exception 'Solo se pueden proponer correcciones a alimentos aprobados.'
      using errcode = 'check_violation';
  end if;
  if not public.kcal_coinciden(new.kcal, new.proteinas, new.carbohidratos, new.grasas) then
    raise exception 'Las calorías no coinciden con los macros. Revisá que los valores sean cada 100 g.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists correcciones_antes_de_guardar on public.correcciones_alimento;
create trigger correcciones_antes_de_guardar
  before insert on public.correcciones_alimento
  for each row execute function public.correcciones_antes_de_guardar();

-- ----------------------------------------------------------
-- 6. Quién ve y carga qué (RLS)
-- ----------------------------------------------------------
-- Coach del autor de un alimento o corrección (security definer para no
-- depender de lo que el usuario puede ver en profiles)
create or replace function public.es_mi_alumno(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (select 1 from public.profiles where id = p_usuario and coach_id = auth.uid());
$$;

alter table public.categorias_alimento enable row level security;
alter table public.alimentos enable row level security;
alter table public.correcciones_alimento enable row level security;

revoke all on public.categorias_alimento, public.alimentos, public.correcciones_alimento from anon;
grant select on public.categorias_alimento to authenticated;
grant select, insert, update, delete on public.alimentos to authenticated;
grant select, insert, delete on public.correcciones_alimento to authenticated;
revoke update on public.correcciones_alimento from authenticated;

drop policy if exists "Categorías visibles" on public.categorias_alimento;
create policy "Categorías visibles" on public.categorias_alimento
  for select to authenticated using (true);

-- Aprobados: todos. Pendientes y rechazados: su autor y el coach del autor.
drop policy if exists "Ver alimentos" on public.alimentos;
create policy "Ver alimentos" on public.alimentos
  for select to authenticated
  using (
    estado_revision = 'aprobado'
    or creado_por = auth.uid()
    or public.es_mi_alumno(creado_por)
  );

drop policy if exists "Crear alimentos" on public.alimentos;
create policy "Crear alimentos" on public.alimentos
  for insert to authenticated
  with check (creado_por = auth.uid());

-- Desde la app solo se edita lo propio mientras está pendiente
drop policy if exists "Editar alimento pendiente propio" on public.alimentos;
create policy "Editar alimento pendiente propio" on public.alimentos
  for update to authenticated
  using (creado_por = auth.uid() and estado_revision = 'pendiente')
  with check (creado_por = auth.uid());

drop policy if exists "Borrar alimento propio no aprobado" on public.alimentos;
create policy "Borrar alimento propio no aprobado" on public.alimentos
  for delete to authenticated
  using (creado_por = auth.uid() and estado_revision <> 'aprobado');

drop policy if exists "Ver correcciones" on public.correcciones_alimento;
create policy "Ver correcciones" on public.correcciones_alimento
  for select to authenticated
  using (propuesto_por = auth.uid() or public.es_mi_alumno(propuesto_por));

drop policy if exists "Proponer correcciones" on public.correcciones_alimento;
create policy "Proponer correcciones" on public.correcciones_alimento
  for insert to authenticated
  with check (propuesto_por = auth.uid());

drop policy if exists "Borrar corrección pendiente propia" on public.correcciones_alimento;
create policy "Borrar corrección pendiente propia" on public.correcciones_alimento
  for delete to authenticated
  using (propuesto_por = auth.uid() and estado = 'pendiente');

-- ----------------------------------------------------------
-- 7. Revisión (solo coaches: lo propio y lo de sus alumnos)
-- ----------------------------------------------------------
create or replace function public.revisar_alimento(p_alimento_id uuid, p_aprobar boolean, p_motivo text default null)
returns public.alimentos
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_alimento public.alimentos;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'coach') then
    raise exception 'Solo un coach puede revisar alimentos.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_alimento from public.alimentos where id = p_alimento_id for update;
  if not found or not (v_alimento.creado_por = auth.uid() or public.es_mi_alumno(v_alimento.creado_por)) then
    raise exception 'Ese alimento no existe o no lo podés revisar.' using errcode = 'no_data_found';
  end if;
  if v_alimento.estado_revision <> 'pendiente' then
    raise exception 'Ese alimento ya fue revisado.' using errcode = 'check_violation';
  end if;
  if not p_aprobar and nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Para rechazar hay que escribir el motivo.' using errcode = 'check_violation';
  end if;

  update public.alimentos
  set estado_revision = case when p_aprobar then 'aprobado' else 'rechazado' end,
      motivo_rechazo = case when p_aprobar then null else trim(p_motivo) end,
      revisado_por = auth.uid(),
      revisado_el = now()
  where id = p_alimento_id
  returning * into v_alimento;
  return v_alimento;
end;
$$;

create or replace function public.revisar_correccion(p_correccion_id uuid, p_aceptar boolean, p_motivo text default null)
returns public.correcciones_alimento
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_correccion public.correcciones_alimento;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'coach') then
    raise exception 'Solo un coach puede revisar correcciones.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_correccion from public.correcciones_alimento where id = p_correccion_id for update;
  if not found or not (v_correccion.propuesto_por = auth.uid() or public.es_mi_alumno(v_correccion.propuesto_por)) then
    raise exception 'Esa corrección no existe o no la podés revisar.' using errcode = 'no_data_found';
  end if;
  if v_correccion.estado <> 'pendiente' then
    raise exception 'Esa corrección ya fue revisada.' using errcode = 'check_violation';
  end if;
  if not p_aceptar and nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Para rechazar hay que escribir el motivo.' using errcode = 'check_violation';
  end if;

  if p_aceptar then
    update public.alimentos
    set nombre = v_correccion.nombre, categoria = v_correccion.categoria, coccion = v_correccion.coccion,
        marca = v_correccion.marca, kcal = v_correccion.kcal, proteinas = v_correccion.proteinas,
        carbohidratos = v_correccion.carbohidratos, grasas = v_correccion.grasas,
        porcion_g = v_correccion.porcion_g, porcion_texto = v_correccion.porcion_texto,
        unidad_nombre = v_correccion.unidad_nombre, unidad_g = v_correccion.unidad_g,
        sinonimos = v_correccion.sinonimos
    where id = v_correccion.alimento_id;
  end if;

  update public.correcciones_alimento
  set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
      motivo_rechazo = case when p_aceptar then null else trim(p_motivo) end,
      revisado_por = auth.uid(),
      revisado_el = now()
  where id = p_correccion_id
  returning * into v_correccion;
  return v_correccion;
end;
$$;

-- ----------------------------------------------------------
-- 8. Búsqueda
--    Sin tildes ni mayúsculas, por parte del nombre, la marca o un sinónimo,
--    y tolerante a errores de tipeo ("avna" encuentra "avena").
--    Respeta RLS: cada uno ve lo aprobado y lo suyo.
--    El umbral de parecido (0,4) deja pasar errores de una letra sin traer
--    alimentos que no tienen nada que ver.
-- ----------------------------------------------------------
create or replace function public.buscar_alimentos(p_texto text, p_categoria text default null, p_limite int default 20)
returns setof public.alimentos
language sql
stable
set search_path = public, extensions, pg_catalog
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with consulta as (
    select public.normalizar_texto(p_texto) as texto,
           replace(replace(replace(public.normalizar_texto(p_texto), '\', '\\'), '%', '\%'), '_', '\_') as literal
  )
  select a.*
  from public.alimentos a, consulta q
  where char_length(q.texto) >= 2
    and a.estado_revision <> 'rechazado'
    and (p_categoria is null or a.categoria = p_categoria)
    and (a.texto_busqueda like '%' || q.literal || '%' or q.texto <% a.texto_busqueda)
  order by
    (a.texto_busqueda like q.literal || '%') desc,          -- empieza con lo buscado
    word_similarity(q.texto, a.texto_busqueda) desc,         -- más parecido
    (a.estado_revision = 'aprobado') desc,
    a.nombre
  limit least(greatest(coalesce(p_limite, 20), 1), 50);
$$;

-- ----------------------------------------------------------
-- 9. Permisos de las funciones
-- ----------------------------------------------------------
revoke execute on function public.alimentos_antes_de_guardar() from public, anon, authenticated;
revoke execute on function public.correcciones_antes_de_guardar() from public, anon, authenticated;
revoke execute on function public.es_mi_alumno(uuid) from public, anon;
revoke execute on function public.revisar_alimento(uuid, boolean, text) from public, anon;
revoke execute on function public.revisar_correccion(uuid, boolean, text) from public, anon;
revoke execute on function public.buscar_alimentos(text, text, int) from public, anon;
grant execute on function public.es_mi_alumno(uuid) to authenticated;
grant execute on function public.revisar_alimento(uuid, boolean, text) to authenticated;
grant execute on function public.revisar_correccion(uuid, boolean, text) to authenticated;
grant execute on function public.buscar_alimentos(text, text, int) to authenticated;

commit;
