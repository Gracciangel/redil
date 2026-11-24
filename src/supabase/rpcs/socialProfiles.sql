-- =====================================================================
-- Perfiles, avatares y portada — red social interna y externa.
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- Reglas (rulesView.md):
--   * Un miembro ve perfiles de otros miembros de SU tenant (siempre).
--   * Ver perfiles de OTROS tenants requiere que AMBOS estén verificados
--     (vify = true). Decisión ajustable si se quiere solo el visitante.
--   * Los anuncios de otro tenant solo se comparten si ese tenant lo habilitó
--     (share_announcements = true). Decisión: flag por congregación.
--   * La imagen física va a un bucket (lo dejamos para lo último). Hoy se
--     siguen guardando URLs en photo_url / banner_url.
-- =====================================================================

-- 1) Flag de anuncios compartidos --------------------------------------
alter table public.congregations
  add column if not exists share_announcements boolean not null default false;

-- 2) Contexto social del miembro autenticado ---------------------------
-- El store del tenant ya tiene id/slug/vify; el miembro necesita este RPC.
create or replace function public.get_my_social_context()
returns table (
  congregation_id uuid,
  name            text,
  slug            text,
  vify            boolean,
  role            text
)
language sql
stable
security definer
set search_path = '', extensions
as $$
  select m.congregation_id, c.name, c.slug, c.vify, m.role::text
  from public.memberships m
  join public.congregations c on c.id = m.congregation_id
  where m.user_id = (select auth.uid())
  limit 1;
$$;

-- 3) Helper: ¿se puede cruzar entre estos dos tenants? -----------------
create or replace function public.can_cross_tenants(p_from uuid, p_to uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p_from <> p_to
     and exists (select 1 from public.congregations where id = p_from and vify)
     and exists (select 1 from public.congregations where id = p_to and vify);
$$;

-- 4) Perfiles de una congregación (SOLO uso interno, sin grant) ---------
create or replace function public._profiles_of_congregation_data(p_cid uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id,
         p.name,
         p.surname,
         p.photo_url,
         p.bio,
         m.role::text,
         coalesce((
           select array_agg(mi.name order by mi.name)
           from public.ministry_members mm
           join public.ministries mi on mi.id = mm.ministry_id
           where mm.membership_id = m.id and mi.is_group = false
         ), '{}'::text[]) as ministries,
         coalesce((
           select array_agg(mi.name order by mi.name)
           from public.ministry_members mm
           join public.ministries mi on mi.id = mm.ministry_id
           where mm.membership_id = m.id and mi.is_group = true
         ), '{}'::text[]) as groups,
         (select count(*)
          from public.ministry_members mm
          where mm.membership_id = m.id and mm.ministry_role = 'leader')::bigint as led_count
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.congregation_id = p_cid
  order by p.name;
$$;

-- 4b) Wrapper público: exige auth.uid() y valida alcance antes de devolver datos.
create or replace function public.profiles_of_congregation(p_cid uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_from uuid;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión como miembro para ver perfiles.';
  end if;

  if public.is_member(p_cid) then
    return query select * from public._profiles_of_congregation_data(p_cid);
    return;
  end if;

  select m.congregation_id into v_from
  from public.memberships m
  where m.user_id = v_uid
  limit 1;

  if v_from is null then
    raise exception 'Todavía no pertenecés a una congregación.';
  end if;

  if not public.can_cross_tenants(v_from, p_cid) then
    raise exception 'No tenés permiso para ver los perfiles de esa congregación.';
  end if;

  return query select * from public._profiles_of_congregation_data(p_cid);
end;
$$;

-- 5) Perfiles de la propia congregación (tenant) -----------------------
create or replace function public.list_tenant_profiles(p_token uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  return query select * from public._profiles_of_congregation_data(v_cid);
end;
$$;

-- 6) Perfiles de la congregación del miembro (auth.uid()) --------------
create or replace function public.list_my_tenant_profiles()
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language plpgsql
stable
security definer
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

  return query select * from public._profiles_of_congregation_data(v_cid);
end;
$$;

-- 7) Congregaciones verificadas (directorio externo) -------------------
create or replace function public.list_verified_congregations(p_token uuid)
returns table (
  id          uuid,
  name        text,
  slug        text,
  bio         text,
  photo_url   text,
  banner_url  text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if not exists (select 1 from public.congregations c where c.id = v_cid and c.vify) then
    raise exception 'Tu congregación debe estar verificada para explorar otras congregaciones.';
  end if;

  return query
  select c.id, c.name, c.slug, c.bio, c.photo_url, c.banner_url
  from public.congregations c
  where c.vify and c.id <> v_cid
  order by c.name;
end;
$$;

-- 7b) Congregaciones verificadas para un miembro ------------------------
create or replace function public.list_verified_congregations_for_member()
returns table (
  id          uuid,
  name        text,
  slug        text,
  bio         text,
  photo_url   text,
  banner_url  text
)
language plpgsql
stable
security definer
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
  if not exists (select 1 from public.congregations c where c.id = v_cid and c.vify) then
    raise exception 'Tu congregación debe estar verificada para explorar otras congregaciones.';
  end if;

  return query
  select c.id, c.name, c.slug, c.bio, c.photo_url, c.banner_url
  from public.congregations c
  where c.vify and c.id <> v_cid
  order by c.name;
end;
$$;

