-- =====================================================================
-- REDIL · Esquema multitenant para Supabase (PostgreSQL)
-- Tenant = congregación. Todo el contenido lleva congregation_id y
-- RLS garantiza que cada usuario solo vea lo de SUS congregaciones.
-- Pensado para un proyecto nuevo/limpio (corre en el SQL Editor).
-- Los archivos pesados (imágenes/videos) viven fuera (p. ej. R2):
-- acá solo se guardan las URLs.
-- =====================================================================

-- ---------- Tipos ----------------------------------------------------
create type public.membership_role as enum ('admin', 'leader', 'member');
create type public.media_kind      as enum ('image', 'video');

-- ---------- Utilidad: updated_at ------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = '', extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Perfiles (antes "Member") --------------------------------
-- id = auth.users.id. Email y contraseña los maneja Supabase Auth.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  surname     text not null default '',
  photo_url   text,
  banner_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Datos de contacto aparte: solo visibles para el propio usuario
-- y para líderes/admins de una congregación que comparten.
create table public.member_contacts (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  phone       text,
  updated_at  timestamptz not null default now()
);

-- ---------- Congregaciones (el tenant) -------------------------------
create table public.congregations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),   -- /c/tdg
  address          text,
  country          text,
  city             text,
  invitation_code  text not null unique
                   default left(replace(gen_random_uuid()::text, '-', ''), 10),
  minister_id      uuid references public.profiles (id) on delete set null,
  photo_url        text,
  banner_url       text,
  bio              text,
  admin_email      text,
  password_hash    text,
  vify             boolean not null default false,
  -- Red social externa: el tenant elige si sus anuncios son visibles para
  -- miembros de otros tenants verificados.
  share_announcements boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un mismo email admin no debe poder emitir tokens para dos congregaciones.
create unique index congregations_admin_email_lower_key
  on public.congregations (lower(admin_email)) where admin_email is not null;

-- ---------- Sesiones de tenant ---------------------------------------
-- El login de congregación no crea auth.uid(): login_congregation emite un
-- token opaco que los RPCs del tenant validan.
create table public.tenant_sessions (
  token           uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references public.congregations (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '12 hours'
);
create index tenant_sessions_congregation_idx on public.tenant_sessions (congregation_id);
alter table public.tenant_sessions enable row level security;
-- Sin políticas: solo se accede desde funciones security definer.

-- ---------- Membresías (usuario <-> congregación, con rol) -----------
create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references public.congregations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.membership_role not null default 'member',
  created_at       timestamptz not null default now(),
  unique (congregation_id, user_id),
  constraint memberships_user_id_key unique (user_id), -- R1: 1 miembro = 1 sola congregación
  unique (id, congregation_id)            -- permite FK compuestas
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------- Ministerios y sus integrantes ----------------------------
create table public.ministries (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references public.congregations (id) on delete cascade,
  name             text not null,
  is_group         boolean not null default false,
  icon             text,                  -- clave de ícono (reemplaza tabla Icons)
  created_at       timestamptz not null default now(),
  unique (id, congregation_id)
);
create index ministries_congregation_idx on public.ministries (congregation_id);

create table public.ministry_members (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null,
  ministry_id      uuid not null,
  membership_id    uuid not null,
  -- Alcance (L): 'leader' puede gestionar este ministerio; 'member' solo pertenece.
  ministry_role    text not null default 'member'
                   constraint ministry_members_role_check
                   check (ministry_role in ('leader', 'member')),
  created_at       timestamptz not null default now(),
  unique (ministry_id, membership_id),
  -- Las FK compuestas impiden mezclar tenants (ministerio de una
  -- congregación con miembro de otra).
  foreign key (ministry_id, congregation_id)
    references public.ministries (id, congregation_id) on delete cascade,
  foreign key (membership_id, congregation_id)
    references public.memberships (id, congregation_id) on delete cascade
);
create index ministry_members_membership_idx on public.ministry_members (membership_id);
create index ministry_members_congregation_idx on public.ministry_members (congregation_id);

-- ---------- Contenido del tenant -------------------------------------
create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references public.congregations (id) on delete cascade,
  author_id        uuid default auth.uid() references public.profiles (id) on delete set null,
  body             text,
  media_url        text,
  media_type       public.media_kind,
  allow_download   boolean not null default false,   -- lo decide el autor
  created_at       timestamptz not null default now(),
  check (body is not null or media_url is not null),
  check (media_url is null or media_type is not null)
);
create index posts_feed_idx on public.posts (congregation_id, created_at desc);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references public.congregations (id) on delete cascade,
  created_by       uuid default auth.uid() references public.profiles (id) on delete set null,
  title            text not null,
  description      text,
  location         text,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index events_idx on public.events (congregation_id, starts_at);

