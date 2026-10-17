-- ==========================================================
-- Revisión de la carga de PRUEBA (prueba.alimentos)
--
-- Cada consulta muestra una cosa a revisar. En el SQL Editor de Supabase,
-- seleccionar una consulta y Run (o correr todo y mirar cada resultado).
-- No cambia nada.
-- ==========================================================

-- 1. Cuántos alimentos hay por categoría y por fuente
select categoria, fuente, count(*) as alimentos
from prueba.alimentos
group by categoria, fuente
order by categoria, fuente;

-- 2. Calorías que no coinciden con los macros (4·P + 4·C + 9·G, margen 20 % o 15 kcal).
--    Son normales en bebidas con alcohol o alimentos con mucha fibra; el resto conviene revisarlo.
select nombre, coccion, kcal, round(4 * proteinas + 4 * carbohidratos + 9 * grasas) as kcal_segun_macros, fuente_ref
from prueba.alimentos
where abs(4 * proteinas + 4 * carbohidratos + 9 * grasas - kcal) > greatest(0.2 * kcal, 15)
order by nombre;

-- 3. Posibles duplicados: nombres muy parecidos con la misma cocción
select a.nombre, b.nombre as parecido_a, a.coccion,
       round(extensions.similarity(a.texto_busqueda, b.texto_busqueda)::numeric, 2) as parecido
from prueba.alimentos a
join prueba.alimentos b on a.id < b.id and a.coccion = b.coccion
where extensions.similarity(prueba.normalizar_texto(a.nombre), prueba.normalizar_texto(b.nombre)) > 0.6
order by parecido desc;

-- 4. Valores llamativos para revisar a mano: muy pocas o muchísimas calorías
(select 'menos calorías' as grupo, nombre, coccion, kcal, proteinas, carbohidratos, grasas
 from prueba.alimentos order by kcal limit 5)
union all
(select 'más calorías', nombre, coccion, kcal, proteinas, carbohidratos, grasas
 from prueba.alimentos order by kcal desc limit 5);

-- 5. Alimentos que se cuentan por unidad: ¿el peso de 1 unidad es razonable?
select nombre, coccion, unidad_nombre, unidad_g
from prueba.alimentos
where unidad_g is not null
order by nombre;

-- 6. Búsqueda: cambiar el texto y correr para probar cómo encuentra la app
select * from prueba.buscar('pollo');
select * from prueba.buscar('platano');   -- sin tilde
select * from prueba.buscar('aguacate');  -- por sinónimo
