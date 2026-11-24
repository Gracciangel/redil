-- =====================================================================
-- Avisos de la congregación (tabla public.news). Ejecutar en SQL Editor.
-- Idempotente.
--
-- Visibilidad: is_global = true -> público (perfil del tenant y otros tenants
-- cuando corresponda); is_global = false -> solo miembros de la congregación.
-- El tenant no tiene sesión de Supabase Auth: sus RPCs se autorizan con el
-- session_token emitido por login_congregation.
-- =====================================================================

alter table public.news
  add column if not exists is_global boolean not null default false;

-- 1) Listado del tenant: ve TODOS sus avisos, globales y privados -------
create or replace function public.list_tenant_news(p_token uuid)
returns table (
  id           uuid,
  title        text,
  body         text,
  image_url    text,
  published_at timestamptz,
  is_global    boolean
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  return query
  select n.id, n.title, n.body, n.image_url, n.published_at, n.is_global
  from public.news n
  where n.congregation_id = v_cid
  order by n.published_at desc;
end;
$$;

-- 2) Crear aviso -------------------------------------------------------
create or replace function public.create_tenant_news(
  p_token     uuid,
  p_title     text,
  p_body      text,
  p_image_url text,
  p_is_global boolean
)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
  v_id  uuid;
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'El título es obligatorio.';
  end if;

  insert into public.news
    (congregation_id, created_by, title, body, image_url, published_at, is_global)
  values
    (v_cid, null, trim(p_title),
     nullif(trim(coalesce(p_body, '')), ''),
     nullif(trim(coalesce(p_image_url, '')), ''),
     now(), coalesce(p_is_global, false))
  returning id into v_id;

  return v_id;
end;
$$;

-- 3) Editar aviso (solo los propios) -----------------------------------
create or replace function public.update_tenant_news(
  p_token     uuid,
  p_news_id   uuid,
  p_title     text,
  p_body      text,
  p_image_url text,
  p_is_global boolean
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'El título es obligatorio.';
  end if;

  update public.news n
     set title       = trim(p_title),
         body        = nullif(trim(coalesce(p_body, '')), ''),
         image_url   = nullif(trim(coalesce(p_image_url, '')), ''),
         is_global   = coalesce(p_is_global, false)
   where n.id = p_news_id and n.congregation_id = v_cid;

  if not found then
    raise exception 'No encontramos ese aviso.';
  end if;
end;
$$;

-- 4) Borrar aviso (solo los propios) -----------------------------------
create or replace function public.delete_tenant_news(p_token uuid, p_news_id uuid)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  delete from public.news n
  where n.id = p_news_id and n.congregation_id = v_cid;

  if not found then
    raise exception 'No encontramos ese aviso.';
  end if;
end;
$$;

-- 5) Avisos para un miembro: todos los de su congregación --------------
create or replace function public.list_my_news()
returns table (
  id           uuid,
  title        text,
  body         text,
  image_url    text,
  published_at timestamptz,
  is_global    boolean
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid;
begin
  select m.congregation_id into v_cid
  from public.memberships m
  where m.user_id = (select auth.uid())
  limit 1;

  if v_cid is null then
    raise exception 'Todavía no pertenecés a una congregación.';
  end if;

  return query
  select n.id, n.title, n.body, n.image_url, n.published_at, n.is_global
  from public.news n
  where n.congregation_id = v_cid
  order by n.published_at desc
  limit 50;
end;
$$;

-- 6) Avisos públicos de una congregación: SOLO is_global = true --------
create or replace function public.list_public_news(p_congregation_id uuid)
returns table (
  id           uuid,
  title        text,
  body         text,
  image_url    text,
  published_at timestamptz
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  -- Sin filtrar la existencia del tenant: si no compartió, devuelve 0 filas.
  if not exists (
    select 1 from public.congregations c
    where c.id = p_congregation_id
      and coalesce(c.vify, false)
      and coalesce(c.share_announcements, false)
  ) then
    return;
  end if;

  return query
  select n.id, n.title, n.body, n.image_url, n.published_at
  from public.news n
  where n.congregation_id = p_congregation_id and n.is_global
  order by n.published_at desc
  limit 50;
end;
$$;

-- 7) Permisos ----------------------------------------------------------
revoke execute on function public.list_tenant_news(uuid) from public;
revoke execute on function public.create_tenant_news(uuid, text, text, text, boolean) from public;
revoke execute on function public.update_tenant_news(uuid, uuid, text, text, text, boolean) from public;
revoke execute on function public.delete_tenant_news(uuid, uuid) from public;
revoke execute on function public.list_my_news() from public, anon;
revoke execute on function public.list_public_news(uuid) from public;

grant execute on function public.list_tenant_news(uuid) to anon, authenticated;
grant execute on function public.create_tenant_news(uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.update_tenant_news(uuid, uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.delete_tenant_news(uuid, uuid) to anon, authenticated;
grant execute on function public.list_my_news() to authenticated;
-- Se mantiene anon porque el front lo llama sin sesión; la validación
-- vify + share_announcements va adentro de la función.
grant execute on function public.list_public_news(uuid) to anon, authenticated;
