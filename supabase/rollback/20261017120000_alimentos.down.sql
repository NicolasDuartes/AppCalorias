-- ==========================================================
-- REVERSIÓN de 20261017120000_alimentos.sql
--
-- Borra la base de alimentos: categorías, alimentos, correcciones y sus
-- funciones. ATENCIÓN: se pierden los alimentos cargados. Si hace falta
-- conservarlos, antes de correr esto:
--   create table public.alimentos_backup as select * from public.alimentos;
--
-- Las extensiones unaccent y pg_trgm quedan instaladas (no molestan y
-- otras partes de la base podrían usarlas).
-- ==========================================================

begin;

drop function if exists public.buscar_alimentos(text, text, int);
drop function if exists public.revisar_correccion(uuid, boolean, text);
drop function if exists public.revisar_alimento(uuid, boolean, text);

drop table if exists public.correcciones_alimento;
drop table if exists public.alimentos;
drop table if exists public.categorias_alimento;

drop function if exists public.correcciones_antes_de_guardar();
drop function if exists public.alimentos_antes_de_guardar();
drop function if exists public.es_mi_alumno(uuid);
drop function if exists public.es_carga_desde_app();
drop function if exists public.kcal_coinciden(numeric, numeric, numeric, numeric);
drop function if exists public.texto_busqueda_alimento(text, text, text[]);
drop function if exists public.normalizar_texto(text);

commit;
