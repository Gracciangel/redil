-- =====================================================================
-- Capacidades (L) — líder limitado a SU ministerio o grupo.
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- rulesView.md: un usuario puede liderar varios ministerios/groups, puede
-- crear/alterar/leer/eliminar info de los que lidera y sumar/quitar miembros.
-- La asignación de roles global (memberships.role) la hace el tenant; acá se
-- agrega el alcance por ministerio, que es lo que faltaba para poder enforzar.
--
-- Decisión: crear y eliminar ministerios sigue siendo potestad del tenant.
-- El líder puede editar nombre/ícono y gestionar miembros de lo que lidera.
-- =====================================================================

-- 1) Rol del miembro DENTRO de cada ministerio --------------------------
alter table public.ministry_members
  add column if not exists ministry_role text not null default 'member';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ministry_members_role_check'
      and conrelid = 'public.ministry_members'::regclass
  ) then
    alter table public.ministry_members
      add constraint ministry_members_role_check
      check (ministry_role in ('leader', 'member'));
  end if;
end $$;

-- 2) Helper: ¿el usuario auth lidera este ministerio? -------------------
create or replace function public.leads_ministry(p_ministry_id uuid)
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

-- 3) Ministerios del usuario autenticado (Perfil) ----------------------
create or replace function public.get_my_ministries()
returns table (
  id           uuid,
  name         text,
  is_group     boolean,
  icon         text,
  is_leader    boolean,
  member_count bigint
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  return query
  select mi.id,
         mi.name,
         mi.is_group,
         mi.icon,
         (mm.ministry_role = 'leader' or m.role = 'admin') as is_leader,
         (select count(*) from public.ministry_members x where x.ministry_id = mi.id)::bigint
  from public.ministry_members mm
  join public.ministries mi on mi.id = mm.ministry_id
  join public.memberships m on m.id = mm.membership_id
  where m.user_id = (select auth.uid())
  order by mi.is_group, mi.name;
end;
$$;

-- 4) Miembros de un ministerio (solo líder) -----------------------------
create or replace function public.list_ministry_members(p_ministry_id uuid)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  email      text,
  photo_url  text,
  role       text
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  if not public.leads_ministry(p_ministry_id) then
    raise exception 'No liderás este ministerio o grupo.';
  end if;

  return query
  select m.user_id,
         p.name,
         p.surname,
         u.email::text,
         p.photo_url,
         mm.ministry_role
  from public.ministry_members mm
  join public.memberships m on m.id = mm.membership_id
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where mm.ministry_id = p_ministry_id
  order by mm.ministry_role desc, p.name;
end;
$$;

-- 4b) Candidatos a sumar: miembros de la congregación del líder ----------
create or replace function public.list_leaders_congregation_members()
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  email      text,
  photo_url  text,
  role       text
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
    and (
      m.role in ('admin', 'leader')
      -- Un líder designado SOLO dentro de un ministerio también necesita ver
      -- los miembros de la congregación para poder sumarlos a su grupo.
      or exists (
        select 1 from public.ministry_members mm
        where mm.membership_id = m.id and mm.ministry_role = 'leader'
      )
    )
  limit 1;

  if v_cid is null then
    raise exception 'No tenés permisos para ver los miembros de la congregación.';
  end if;

  return query
  select m.user_id,
         p.name,
         p.surname,
         u.email::text,
         p.photo_url,
         m.role::text
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.congregation_id = v_cid
  order by p.name;
end;
$$;

-- 5) Sumar miembros (solo líder, mismo tenant) --------------------------
create or replace function public.add_ministry_member(p_ministry_id uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid  uuid;
  v_mem  uuid;
begin
  if not public.leads_ministry(p_ministry_id) then
    raise exception 'No liderás este ministerio o grupo.';
  end if;

  select congregation_id into v_cid
  from public.ministries where id = p_ministry_id;

  select id into v_mem
  from public.memberships
  where congregation_id = v_cid and user_id = p_user_id;

  if v_mem is null then
    raise exception 'Ese usuario no pertenece a tu congregación.';
  end if;

  insert into public.ministry_members (congregation_id, ministry_id, membership_id, ministry_role)
  values (v_cid, p_ministry_id, v_mem, 'member')
  on conflict (ministry_id, membership_id) do nothing;
end;
$$;

-- 6) Quitar miembros (solo líder) --------------------------------------
create or replace function public.remove_ministry_member(p_ministry_id uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_mem uuid;
begin
  if not public.leads_ministry(p_ministry_id) then
    raise exception 'No liderás este ministerio o grupo.';
  end if;

  select mm.id into v_mem
  from public.ministry_members mm
  join public.memberships m on m.id = mm.membership_id
  where mm.ministry_id = p_ministry_id and m.user_id = p_user_id;

  if v_mem is null then
    raise exception 'Ese miembro no está en este ministerio o grupo.';
  end if;

  delete from public.ministry_members where id = v_mem;
end;
$$;

-- 7) Cambiar rol dentro del ministerio (solo líder) --------------------
create or replace function public.set_ministry_member_role(
  p_ministry_id uuid, p_user_id uuid, p_ministry_role text
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_mem uuid;
begin
  if not public.leads_ministry(p_ministry_id) then
    raise exception 'No liderás este ministerio o grupo.';
  end if;
  if p_ministry_role not in ('leader', 'member') then
    raise exception 'Rol inválido dentro del ministerio.';
  end if;

  select mm.id into v_mem
  from public.ministry_members mm
  join public.memberships m on m.id = mm.membership_id
  where mm.ministry_id = p_ministry_id and m.user_id = p_user_id;

  if v_mem is null then
    raise exception 'Ese miembro no está en este ministerio o grupo.';
  end if;

  update public.ministry_members
  set ministry_role = p_ministry_role
  where id = v_mem;
end;
$$;

-- 8) Editar nombre/ícono (solo líder) ----------------------------------
create or replace function public.update_ministry(
  p_ministry_id uuid, p_name text, p_icon text
)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not public.leads_ministry(p_ministry_id) then
    raise exception 'No liderás este ministerio o grupo.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre es obligatorio.';
  end if;

  update public.ministries
  set name = trim(p_name), icon = p_icon
  where id = p_ministry_id;
