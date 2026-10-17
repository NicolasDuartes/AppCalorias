-- ==========================================================
-- Tabla de PRUEBA para revisar la primera carga de alimentos
--
-- Crea el esquema "prueba" con una tabla alimentos con las mismas columnas
-- y controles que la definitiva (migración 20261017120000_alimentos.sql),
-- pero aislada: la app no la ve (la API de Supabase no expone este esquema)
-- y no toca nada de lo que ya existe.
--
-- Flujo: correr esto → pegar la carga (planilla_a_sql.py --prueba) →
-- revisar con prueba_verificar.sql → si está bien, aplicar la migración
-- definitiva y correr prueba_pasar_y_borrar.sql.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run.
-- ==========================================================

begin;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists prueba;
revoke all on schema prueba from public, anon, authenticated;
set local search_path = prueba, public, extensions;

create or replace function prueba.normalizar_texto(p_texto text)
returns text
language sql
immutable
set search_path = public, extensions, pg_catalog
as $$
  select lower(trim(regexp_replace(unaccent('unaccent'::regdictionary, coalesce(p_texto, '')), '\s+', ' ', 'g')));
$$;

create or replace function prueba.texto_busqueda_alimento(p_nombre text, p_marca text, p_sinonimos text[])
returns text
language sql
immutable
set search_path = prueba, pg_catalog
as $$
  select prueba.normalizar_texto(
    p_nombre || ' ' || coalesce(p_marca, '') || ' ' || coalesce(array_to_string(p_sinonimos, ' '), ''));
$$;

create table if not exists prueba.alimentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) between 2 and 80),
  categoria text not null check (categoria in ('carnes', 'pescados', 'huevos', 'lacteos', 'cereales', 'legumbres',
                                               'verduras', 'frutas', 'grasas', 'dulces', 'bebidas', 'preparaciones')),
  coccion text not null check (coccion in ('crudo', 'cocido', 'listo')),
  marca text check (marca is null or char_length(trim(marca)) between 1 and 60),
  kcal numeric(5, 1) not null check (kcal > 0 and kcal <= 900),
  proteinas numeric(4, 1) not null check (proteinas between 0 and 100),
  carbohidratos numeric(4, 1) not null check (carbohidratos between 0 and 100),
  grasas numeric(4, 1) not null check (grasas between 0 and 100),
  check (proteinas + carbohidratos + grasas <= 100),
  porcion_g numeric(6, 1) check (porcion_g is null or (porcion_g > 0 and porcion_g <= 2000)),
  porcion_texto text check (porcion_texto is null or char_length(porcion_texto) <= 40),
  unidad_nombre text check (unidad_nombre is null or char_length(trim(unidad_nombre)) between 1 and 20),
  unidad_g numeric(6, 1) check (unidad_g is null or (unidad_g > 0 and unidad_g <= 2000)),
  check ((unidad_nombre is null) = (unidad_g is null)),
  sinonimos text[] not null default '{}',
  fuente text not null check (fuente in ('equipo', 'tabla_ar', 'usda', 'off')),
  fuente_ref text,
  cargado_el timestamptz not null default now(),
  texto_busqueda text generated always as (prueba.texto_busqueda_alimento(nombre, marca, sinonimos)) stored,
  clave text generated always as (
    prueba.normalizar_texto(nombre) || '|' || prueba.normalizar_texto(marca) || '|' || coccion) stored unique
);

create index if not exists alimentos_busqueda_trgm on prueba.alimentos using gin (texto_busqueda gin_trgm_ops);

-- La misma búsqueda que tendrá la app, para probarla
create or replace function prueba.buscar(p_texto text, p_limite int default 10)
returns table (nombre text, coccion text, marca text, kcal numeric, proteinas numeric, carbohidratos numeric,
               grasas numeric, parecido real)
language sql
stable
set search_path = prueba, extensions, pg_catalog
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with q as (
    select prueba.normalizar_texto(p_texto) as texto,
           replace(replace(replace(prueba.normalizar_texto(p_texto), '\', '\\'), '%', '\%'), '_', '\_') as literal
  )
  select a.nombre, a.coccion, a.marca, a.kcal, a.proteinas, a.carbohidratos, a.grasas,
         word_similarity(q.texto, a.texto_busqueda)
  from prueba.alimentos a, q
  where char_length(q.texto) >= 2
    and (a.texto_busqueda like '%' || q.literal || '%' or q.texto <% a.texto_busqueda)
  order by (a.texto_busqueda like q.literal || '%') desc, word_similarity(q.texto, a.texto_busqueda) desc, a.nombre
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

commit;
