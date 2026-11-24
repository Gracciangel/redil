-- Redil · alcance real de contactos por ministerio
-- Ejecutado en la base real el 24/11/2026 sin errores.
--
-- Reemplaza leads_user() (que miraba memberships.role = 'leader', el rol
-- global) por una función que exige ministerio compartido con
-- ministry_members.ministry_role = 'leader'. El admin de la congregación
-- del dueño del contacto sigue viendo todo.
--
-- DB nueva: ejecutar al final del orden de CONTEXTO.md 16.18, después de
--           newsAnnouncements.sql.
-- DB existente: ejecutar al final del orden de CONTEXTO.md 16.19.
-- Idempotente: create or replace + drop policy if exists.

create or replace function public.leads_member_contact(p_user_id uuid)
returns boolean language sql stable security definer
set search_path = '', extensions
as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships other on other.congregation_id = me.congregation_id
    where me.user_id = (select auth.uid())
      and me.role = 'admin'
      and other.user_id = p_user_id
  )
  or exists (
    select 1
    from public.memberships me
    join public.memberships other on other.congregation_id = me.congregation_id
    join public.ministry_members leader_mm
      on leader_mm.membership_id = me.id
     and leader_mm.congregation_id = me.congregation_id
     and leader_mm.ministry_role = 'leader'
    join public.ministry_members other_mm
      on other_mm.ministry_id = leader_mm.ministry_id
     and other_mm.congregation_id = leader_mm.congregation_id
     and other_mm.membership_id = other.id
    where me.user_id = (select auth.uid())
      and other.user_id = p_user_id
  );
$$;

revoke execute on function public.leads_member_contact(uuid) from public, anon;
grant execute on function public.leads_member_contact(uuid) to authenticated;

drop policy if exists contacts_select on public.member_contacts;
create policy contacts_select on public.member_contacts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.leads_member_contact(user_id));

-- Verificación sugerida: un leader de Música NO debe ver el contacto de un
-- miembro que solo está en Infancia; el admin de la congregación SÍ debe verlo.