end;
$$;

-- 9) El tenant designa líderes desde Ajustes ---------------------------
create or replace function public.set_tenant_ministry_member_role(
  p_token uuid, p_ministry_id uuid, p_user_id uuid, p_ministry_role text
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
  if p_ministry_role not in ('leader', 'member') then
    raise exception 'Rol inválido dentro del ministerio.';
  end if;

  if not exists (select 1 from public.ministries where id = p_ministry_id and congregation_id = v_cid) then
    raise exception 'Ese ministerio o grupo no pertenece a tu congregación.';
  end if;

  select mm.id into v_mem
  from public.ministry_members mm
  join public.memberships m on m.id = mm.membership_id
  where mm.congregation_id = v_cid
    and mm.ministry_id = p_ministry_id
    and m.user_id = p_user_id;

  if v_mem is null then
    raise exception 'Ese miembro no está asignado a este ministerio o grupo.';
  end if;

  update public.ministry_members set ministry_role = p_ministry_role where id = v_mem;
end;
$$;

-- 9b) Integrantes de un ministerio para el tenant (ABM de Ajustes) ------
create or replace function public.list_tenant_ministry_members(
  p_token uuid, p_ministry_id uuid
)
returns table (
  user_id    uuid,
  name       text,
  surname    text,
  email      text,
  photo_url  text,
  role       text
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
  if not exists (
    select 1 from public.ministries
    where id = p_ministry_id and congregation_id = v_cid
  ) then
    raise exception 'Ese ministerio o grupo no pertenece a tu congregación.';
  end if;

  return query
  select m.user_id,
         p.name,
         p.surname,
         u.email::text,
         p.photo_url,
         mm.ministry_role
  from public.ministry_members mm
  join public.memberships m on m.id = mm.membership_id
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where mm.congregation_id = v_cid and mm.ministry_id = p_ministry_id
  order by mm.ministry_role desc, p.name;
end;
$$;

-- 9c) Modificar nombre, tipo e ícono desde Ajustes ----------------------
create or replace function public.update_tenant_ministry(
  p_token uuid, p_ministry_id uuid, p_name text, p_is_group boolean, p_icon text
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
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre es obligatorio.';
  end if;

  update public.ministries
  set name = trim(p_name), is_group = p_is_group, icon = p_icon
  where id = p_ministry_id and congregation_id = v_cid;

  if not found then
    raise exception 'Ese ministerio o grupo no pertenece a tu congregación.';
  end if;
end;
$$;

-- 10) Permisos ---------------------------------------------------------
revoke execute on function public.leads_ministry(uuid) from public;
revoke execute on function public.get_my_ministries() from public;
revoke execute on function public.list_ministry_members(uuid) from public;
revoke execute on function public.list_leaders_congregation_members() from public;
revoke execute on function public.add_ministry_member(uuid, uuid) from public;
revoke execute on function public.remove_ministry_member(uuid, uuid) from public;
revoke execute on function public.set_ministry_member_role(uuid, uuid, text) from public;
revoke execute on function public.update_ministry(uuid, text, text) from public;
revoke execute on function public.set_tenant_ministry_member_role(uuid, uuid, uuid, text) from public;
revoke execute on function public.list_tenant_ministry_members(uuid, uuid) from public;
revoke execute on function public.update_tenant_ministry(uuid, uuid, text, boolean, text) from public;

grant execute on function public.leads_ministry(uuid) to authenticated;
grant execute on function public.get_my_ministries() to authenticated;
grant execute on function public.list_ministry_members(uuid) to authenticated;
grant execute on function public.list_leaders_congregation_members() to authenticated;
grant execute on function public.add_ministry_member(uuid, uuid) to authenticated;
grant execute on function public.remove_ministry_member(uuid, uuid) to authenticated;
grant execute on function public.set_ministry_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.update_ministry(uuid, text, text) to authenticated;
grant execute on function public.set_tenant_ministry_member_role(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.list_tenant_ministry_members(uuid, uuid) to anon, authenticated;
grant execute on function public.update_tenant_ministry(uuid, uuid, text, boolean, text) to anon, authenticated;

notify pgrst, 'reload schema';
