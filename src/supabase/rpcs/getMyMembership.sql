-- Devuelve la congregación a la que pertenece el usuario autenticado (R4/R7).
-- Es lo que decide si el miembro ve su Home o el modal de acceso requerido.
-- Requiere sesión de Supabase Auth (auth.uid()).

drop function if exists public.get_my_membership();

create or replace function public.get_my_membership()
returns table (
  congregation_id uuid,
  name            text,
  slug            text,
  role            public.membership_role
)
language sql
stable
security definer
set search_path = '', extensions
as $$
  select m.congregation_id, c.name, c.slug, m.role
  from public.memberships m
  join public.congregations c on c.id = m.congregation_id
  where m.user_id = (select auth.uid())
  limit 1;
$$;

revoke execute on function public.get_my_membership() from public, anon;
grant execute on function public.get_my_membership() to authenticated;

notify pgrst, 'reload schema';
