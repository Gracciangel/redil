-- =====================================================================
-- Administración del tenant + sesión de tenant.
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- El login de congregación es un RPC con password y NO crea sesión de
-- Supabase Auth, así que auth.uid() es null. Para que los RPCs del tenant
-- sepan quién llama, login_congregation emite un token opaco que el front
-- guarda y envía en cada llamada.
--
-- IMPORTANTE: este archivo REEMPLAZA login_congregation con una versión que
-- devuelve `session_token` y los datos de foto/banner/bio.
-- =====================================================================

-- 0) Columnas que faltaban para Ajustes ---------------------------------
alter table public.profiles      add column if not exists bio text;
alter table public.congregations add column if not exists bio text;

-- 1) Sesiones de tenant --------------------------------------------------
create table if not exists public.tenant_sessions (
  token           uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references public.congregations (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '12 hours'
);
create index if not exists tenant_sessions_congregation_idx
  on public.tenant_sessions (congregation_id);
create unique index if not exists congregations_admin_email_lower_key
  on public.congregations (lower(admin_email)) where admin_email is not null;
alter table public.tenant_sessions enable row level security;
-- Sin políticas RLS: solo se accede desde funciones security definer.

-- 2) Login de congregación (reemplaza la versión anterior) -------------
create or replace function public.login_congregation(
  p_admin_email text,
  p_password    text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row    public.congregations%rowtype;
  v_token  uuid;
  v_expires timestamptz;
begin
  if coalesce(trim(p_admin_email), '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'Email y contraseña son obligatorios.');
  end if;

  select * into v_row
  from public.congregations c
  where lower(c.admin_email) = lower(trim(p_admin_email))
  limit 1;

  if not found or v_row.password_hash is null then
    return jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;

  if v_row.password_hash <> extensions.crypt(p_password, v_row.password_hash) then
    return jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;

  if coalesce(v_row.vify, false) = false then
    return jsonb_build_object(
      'ok', false,
      'error', 'La congregación aún no está validada. No puede iniciar sesión hasta ser verificada.',
      'vify', false,
      'congregation_id', v_row.id
    );
  end if;

  insert into public.tenant_sessions (congregation_id) values (v_row.id)
  returning token, expires_at into v_token, v_expires;

  return jsonb_build_object(
    'ok', true,
    'vify', true,
    'session_token', v_token,
    'expires_at', v_expires,
    'congregation', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'slug', v_row.slug,
      'city', v_row.city,
      'country', v_row.country,
      'invitation_code', v_row.invitation_code,
      'admin_email', v_row.admin_email,
      'photo_url', v_row.photo_url,
      'banner_url', v_row.banner_url,
      'bio', v_row.bio
    )
  );
end;
$$;

-- 3) Helper: congregación asociada a un token vigente -------------------
create or replace function public.tenant_from_token(p_token uuid)
returns uuid
language sql stable security definer
set search_path = public, extensions
as $$
  select ts.congregation_id
  from public.tenant_sessions ts
  where ts.token = p_token and ts.expires_at > now()
  limit 1;
$$;