create table public.news (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references public.congregations (id) on delete cascade,
  created_by       uuid default auth.uid() references public.profiles (id) on delete set null,
  title            text not null,
  body             text,
  image_url        text,
  published_at     timestamptz not null default now(),
  is_global        boolean not null default false
);
create index news_idx on public.news (congregation_id, published_at desc);

-- ---------- Triggers -------------------------------------------------
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger member_contacts_updated_at
  before update on public.member_contacts
  for each row execute function public.set_updated_at();

create trigger congregations_updated_at
  before update on public.congregations
  for each row execute function public.set_updated_at();

-- Un admin NO puede auto-verificarse ni cambiar visibilidad/credenciales por
-- PostgREST directo. Las funciones security definer (p. ej.
-- change_tenant_password) pueden optar por escribir con el flag interno.
create function public.prevent_sensitive_congregation_changes()
returns trigger
language plpgsql
set search_path = '', extensions
as $$
begin
  if current_user in ('anon', 'authenticated')
     and coalesce(current_setting('redil.allow_sensitive_congregation_update', true), '') <> 'on' then
    if new.vify is distinct from old.vify
       or new.share_announcements is distinct from old.share_announcements
       or new.admin_email is distinct from old.admin_email
       or new.password_hash is distinct from old.password_hash
       or new.invitation_code is distinct from old.invitation_code then
      raise exception 'No podés cambiar verificación, visibilidad, email, contraseña ni código de invitación desde acá.';
    end if;
  end if;
  return new;
end;
$$;

create trigger congregations_protect_sensitive_columns
  before update on public.congregations
  for each row execute function public.prevent_sensitive_congregation_changes();

-- La identidad de una membresía (usuario/congregación) no se edita: solo el rol.
create function public.prevent_membership_identity_changes()
returns trigger
language plpgsql
set search_path = '', extensions
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.congregation_id is distinct from old.congregation_id then
      raise exception 'De una membresía solo se puede cambiar el rol.';
    end if;
  end if;
  return new;
end;
$$;

create trigger memberships_protect_identity
  before update on public.memberships
  for each row execute function public.prevent_membership_identity_changes();

-- Al registrarse un usuario en Auth se crea su perfil.
-- Mandar name y surname en options.data del signUp.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = '', extensions
as $$
begin
  insert into public.profiles (id, name, surname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'surname', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function
  public.prevent_sensitive_congregation_changes(),
  public.prevent_membership_identity_changes()
from public, anon, authenticated;

-- ---------- Funciones auxiliares para RLS ----------------------------
-- security definer: leen memberships sin disparar RLS (evita recursión).
create function public.is_member(cid uuid)
returns boolean
language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1 from public.memberships m
    where m.congregation_id = cid and m.user_id = (select auth.uid())
  );
$$;

-- is_admin va primero: is_leader lo usa.
create function public.is_admin(cid uuid)
returns boolean
language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1 from public.memberships m
    where m.congregation_id = cid
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  );
$$;

-- Líder = admin del tenant O líder de al menos un ministerio/grupo del tenant.
-- memberships.role = 'leader' NO conlleva permisos globales.
create function public.is_leader(cid uuid)
returns boolean
language sql stable security definer
set search_path = '', extensions
as $$
  select public.is_admin(cid)
      or exists (
        select 1
        from public.ministry_members mm
        join public.memberships m on m.id = mm.membership_id
        where m.congregation_id = cid
          and m.user_id = (select auth.uid())
          and mm.ministry_role = 'leader'
      );
$$;

-- Alcance por ministerio. Misma definición que rpcs/leaderCapabilities.sql;
-- este archivo lo necesita para las policies de ministry_members.
create function public.leads_ministry(p_ministry_id uuid)
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.ministry_members mm
    join public.memberships m on m.id = mm.membership_id
    where mm.ministry_id = p_ministry_id
      and m.user_id = (select auth.uid())
      and (mm.ministry_role = 'leader' or m.role = 'admin')
  );
