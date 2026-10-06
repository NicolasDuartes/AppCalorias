-- ==========================================================
-- REVERSIÓN de 20261006130000_datos_personales_en_registro.sql
--
-- El alta vuelve a no guardar sexo ni fecha de nacimiento (como en
-- 20261005120000_cuentas_y_vinculo.sql). Los datos ya guardados no se borran.
-- ==========================================================

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'alumno' end;
begin
  insert into public.profiles (id, full_name, username, email, role, client_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), ''),
    new.email,
    v_rol,
    case when v_rol = 'alumno' then public.generar_codigo_cliente() end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop function if exists public.fecha_nacimiento_valida(text);

commit;
