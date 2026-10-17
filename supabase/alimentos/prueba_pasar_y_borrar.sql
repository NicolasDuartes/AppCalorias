-- ==========================================================
-- Pasar la carga de PRUEBA a la tabla definitiva y borrar la prueba
--
-- Correr SOLO cuando:
--   1. la prueba ya se revisó con prueba_verificar.sql, y
--   2. la migración definitiva (20261017120000_alimentos.sql) ya está aplicada.
--
-- Los alimentos pasan aprobados. Si alguno ya existía en la definitiva
-- (mismo nombre, marca y cocción) se actualiza en vez de duplicarse.
-- Corre en una transacción: si algo falla, no se pasa nada y la prueba queda.
-- ==========================================================

begin;

insert into public.alimentos
  (nombre, categoria, coccion, marca, kcal, proteinas, carbohidratos, grasas, porcion_g, porcion_texto,
   unidad_nombre, unidad_g, sinonimos, fuente, fuente_ref, estado_revision)
select nombre, categoria, coccion, marca, kcal, proteinas, carbohidratos, grasas, porcion_g, porcion_texto,
       unidad_nombre, unidad_g, sinonimos, fuente, fuente_ref, 'aprobado'
from prueba.alimentos
on conflict (clave) where estado_revision <> 'rechazado' do update set
  categoria = excluded.categoria, marca = excluded.marca, kcal = excluded.kcal,
  proteinas = excluded.proteinas, carbohidratos = excluded.carbohidratos, grasas = excluded.grasas,
  porcion_g = excluded.porcion_g, porcion_texto = excluded.porcion_texto,
  unidad_nombre = excluded.unidad_nombre, unidad_g = excluded.unidad_g, sinonimos = excluded.sinonimos,
  fuente = excluded.fuente, fuente_ref = excluded.fuente_ref, estado_revision = 'aprobado';

-- Tienen que coincidir: los de la prueba tienen que estar todos en la definitiva
select (select count(*) from prueba.alimentos) as en_prueba,
       (select count(*) from public.alimentos a
        where exists (select 1 from prueba.alimentos p where p.clave = a.clave)) as pasados;

drop schema prueba cascade;

commit;
