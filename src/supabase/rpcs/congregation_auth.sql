-- Autenticación/validación de congregaciones (login por tabla congregations)
-- Requiere extensión pgcrypto para hash de contraseñas (bcrypt).
create extension if not exists pgcrypto with schema extensions;

-- Columnas necesarias (ejecutar una vez en DB existente)
alter table public.congregations
  add column if not exists admin_email text,
  add column if not exists password_hash text,
  add column if not exists vify boolean not null default false,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists photo_url text,
  add column if not exists banner_url text,
  add column if not exists bio text,
  add column if not exists share_announcements boolean not null default false;

-- Un email admin no debe poder emitir tokens para dos congregaciones.
create unique index if not exists congregations_admin_email_lower_key
  on public.congregations (lower(admin_email)) where admin_email is not null;

-- El login emite un token opaco; la tabla debe existir (idéntica a tenantAdmin.sql).
create table if not exists public.tenant_sessions (
  token           uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references public.congregations (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '12 hours'
);
create index if not exists tenant_sessions_congregation_idx
  on public.tenant_sessions (congregation_id);
alter table public.tenant_sessions enable row level security;

-- Registro de congregación: guarda contraseña cifrada y queda pendiente de validación (vify=false)
drop function if exists public.create_congregation(text, text, text, text, text);
drop function if exists public.create_congregation(text, text, text, text, text, text, text);

create or replace function public.create_congregation(
  p_name        text,
  p_slug        text,
  p_city        text default null,
  p_country     text default null,
  p_address     text default null,
  p_admin_email text default null,
  p_password    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id   uuid;
  v_code text;
begin
  if coalesce(trim(p_admin_email), '') = '' then
    raise exception 'Email de administrador requerido';
  end if;
  if coalesce(p_password, '') = '' then
    raise exception 'Contraseña requerida';
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.congregations c where c.invitation_code = v_code);
  end loop;

  insert into public.congregations (
    name, slug, city, country, address, invitation_code, minister_id, admin_email, password_hash, vify
  )
  values (
    trim(p_name),
    lower(trim(p_slug)),
    nullif(trim(p_city), ''),
    nullif(trim(p_country), ''),
    nullif(trim(p_address), ''),
    v_code,
    null,
    lower(trim(p_admin_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    false
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'invitation_code', v_code,
    'vify', false
  );
end;
$$;

-- Login de congregación: idéntico a rpcs/tenantAdmin.sql (emite token de 12 hs).
drop function if exists public.login_congregation(text, text);

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

-- Permisos de ejecución (ajustar según política; login/registro pueden requerir anon)
revoke execute on function public.create_congregation(text, text, text, text, text, text, text) from public;
revoke execute on function public.login_congregation(text, text) from public;
grant execute on function public.create_congregation(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.login_congregation(text, text) to anon, authenticated;

notify pgrst, 'reload schema';