$$;

-- ¿Comparto alguna congregación con este usuario?
create function public.shares_congregation(uid uuid)
returns boolean
language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.congregation_id = a.congregation_id
    where a.user_id = (select auth.uid()) and b.user_id = uid
  );
$$;

-- ¿Soy líder/admin en alguna congregación donde este usuario es miembro?
create function public.leads_user(uid uuid)
returns boolean
language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.congregation_id = a.congregation_id
    where a.user_id = (select auth.uid())
      and a.role in ('admin', 'leader')
      and b.user_id = uid
  );
$$;

-- ---------- RPC: crear / iniciar sesión de congregaciones ------------
-- Requiere pgcrypto para cifrado de contraseñas.
create extension if not exists pgcrypto with schema extensions;

-- Registro: guarda contraseña cifrada (bcrypt) y queda pendiente de validación (vify=false).
create function public.create_congregation(
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
set search_path = '', extensions
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
    name, slug, city, country, address, invitation_code, admin_email, password_hash, vify
  )
  values (
    trim(p_name),
    lower(trim(p_slug)),
    nullif(trim(p_city), ''),
    nullif(trim(p_country), ''),
    nullif(trim(p_address), ''),
    v_code,
    lower(trim(p_admin_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    false
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'invitation_code', v_code, 'vify', false);
end;
$$;

-- Login: solo permite acceso si la contraseña es correcta y vify=true.
-- Emite un token de sesión porque el tenant no tiene auth.uid().
create function public.login_congregation(
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
      'invitation_code', v_row.invitation_code,
      'admin_email', v_row.admin_email,
      'photo_url', v_row.photo_url,
      'banner_url', v_row.banner_url,
      'bio', v_row.bio
    )
  );
end;
$$;

-- Vista previa para la pantalla "¿Querés unirte a...?" (link/QR).
create function public.preview_congregation(p_code text)
returns table (id uuid, name text, city text, country text, photo_url text)
language sql stable security definer
set search_path = '', extensions
as $$
  select c.id, c.name, c.city, c.country, c.photo_url
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;
$$;

-- R1: 1 usuario = 1 congregación. Alineado con rpcs/joinCongregation.sql.
create function public.join_congregation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = '', extensions
as $$
declare
  v_uid      uuid;
  v_id       uuid;
  v_existing uuid;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select c.id into v_id
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;

  if v_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  select m.congregation_id into v_existing
  from public.memberships m
  where m.user_id = v_uid
  limit 1;

  if v_existing is not null then
    if v_existing = v_id then
      return v_id; -- idempotente: ya pertenece a esta congregación
    end if;
    raise exception 'El usuario ya pertenece a otra congregación';
  end if;

  insert into public.memberships (congregation_id, user_id, role)
  values (v_id, v_uid, 'member');

  return v_id;
end;
$$;

-- Membresía del usuario autenticado: decide Home del miembro vs. modal R7.
create function public.get_my_membership()
returns table (congregation_id uuid, name text, slug text, role public.membership_role)
language sql stable security definer
set search_path = '', extensions
as $$
  select m.congregation_id, c.name, c.slug, m.role
  from public.memberships m
  join public.congregations c on c.id = m.congregation_id
  where m.user_id = (select auth.uid())
  limit 1;
$$;

-- Solo usuarios autenticados pueden ejecutar helpers y RPC (excepto registro/login de congregación).
revoke execute on function
  public.is_member(uuid), public.is_leader(uuid), public.is_admin(uuid),
  public.leads_ministry(uuid),
  public.shares_congregation(uuid), public.leads_user(uuid),
  public.preview_congregation(text), public.join_congregation(text),
  public.get_my_membership()
from public, anon;

grant execute on function
  public.is_member(uuid), public.is_leader(uuid), public.is_admin(uuid),
  public.leads_ministry(uuid),
  public.shares_congregation(uuid), public.leads_user(uuid),
  public.preview_congregation(text), public.join_congregation(text),
  public.get_my_membership()
to authenticated;

revoke execute on function public.create_congregation(text, text, text, text, text, text, text) from public;
revoke execute on function public.login_congregation(text, text) from public;
grant execute on function public.create_congregation(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.login_congregation(text, text) to anon, authenticated;

-- ---------- RLS ------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.member_contacts enable row level security;
alter table public.congregations   enable row level security;
alter table public.memberships     enable row level security;
alter table public.ministries      enable row level security;
alter table public.ministry_members enable row level security;
alter table public.posts           enable row level security;
alter table public.events          enable row level security;
alter table public.news            enable row level security;

-- profiles: yo y quienes comparten congregación conmigo
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_congregation(id));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- member_contacts: yo, o líderes de una congregación en común
create policy contacts_select on public.member_contacts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.leads_user(user_id));

