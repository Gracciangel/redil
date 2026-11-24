-- Redil · Baja física de miembros y de la congregación completa
-- Ejecutar DESPUÉS de tenantAdmin.sql (usa tenant_from_token).
-- Idempotente: create or replace + revoke/grant explícitos.
--
-- ADVERTENCIA: AMBAS FUNCIONES BORRAN auth.users. Es IRREVERSIBLE.
-- Por eso exigen una frase de confirmación exacta, además del token vigente.
-- El token de congregación es el único autorizado: no hay auth.uid() en este
-- tipo de sesión. La UI lo llama desde «Dejar Redil» (perfil del tenant) y
-- desde el perfil de un miembro (baja individual).

create or replace function public.delete_tenant_member(
  p_token uuid, p_user_id uuid, p_confirmation text
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid;
  v_membership uuid;
begin
  if p_confirmation is distinct from 'ELIMINAR MIEMBRO' then
    raise exception 'Confirmación incorrecta. Se requiere «ELIMINAR MIEMBRO».';
  end if;

  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  select id into v_membership
  from public.memberships
  where congregation_id = v_cid and user_id = p_user_id;
  if v_membership is null then
    raise exception 'Esa persona no pertenece a esta congregación.';
  end if;

  -- Contenido que esa persona creó DENTRO de este tenant.
  delete from public.posts  where congregation_id = v_cid and author_id = p_user_id;
  delete from public.news   where congregation_id = v_cid and created_by = p_user_id;
  delete from public.events where congregation_id = v_cid and created_by = p_user_id;

  -- La membresía arrastra sus ministerios por FK compuesta.
  delete from public.ministry_members where membership_id = v_membership;
  delete from public.memberships where id = v_membership;

  -- Perfil global y cuenta Auth: borrado físico e irreversible.
  delete from public.member_contacts where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

create or replace function public.delete_congregation(
  p_token uuid, p_confirmation text
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid  uuid;
  v_user uuid;
  v_users uuid[];
begin
  if p_confirmation is distinct from 'DEJAR REDIL' then
    raise exception 'Confirmación incorrecta. Se requiere «DEJAR REDIL».';
  end if;

  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  -- Materializo los IDs antes: borrar profiles dispara cascades sobre
  -- memberships, así que el loop no debe depender del cursor de esa tabla.
  select array_agg(user_id) into v_users
  from public.memberships where congregation_id = v_cid;

  foreach v_user in array coalesce(v_users, '{}'::uuid[]) loop
    delete from public.member_contacts where user_id = v_user;
    delete from public.profiles where id = v_user;
    delete from auth.users where id = v_user;
  end loop;

  -- El cascade de congregations borra el resto: sesiones, ministerios,
  -- grupos, canciones, transposiciones, eventos, avisos y publicaciones.
  delete from public.tenant_sessions where congregation_id = v_cid;
  delete from public.congregations where id = v_cid;
end;
$$;

revoke execute on function public.delete_tenant_member(uuid, uuid, text) from public;
revoke execute on function public.delete_congregation(uuid, text) from public;

grant execute on function public.delete_tenant_member(uuid, uuid, text) to anon, authenticated;
grant execute on function public.delete_congregation(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