-- 7c) Perfiles de miembros de OTRO tenant (ambos verificados) ----------
create or replace function public.list_external_profiles(p_token uuid, p_congregation_id uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid := public.tenant_from_token(p_token);
begin
  if v_from is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if not public.can_cross_tenants(v_from, p_congregation_id) then
    raise exception 'La visibilidad entre congregaciones requiere que ambas estén verificadas.';
  end if;

  return query select * from public._profiles_of_congregation_data(p_congregation_id);
end;
$$;

-- 7d) Versión para miembros (auth.uid()) de perfiles/anuncios externos --
create or replace function public.list_external_profiles_for_member(p_congregation_id uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  photo_url  text,
  bio        text,
  role       text,
  ministries text[],
  groups     text[],
  led_count  bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid;
begin
  select m.congregation_id into v_from
  from public.memberships m where m.user_id = (select auth.uid()) limit 1;
  if v_from is null then
    raise exception 'Todavía no pertenecés a una congregación.';
  end if;
  if not public.can_cross_tenants(v_from, p_congregation_id) then
    raise exception 'La visibilidad entre congregaciones requiere que ambas estén verificadas.';
  end if;

  return query select * from public._profiles_of_congregation_data(p_congregation_id);
end;
$$;

create or replace function public.list_shared_announcements_for_member(p_congregation_id uuid)
returns table (
  id           uuid,
  title        text,
  body         text,
  image_url    text,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid;
begin
  select m.congregation_id into v_from
  from public.memberships m where m.user_id = (select auth.uid()) limit 1;
  if v_from is null then
    raise exception 'Todavía no pertenecés a una congregación.';
  end if;
  if not public.can_cross_tenants(v_from, p_congregation_id) then
    raise exception 'La visibilidad entre congregaciones requiere que ambas estén verificadas.';
  end if;
  if not exists (
    select 1 from public.congregations c
    where c.id = p_congregation_id and c.share_announcements
  ) then
    return;
  end if;

  return query
  select n.id, n.title, n.body, n.image_url, n.published_at
  from public.news n
  where n.congregation_id = p_congregation_id
    and n.is_global
  order by n.published_at desc
  limit 50;
end;
$$;

-- 8) Perfil público de otra congregación (por slug) --------------------
create or replace function public.get_public_tenant_profile(p_token uuid, p_slug text)
returns table (
  id          uuid,
  name        text,
  slug        text,
  bio         text,
  photo_url   text,
  banner_url  text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid := public.tenant_from_token(p_token);
  v_to   uuid;
begin
  if v_from is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  select c.id into v_to from public.congregations c where c.slug = p_slug;
  if v_to is null then
    raise exception 'No encontramos esa congregación.';
  end if;
  if not public.can_cross_tenants(v_from, v_to) then
    raise exception 'La visibilidad entre congregaciones requiere que ambas estén verificadas.';
  end if;

  return query
  select c.id, c.name, c.slug, c.bio, c.photo_url, c.banner_url
  from public.congregations c where c.id = v_to;
end;
$$;

-- 9) Anuncios compartidos por otra congregación ------------------------
create or replace function public.list_shared_announcements(p_token uuid, p_congregation_id uuid)
returns table (
  id           uuid,
  title        text,
  body         text,
  image_url    text,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid := public.tenant_from_token(p_token);
begin
  if v_from is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if not public.can_cross_tenants(v_from, p_congregation_id) then
    raise exception 'La visibilidad entre congregaciones requiere que ambas estén verificadas.';
  end if;
  if not exists (
    select 1 from public.congregations c
    where c.id = p_congregation_id and c.share_announcements
  ) then
    return;
  end if;

  return query
  select n.id, n.title, n.body, n.image_url, n.published_at
  from public.news n
  where n.congregation_id = p_congregation_id
    and n.is_global
  order by n.published_at desc
  limit 50;
end;
$$;

-- 10) Permisos (el tenant usa el rol anon + token) --------------------
-- Ojo: `revoke from public` NO borra grants explícitos viejos de `anon`.
-- Las funciones sin sesión de usuario (token de tenant) conservan anon a propósito.
revoke execute on function public.get_my_social_context() from public, anon;
revoke execute on function public.can_cross_tenants(uuid, uuid) from public, anon;
revoke execute on function public._profiles_of_congregation_data(uuid) from public, anon, authenticated;
revoke execute on function public.profiles_of_congregation(uuid) from public, anon;
revoke execute on function public.list_tenant_profiles(uuid) from public;
revoke execute on function public.list_my_tenant_profiles() from public, anon;
revoke execute on function public.list_verified_congregations(uuid) from public;
revoke execute on function public.list_verified_congregations_for_member() from public, anon;
revoke execute on function public.list_external_profiles(uuid, uuid) from public;
revoke execute on function public.list_external_profiles_for_member(uuid) from public, anon;
revoke execute on function public.list_shared_announcements_for_member(uuid) from public, anon;
revoke execute on function public.get_public_tenant_profile(uuid, text) from public;
revoke execute on function public.list_shared_announcements(uuid, uuid) from public;

grant execute on function public.get_my_social_context() to authenticated;
grant execute on function public.can_cross_tenants(uuid, uuid) to authenticated;
grant execute on function public.profiles_of_congregation(uuid) to authenticated;
grant execute on function public.list_tenant_profiles(uuid) to anon, authenticated;
grant execute on function public.list_my_tenant_profiles() to authenticated;
grant execute on function public.list_verified_congregations(uuid) to anon, authenticated;
grant execute on function public.list_verified_congregations_for_member() to authenticated;
grant execute on function public.list_external_profiles(uuid, uuid) to anon, authenticated;
grant execute on function public.list_external_profiles_for_member(uuid) to authenticated;
grant execute on function public.list_shared_announcements_for_member(uuid) to authenticated;
grant execute on function public.get_public_tenant_profile(uuid, text) to anon, authenticated;
grant execute on function public.list_shared_announcements(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
