-- RPCs para asociar un usuario (miembro) a una congregación mediante código/QR.
-- Requiere que el usuario esté autenticado en Supabase (auth.uid()) y tenga perfil en public.profiles.
-- Mantener alineado con el esquema (memberships, invitation_code).

-- Vista previa de la congregación por código de invitación (pantalla "¿Querés unirte a...?").
drop function if exists public.preview_congregation(text);

create or replace function public.preview_congregation(p_code text)
returns table (id uuid, name text, city text, country text, photo_url text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.name, c.city, c.country, c.photo_url
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;
$$;

-- Une al usuario autenticado a la congregación indicada por el código de invitación.
-- Regla actual: 1 usuario = 1 congregación (se rechaza si ya pertenece a otra).
drop function if exists public.join_congregation(text);

create or replace function public.join_congregation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_congregation_id uuid;
  v_existing_congregation_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select c.id into v_congregation_id
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;

  if v_congregation_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  -- Garantiza que el miembro pertenezca a una sola congregación.
  select m.congregation_id into v_existing_congregation_id
  from public.memberships m
  where m.user_id = v_uid
  limit 1;

  if v_existing_congregation_id is not null then
    if v_existing_congregation_id = v_congregation_id then
      return v_congregation_id; -- ya pertenece a esta congregación
    end if;
    raise exception 'El usuario ya pertenece a otra congregación';
  end if;

  insert into public.memberships (congregation_id, user_id, role)
  values (v_congregation_id, v_uid, 'member');

  return v_congregation_id;
end;
$$;

revoke execute on function public.preview_congregation(text) from public, anon;
revoke execute on function public.join_congregation(text) from public, anon;
grant execute on function public.preview_congregation(text) to authenticated;
grant execute on function public.join_congregation(text) to authenticated;

notify pgrst, 'reload schema';