-- 4) Listado de miembros del tenant -------------------------------------
create or replace function public.list_congregation_members(p_token uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  email      text,
  photo_url  text,
  phone      text,
  role       text,
  joined_at  timestamptz
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
  select m.user_id,
         p.name,
         p.surname,
         u.email::text, -- auth.users.email es varchar(255), no text
         p.photo_url,
         mc.phone,
         m.role::text,
         m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  left join public.member_contacts mc on mc.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.congregation_id = v_cid
  order by m.created_at desc;
end;
$$;

-- 5) Ministerios y grupos ------------------------------------------------
create or replace function public.list_tenant_ministries(p_token uuid)
returns table (
  id           uuid,
  name         text,
  is_group     boolean,
  icon         text,
  member_count bigint
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
  select mi.id, mi.name, mi.is_group, mi.icon, count(mm.id)
  from public.ministries mi
  left join public.ministry_members mm on mm.ministry_id = mi.id
  where mi.congregation_id = v_cid
  group by mi.id
  order by mi.is_group, mi.name;
end;
$$;

create or replace function public.create_tenant_ministry(
  p_token uuid, p_name text, p_is_group boolean default false
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
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre es obligatorio.';
  end if;

  insert into public.ministries (congregation_id, name, is_group)
  values (v_cid, trim(p_name), coalesce(p_is_group, false))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_tenant_ministry(p_token uuid, p_ministry_id uuid)
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

  delete from public.ministries
  where id = p_ministry_id and congregation_id = v_cid;

  if not found then
    raise exception 'Ese ministerio o grupo no pertenece a tu congregación.';
  end if;
end;
$$;

-- 6) Asignación de miembros a ministerios/grupos ------------------------
create or replace function public.assign_member_to_ministry(
  p_token uuid, p_ministry_id uuid, p_user_id uuid
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid   uuid := public.tenant_from_token(p_token);
  v_mem   uuid;
  v_check uuid;
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  select id into v_check
  from public.ministries
  where id = p_ministry_id and congregation_id = v_cid;
  if v_check is null then
    raise exception 'Ese ministerio o grupo no pertenece a tu congregación.';
  end if;

  select id into v_mem
  from public.memberships
  where congregation_id = v_cid and user_id = p_user_id;
  if v_mem is null then
    raise exception 'Ese miembro no pertenece a tu congregación.';
  end if;

  insert into public.ministry_members (congregation_id, ministry_id, membership_id)
  values (v_cid, p_ministry_id, v_mem)
  on conflict (ministry_id, membership_id) do nothing;
end;
$$;

create or replace function public.unassign_member_from_ministry(
  p_token uuid, p_ministry_id uuid, p_user_id uuid
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
  v_mem uuid;
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  select id into v_mem
  from public.memberships
  where congregation_id = v_cid and user_id = p_user_id;
  if v_mem is null then
    raise exception 'Ese miembro no pertenece a tu congregación.';
  end if;

  delete from public.ministry_members
  where congregation_id = v_cid and ministry_id = p_ministry_id and membership_id = v_mem;
end;
$$;

-- 7) Roles (R6: admin / leader / member) --------------------------------
create or replace function public.update_member_role(
  p_token uuid, p_user_id uuid, p_role text
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
  if p_role not in ('admin', 'leader', 'member') then
    raise exception 'Rol inválido.';
  end if;

  update public.memberships
  set role = p_role::public.membership_role
  where congregation_id = v_cid and user_id = p_user_id;

  if not found then
    raise exception 'Ese miembro no pertenece a tu congregación.';
  end if;
end;
$$;

-- 8) Datos del tenant en Ajustes ----------------------------------------
create or replace function public.update_tenant_profile(
  p_token uuid, p_photo_url text, p_banner_url text, p_bio text
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

  update public.congregations
  set photo_url  = p_photo_url,
      banner_url = p_banner_url,
      bio        = p_bio,
      updated_at = now()
  where id = v_cid;
end;
$$;

create or replace function public.change_tenant_password(p_token uuid, p_new_password text)
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
  if coalesce(p_new_password, '') = '' then
    raise exception 'La contraseña no puede estar vacía.';
  end if;

  -- El trigger de redil_schema.sql bloquea cambios de password_hash desde
  -- PostgREST; este RPC es el único conducto autorizado.
  perform set_config('redil.allow_sensitive_congregation_update', 'on', true);
  update public.congregations
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = v_cid;
  perform set_config('redil.allow_sensitive_congregation_update', '', true);
exception
  when others then
    perform set_config('redil.allow_sensitive_congregation_update', '', true);
    raise;
end;
$$;

-- 9) Datos del miembro en Ajustes (sí tiene auth.uid()) -----------------
create or replace function public.update_my_profile(
  p_photo_url text, p_banner_url text, p_bio text
)
returns void
language sql security definer
set search_path = public, extensions
as $$
  update public.profiles
  set photo_url  = p_photo_url,
      banner_url = p_banner_url,
      bio        = p_bio,
      updated_at = now()
  where id = (select auth.uid());
$$;

create or replace function public.get_my_profile()
returns table (
  name       text,
  surname    text,
  photo_url  text,
  banner_url text,
  bio        text
)
language sql stable security definer
set search_path = public, extensions
as $$
  select p.name, p.surname, p.photo_url, p.banner_url, p.bio
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- 10) Permisos -----------------------------------------------------------
revoke execute on function public.login_congregation(text, text) from public;
revoke execute on function public.tenant_from_token(uuid) from public;
revoke execute on function public.list_congregation_members(uuid) from public;
revoke execute on function public.list_tenant_ministries(uuid) from public;
revoke execute on function public.create_tenant_ministry(uuid, text, boolean) from public;
revoke execute on function public.delete_tenant_ministry(uuid, uuid) from public;
revoke execute on function public.assign_member_to_ministry(uuid, uuid, uuid) from public;
revoke execute on function public.unassign_member_from_ministry(uuid, uuid, uuid) from public;
revoke execute on function public.update_member_role(uuid, uuid, text) from public;
revoke execute on function public.update_tenant_profile(uuid, text, text, text) from public;
revoke execute on function public.change_tenant_password(uuid, text) from public;
revoke execute on function public.update_my_profile(text, text, text) from public;
revoke execute on function public.get_my_profile() from public;

-- Los del tenant los llama un visitante sin sesión Auth: se autorizan por token.
grant execute on function public.login_congregation(text, text) to anon, authenticated;
grant execute on function public.tenant_from_token(uuid) to anon, authenticated;
grant execute on function public.list_congregation_members(uuid) to anon, authenticated;
grant execute on function public.list_tenant_ministries(uuid) to anon, authenticated;
grant execute on function public.create_tenant_ministry(uuid, text, boolean) to anon, authenticated;
grant execute on function public.delete_tenant_ministry(uuid, uuid) to anon, authenticated;
grant execute on function public.assign_member_to_ministry(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.unassign_member_from_ministry(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.update_member_role(uuid, uuid, text) to anon, authenticated;
grant execute on function public.update_tenant_profile(uuid, text, text, text) to anon, authenticated;
grant execute on function public.change_tenant_password(uuid, text) to anon, authenticated;

grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

notify pgrst, 'reload schema';