create policy contacts_insert_own on public.member_contacts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy contacts_update_own on public.member_contacts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy contacts_delete_own on public.member_contacts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- congregations: ven los miembros; edita/borra el admin (se crea por RPC)
create policy congregations_select on public.congregations
  for select to authenticated
  using (public.is_member(id));

create policy congregations_update on public.congregations
  for update to authenticated
  using (public.is_admin(id))
  with check (public.is_admin(id));

create policy congregations_delete on public.congregations
  for delete to authenticated
  using (public.is_admin(id));

-- memberships: ven los miembros; cambia roles el admin; salir o expulsar
create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_member(congregation_id));

create policy memberships_update on public.memberships
  for update to authenticated
  using (public.is_admin(congregation_id))
  with check (public.is_admin(congregation_id));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin(congregation_id));

-- ministries y ministry_members: ven miembros, gestionan líderes
create policy ministries_select on public.ministries
  for select to authenticated using (public.is_member(congregation_id));
-- Altas y bajas: solo el admin. El líder edita SOLAMENTE su ministerio/grupo.
create policy ministries_insert on public.ministries
  for insert to authenticated with check (public.is_admin(congregation_id));
create policy ministries_update on public.ministries
  for update to authenticated
  using (public.is_admin(congregation_id) or public.leads_ministry(id))
  with check (public.is_admin(congregation_id) or public.leads_ministry(id));
create policy ministries_delete on public.ministries
  for delete to authenticated using (public.is_admin(congregation_id));

create policy ministry_members_select on public.ministry_members
  for select to authenticated using (public.is_member(congregation_id));
-- El admin siempre puede; el líder solo dentro de los ministerios que lidera.
create policy ministry_members_insert on public.ministry_members
  for insert to authenticated
  with check (public.is_admin(congregation_id) or public.leads_ministry(ministry_id));
create policy ministry_members_delete on public.ministry_members
  for delete to authenticated
  using (public.is_admin(congregation_id) or public.leads_ministry(ministry_id));

-- posts (feed interno): ven y publican los miembros; edita el autor o un líder
create policy posts_select on public.posts
  for select to authenticated using (public.is_member(congregation_id));
create policy posts_insert on public.posts
  for insert to authenticated
  with check (public.is_member(congregation_id) and author_id = (select auth.uid()));
create policy posts_update on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_leader(congregation_id))
  with check (public.is_member(congregation_id)
              and (author_id = (select auth.uid()) or public.is_leader(congregation_id)));
create policy posts_delete on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_leader(congregation_id));

-- events y news: ven miembros, publican líderes
create policy events_select on public.events
  for select to authenticated using (public.is_member(congregation_id));
create policy events_insert on public.events
  for insert to authenticated with check (public.is_leader(congregation_id));
create policy events_update on public.events
  for update to authenticated
  using (public.is_leader(congregation_id))
  with check (public.is_leader(congregation_id));
create policy events_delete on public.events
  for delete to authenticated using (public.is_leader(congregation_id));

create policy news_select on public.news
  for select to authenticated using (public.is_member(congregation_id));
create policy news_insert on public.news
  for insert to authenticated with check (public.is_leader(congregation_id));
create policy news_update on public.news
  for update to authenticated
  using (public.is_leader(congregation_id))
  with check (public.is_leader(congregation_id));
create policy news_delete on public.news
  for delete to authenticated using (public.is_leader(congregation_id));

-- ---------- Migrar TDG como primera congregación (manual) ------------
-- En el SQL Editor auth.uid() es null, así que se hace a mano.
-- 1) Registrate en la app para tener tu usuario y copiá su UUID.
-- 2) Descomentá y ejecutá, reemplazando <TU_USER_UUID>:
--
-- with c as (
--   insert into public.congregations (name, slug)
--   values ('Tiempo de Gracia', 'tdg')
--   returning id
-- )
-- insert into public.memberships (congregation_id, user_id, role)
-- select id, '<TU_USER_UUID>', 'admin' from c;
