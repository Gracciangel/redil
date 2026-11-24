-- =====================================================================
-- Vinculación miembro <-> tenant (R1/R4/R7). Idempotente.
-- Ejecutar en Supabase → SQL Editor.
--
-- Los RPCs preview_congregation / join_congregation / get_my_membership ya
-- existen. Este archivo cubre el eslabón que suele faltar cuando el esquema se
-- aplicó por partes: el trigger que crea public.profiles al alta en Auth.
-- Sin perfil, memberships.user_id (FK a profiles.id) rechaza el alta y el
-- miembro nunca puede pertenecer a una congregación.
-- =====================================================================

-- 1) Trigger de creación de perfil ------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, name, surname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'surname', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2) Backfill: perfiles ausentes de usuarios ya registrados ------------
insert into public.profiles (id, name, surname)
select u.id,
       coalesce(
         u.raw_user_meta_data ->> 'full_name',
         u.raw_user_meta_data ->> 'name',
         split_part(coalesce(u.email, ''), '@', 1),
         ''
       ),
       coalesce(u.raw_user_meta_data ->> 'surname', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 3) join_congregation con safeguard de perfil -------------------------
-- Igual que la versión del esquema, pero si el trigger no existía cuando se
-- creó el usuario, acá se genera el perfil antes de insertar la membresía.
create or replace function public.join_congregation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_id       uuid;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  insert into public.profiles (id, name, surname)
  select u.id,
         coalesce(
           u.raw_user_meta_data ->> 'full_name',
           u.raw_user_meta_data ->> 'name',
           split_part(coalesce(u.email, ''), '@', 1),
           ''
         ),
         coalesce(u.raw_user_meta_data ->> 'surname', '')
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  select c.id into v_id
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;

  if v_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  -- R1: 1 usuario = 1 congregación. Reingresar con el mismo código es idempotente.
  select m.congregation_id into v_existing
  from public.memberships m
  where m.user_id = v_uid
  limit 1;

  if v_existing is not null then
    if v_existing = v_id then
      return v_id;
    end if;
    raise exception 'El usuario ya pertenece a otra congregación';
  end if;

  insert into public.memberships (congregation_id, user_id, role)
  values (v_id, v_uid, 'member');

  return v_id;
end;
$$;

revoke execute on function public.join_congregation(text) from public, anon;
grant execute on function public.join_congregation(text) to authenticated;

notify pgrst, 'reload schema';
