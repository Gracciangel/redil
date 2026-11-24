-- =====================================================================
-- R1: cada miembro pertenece a UNA SOLA congregación.
-- Aplicar en Supabase SQL Editor sobre una base ya creada.
-- Las dos cosas que se corrigen acá:
--   1) La tabla memberships no tenía restricción por user_id (solo por par
--      congregation_id + user_id), así que un usuario podía quedar en dos
--      tenants distintos.
--   2) La versión de join_congregation del esquema maestro no chequeaba R1
--      (usaba `on conflict (congregation_id, user_id) do nothing`).
-- Esta migración es idempotente: se puede ejecutar más de una vez.
-- =====================================================================

-- 0) Diagnosticar: si esto devuelve filas, HAY usuarios en más de un tenant.
--    Resolverlos antes de seguir (el paso 1 va a fallar si hay duplicados).
select user_id, count(*) as congregaciones
from public.memberships
group by user_id
having count(*) > 1;

-- 1) Restricción a nivel de base: imposible pertenecer a más de una congregación.
--    Se consulta el catálogo en vez de atrapar excepciones: Postgres puede
--    devolver 42P07 (duplicate_table) o 42710 (duplicate_object) según versión.
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

-- 2) RPC alineado con rpcs/joinCongregation.sql (respeta R1 y normaliza el código).
create or replace function public.preview_congregation(p_code text)
returns table (id uuid, name text, city text, country text, photo_url text)
language sql stable security definer
set search_path = public, extensions
as $$
  select c.id, c.name, c.city, c.country, c.photo_url
  from public.congregations c
  where upper(c.invitation_code) = upper(trim(p_code))
  limit 1;
$$;

create or replace function public.join_congregation(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid      uuid;
  v_id       uuid;
  v_existing uuid;
begin
  v_uid := auth.uid();
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
      return v_id; -- idempotente
    end if;
    raise exception 'El usuario ya pertenece a otra congregación';
  end if;

  insert into public.memberships (congregation_id, user_id, role)
  values (v_id, v_uid, 'member');

  return v_id;
end;
$$;

revoke execute on function public.preview_congregation(text) from public, anon;
revoke execute on function public.join_congregation(text) from public, anon;
grant execute on function public.preview_congregation(text) to authenticated;
grant execute on function public.join_congregation(text) to authenticated;

notify pgrst, 'reload schema';
