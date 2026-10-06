-- ==========================================================
-- Sexo y fecha de nacimiento al crear la cuenta
--
-- El alta (handle_new_user) guarda también sexo y fecha_nacimiento que el
-- formulario manda en options.data, solo para alumnos. Si llegan vacíos o
-- inválidos se guardan vacíos: nunca hacen fallar el registro.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ==========================================================

begin;

-- Convierte el texto del registro en fecha de nacimiento válida, o null
create or replace function public.fecha_nacimiento_valida(p_texto text)
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  v_fecha date;
begin
  if p_texto is null or p_texto !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  v_fecha := p_texto::date;
  if v_fecha < date '1900-01-01' then
    return null;
  end if;
  return v_fecha;
exception when others then
  return null; -- fecha imposible, como 2026-02-31
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol text := case when v_datos ->> 'role' = 'coach' then 'coach' else 'alumno' end;
  v_sexo text;
  v_nacimiento date;
begin
  if v_rol = 'alumno' then
    v_sexo := case when v_datos ->> 'sexo' in ('M', 'F') then v_datos ->> 'sexo' end;
    v_nacimiento := public.fecha_nacimiento_valida(v_datos ->> 'fecha_nacimiento');
    -- Sin fechas futuras
    if v_nacimiento > current_date then
      v_nacimiento := null;
    end if;
  end if;

  insert into public.profiles (id, full_name, username, email, role, client_code, sexo, fecha_nacimiento)
  values (
    new.id,
    coalesce(v_datos ->> 'full_name', ''),
    nullif(lower(trim(v_datos ->> 'username')), ''),
    new.email,
    v_rol,
    case when v_rol = 'alumno' then public.generar_codigo_cliente() end,
    v_sexo,
    v_nacimiento
  );
  return new;
end;
$$;

revoke execute on function public.fecha_nacimiento_valida(text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
