-- =====================================================================
-- Datos del pastor de la congregación (tabla public.pastor_congregation).
-- Ejecutar en SQL Editor. Idempotente.
--
-- DESPUÉS de tenantAdmin.sql: usa public.tenant_from_token(p_token).
-- El tenant no tiene auth.uid(): se autoriza con el token de sesión.
-- "Completo" = nombre y apellido presentes; bio y credenciales son opcionales.
-- Las credenciales son rutas a imágenes, se muestran como miniaturas.
-- =====================================================================

-- Acceso directo bloqueado: solo los RPCs de abajo leen/escriben la tabla.
alter table public.pastor_congregation enable row level security;
revoke all on public.pastor_congregation from anon, authenticated;

-- 1) Lectura del pastor de la congregación ------------------------------
create or replace function public.get_pastor_congregation(p_token uuid)
returns table (
  id           bigint,
  name         text,
  surname      text,
  bio          text,
  credential1  text,
  credential2  text,
  credential3  text,
  is_complete  boolean,
  created_at   timestamptz
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
  v_id bigint;
  v_name text;
  v_surname text;
  v_bio text;
  v_cred1 text;
  v_cred2 text;
  v_cred3 text;
  v_created timestamptz;
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;

  select pc.id, pc.name, pc.surname, pc.bio,
         pc.credential1, pc.credential2, pc.credential3, pc.created_at
    into v_id, v_name, v_surname, v_bio, v_cred1, v_cred2, v_cred3, v_created
    from public.pastor_congregation pc
   where pc.congregation_id = v_cid
   limit 1;

  if not found then
    v_name := ''; v_surname := ''; v_bio := '';
    v_cred1 := ''; v_cred2 := ''; v_cred3 := '';
  end if;

  return query
  select v_id, v_name, v_surname, v_bio, v_cred1, v_cred2, v_cred3,
         (coalesce(btrim(v_name), '') <> '' and coalesce(btrim(v_surname), '') <> ''),
         v_created;
end;
$$;

-- 2) Alta / edición: una sola fila por congregación ---------------------
create or replace function public.save_pastor_congregation(
  p_token      uuid,
  p_name       text,
  p_surname    text,
  p_bio        text,
  p_credential1 text,
  p_credential2 text,
  p_credential3 text
)
returns table (
  id           bigint,
  name         text,
  surname      text,
  bio          text,
  credential1  text,
  credential2  text,
  credential3  text,
  is_complete  boolean,
  created_at   timestamptz
)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_cid uuid := public.tenant_from_token(p_token);
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_surname text := nullif(btrim(coalesce(p_surname, '')), '');
  v_bio text := nullif(btrim(coalesce(p_bio, '')), '');
  v_cred1 text := nullif(btrim(coalesce(p_credential1, '')), '');
  v_cred2 text := nullif(btrim(coalesce(p_credential2, '')), '');
  v_cred3 text := nullif(btrim(coalesce(p_credential3, '')), '');
  v_id bigint;
  v_created timestamptz;
begin
  if v_cid is null then
    raise exception 'Sesión de congregación inválida o vencida. Volvé a iniciar sesión.';
  end if;
  if v_name is null or v_surname is null then
    raise exception 'Nombre y apellido del pastor son obligatorios.' using errcode = '22023';
  end if;

  select pc.id into v_id
    from public.pastor_congregation pc
   where pc.congregation_id = v_cid
   limit 1;

  if v_id is null then
    insert into public.pastor_congregation
      (name, surname, bio, credential1, credential2, credential3, congregation_id)
    values (v_name, v_surname, v_bio, v_cred1, v_cred2, v_cred3, v_cid)
    returning id into v_id;
  else
    update public.pastor_congregation pc
       set name = v_name, surname = v_surname, bio = v_bio,
           credential1 = v_cred1, credential2 = v_cred2, credential3 = v_cred3
     where pc.id = v_id and pc.congregation_id = v_cid;
  end if;

  select pc.created_at into v_created
    from public.pastor_congregation pc
   where pc.id = v_id;

  return query
  select v_id, v_name, v_surname, v_bio, v_cred1, v_cred2, v_cred3, true, v_created;
end;
$$;

-- 3) Permisos ----------------------------------------------------------
revoke execute on function public.get_pastor_congregation(uuid) from public, anon, authenticated;
revoke execute on function public.save_pastor_congregation(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.get_pastor_congregation(uuid) to anon, authenticated;
grant execute on function public.save_pastor_congregation(uuid, text, text, text, text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
