-- =====================================================================
-- Migración para una base YA CREADA. Idempotente: se puede correr varias veces.
-- Aplica los cambios de seguridad que redil_schema.sql trae para instalaciones
-- nuevas, sin recrear tablas ni policies existentes.
-- Ejecutar DESPUÉS de enforceR1.sql y ANTES de los RPCs sociales/avisos.
-- =====================================================================

-- 1) R1 y email único de admin (por si no están) -------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'memberships_user_id_key'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_user_id_key unique (user_id);
  end if;
end $$;

create unique index if not exists congregations_admin_email_lower_key
  on public.congregations (lower(admin_email));

-- 2) Bloqueos de columnas sensibles por PostgREST ------------------------
create or replace function public.prevent_sensitive_congregation_changes()
returns trigger language plpgsql
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

create or replace function public.prevent_membership_identity_changes()
returns trigger language plpgsql
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

drop trigger if exists congregations_protect_sensitive_columns on public.congregations;
create trigger congregations_protect_sensitive_columns
  before update on public.congregations
  for each row execute function public.prevent_sensitive_congregation_changes();

drop trigger if exists memberships_protect_identity on public.memberships;
create trigger memberships_protect_identity
  before update on public.memberships
  for each row execute function public.prevent_membership_identity_changes();

-- 3) Líder = admin o líder de ministerio; NUNCA rol global ---------------
create or replace function public.is_admin(cid uuid)
returns boolean language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1 from public.memberships m
    where m.congregation_id = cid
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  );
$$;

create or replace function public.is_leader(cid uuid)
returns boolean language sql stable security definer
set search_path = '', extensions
as $$
  select public.is_admin(cid)
      or exists (
        select 1 from public.ministry_members mm
        join public.memberships m on m.id = mm.membership_id
        where m.congregation_id = cid
          and m.user_id = (select auth.uid())
          and mm.ministry_role = 'leader'
      );
$$;

create or replace function public.leads_ministry(p_ministry_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.ministry_members mm
    join public.memberships m on m.id = mm.membership_id
    where mm.ministry_id = p_ministry_id
      and m.user_id = (select auth.uid())
      and (mm.ministry_role = 'leader' or m.role = 'admin')
  );
$$;

revoke execute on function public.leads_ministry(uuid) from public, anon;
grant execute on function public.leads_ministry(uuid) to authenticated;

-- 4) Policies de ministerios con alcance real ---------------------------
drop policy if exists ministries_select on public.ministries;
create policy ministries_select on public.ministries
  for select to authenticated using (public.is_member(congregation_id));

drop policy if exists ministries_insert on public.ministries;
create policy ministries_insert on public.ministries
  for insert to authenticated with check (public.is_admin(congregation_id));

drop policy if exists ministries_update on public.ministries;
create policy ministries_update on public.ministries
  for update to authenticated
  using (public.is_admin(congregation_id) or public.leads_ministry(id))
  with check (public.is_admin(congregation_id) or public.leads_ministry(id));

drop policy if exists ministries_delete on public.ministries;
create policy ministries_delete on public.ministries
  for delete to authenticated using (public.is_admin(congregation_id));

drop policy if exists ministry_members_select on public.ministry_members;
create policy ministry_members_select on public.ministry_members
  for select to authenticated using (public.is_member(congregation_id));

drop policy if exists ministry_members_insert on public.ministry_members;
create policy ministry_members_insert on public.ministry_members
  for insert to authenticated
  with check (public.is_admin(congregation_id) or public.leads_ministry(ministry_id));

drop policy if exists ministry_members_delete on public.ministry_members;
create policy ministry_members_delete on public.ministry_members
  for delete to authenticated
  using (public.is_admin(congregation_id) or public.leads_ministry(ministry_id));

notify pgrst, 'reload schema';
