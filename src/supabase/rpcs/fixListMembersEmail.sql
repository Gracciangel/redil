-- Fix puntual: list_congregation_members fallía con 42804 porque
-- auth.users.email es varchar(255) y la función declara `email text`.
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- El error aparecía recién con un token válido: con uno inválido se disparaba
-- antes la excepción "Sesión de congregación inválida" y lo tapaba.

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
         u.email::text, -- varchar(255) -> text
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

revoke execute on function public.list_congregation_members(uuid) from public;
grant execute on function public.list_congregation_members(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
