-- Redil · Cancionero por congregación, con uso restringido por ministerio
-- Ejecutar DESPUÉS de fixContactsScope.sql (ver CONTEXTO.md 16.18 / 16.19).
-- Idempotente: create table if not exists / create or replace / drop policy.
--
-- Reglas:
--   * Título, artista, tono original y LETRA SIN CIFRADO son públicos.
--   * El contenido ChordPro con acordes solo lo leen miembros del ministerio
--     que tenga ministries.uses_songbook = true (o el admin del tenant).
--   * El tono transitado es GLOBAL del ministerio: SOLO lo cambia el líder
--     de ese ministerio (ministry_members.ministry_role = 'leader'). El admin
--     del tenant puede administrar canciones, pero no el tono.

create table if not exists public.songs (
  id             uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references public.congregations(id) on delete cascade,
  title          text not null,
  artist         text,
  original_key   text not null default 'C',
  content        text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists songs_congregation_idx on public.songs(congregation_id);

alter table public.ministries
  add column if not exists uses_songbook boolean not null default false;

create table if not exists public.ministry_song_transpositions (
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  song_id     uuid not null references public.songs(id) on delete cascade,
  semitones   integer not null default 0 check (semitones between -12 and 12),
  primary key (ministry_id, song_id)
);
alter table public.songs enable row level security;
alter table public.ministry_song_transpositions enable row level security;

-- Helper: ¿pertenezco al ministerio o soy admin de su congregación? --------
create or replace function public.songbook_is_member(p_ministry_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.ministries mi
    where mi.id = p_ministry_id and public.is_admin(mi.congregation_id)
  ) or exists (
    select 1 from public.ministry_members mm
    join public.memberships m on m.id = mm.membership_id
    where mm.ministry_id = p_ministry_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.songbook_is_leader(p_ministry_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions
as $$
  -- Sin bypass de admin: solo manda quien lidera ESTE ministerio.
  select exists (
    select 1 from public.ministry_members mm
    join public.memberships m on m.id = mm.membership_id
    where mm.ministry_id = p_ministry_id
      and m.user_id = (select auth.uid())
      and mm.ministry_role = 'leader'
  );
$$;

-- Lectura pública: letra sin los corchetes del cifrado --------------------
create or replace function public.songbook_public_songs(p_congregation_id uuid)
returns table (id uuid, title text, artist text, original_key text, lyrics text)
language sql stable security definer
set search_path = public, extensions
as $$
  select s.id, s.title, s.artist, s.original_key,
         regexp_replace(s.content, '\[[^\]]*\]', '', 'g') as lyrics
  from public.songs s
  where s.congregation_id = p_congregation_id
  order by s.title;
$$;

create or replace function public.songbook_ministries(p_congregation_id uuid)
returns table (id uuid, name text, uses_songbook boolean)
language sql stable security definer
set search_path = public, extensions
as $$
  select mi.id, mi.name, mi.uses_songbook
  from public.ministries mi
  where mi.congregation_id = p_congregation_id
  order by mi.name;
$$;

-- Cifrado completo: exige miembro del ministerio habilitado --------------
create or replace function public.songbook_ministry_songs(p_ministry_id uuid)
returns table (id uuid, title text, artist text, original_key text, content text, semitones integer)
language sql stable security definer
set search_path = public, extensions
as $$
  select s.id, s.title, s.artist, s.original_key, s.content,
         coalesce(tr.semitones, 0)
  from public.ministries mi
  join public.songs s on s.congregation_id = mi.congregation_id
  left join public.ministry_song_transpositions tr
    on tr.song_id = s.id and tr.ministry_id = mi.id
  where mi.id = p_ministry_id
    and mi.uses_songbook
    and public.songbook_is_member(p_ministry_id)
  order by s.title;
$$;

-- ¿Puedo cambiar el tono del ministerio? (para ocultar el control) --------
create or replace function public.songbook_can_edit_ministry(p_ministry_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions
as $$
  select public.songbook_is_leader(p_ministry_id);
$$;

-- Tono global del ministerio: SOLO el líder de ese ministerio -------------
create or replace function public.songbook_set_transpose(
  p_ministry_id uuid, p_song_id uuid, p_semitones integer
)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare v_congregation uuid;
begin
  if p_semitones is null or p_semitones < -12 or p_semitones > 12 then
    raise exception 'El tono debe estar entre -12 y 12 semitones.';
  end if;
  select mi.congregation_id into v_congregation
  from public.ministries mi where mi.id = p_ministry_id;
  if v_congregation is null then raise exception 'Ministerio inexistente.'; end if;
  if not public.songbook_is_leader(p_ministry_id) then
    raise exception 'Solo el líder del ministerio puede cambiar el tono.';
  end if;
  if not exists (select 1 from public.songs s
                 where s.id = p_song_id and s.congregation_id = v_congregation) then
    raise exception 'La canción no pertenece a esta congregación.';
  end if;
  insert into public.ministry_song_transpositions (ministry_id, song_id, semitones)
  values (p_ministry_id, p_song_id, p_semitones)
  on conflict (ministry_id, song_id) do update set semitones = excluded.semitones;
end;
$$;

-- Alta/edición/baja de canciones: solo la congregación (token) ------------
create or replace function public.songbook_create_song(
  p_token uuid, p_title text, p_artist text, p_key text, p_content text
)
returns uuid language plpgsql security definer
set search_path = public, extensions
as $$
declare v_cid uuid; v_id uuid;
begin
  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then raise exception 'Sesión de congregación inválida.'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'El título es obligatorio.';
  end if;
  insert into public.songs (congregation_id, title, artist, original_key, content)
  values (v_cid, btrim(p_title), nullif(btrim(coalesce(p_artist, '')), ''),
          coalesce(nullif(btrim(p_key), ''), 'C'), coalesce(p_content, ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.songbook_update_song(
  p_token uuid, p_song_id uuid, p_title text, p_artist text, p_key text, p_content text
)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare v_cid uuid;
begin
  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then raise exception 'Sesión de congregación inválida.'; end if;
  update public.songs
  set title = btrim(p_title), artist = nullif(btrim(coalesce(p_artist, '')), ''),
      original_key = coalesce(nullif(btrim(p_key), ''), 'C'),
      content = coalesce(p_content, ''), updated_at = now()
  where id = p_song_id and congregation_id = v_cid;
  if not found then raise exception 'Canción no encontrada en esta congregación.'; end if;
end;
$$;

create or replace function public.songbook_delete_song(p_token uuid, p_song_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare v_cid uuid;
begin
  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then raise exception 'Sesión de congregación inválida.'; end if;
  delete from public.songs where id = p_song_id and congregation_id = v_cid;
  if not found then raise exception 'Canción no encontrada en esta congregación.'; end if;
end;
$$;

-- Habilitar el cancionero al crear el ministerio -------------------------
create or replace function public.songbook_set_ministry_usage(
  p_token uuid, p_ministry_id uuid, p_enabled boolean
)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare v_cid uuid;
begin
  v_cid := public.tenant_from_token(p_token);
  if v_cid is null then raise exception 'Sesión de congregación inválida.'; end if;
  update public.ministries
  set uses_songbook = coalesce(p_enabled, false)
  where id = p_ministry_id and congregation_id = v_cid;
  if not found then raise exception 'Ministerio no encontrado en esta congregación.'; end if;
end;
$$;

-- Permisos ---------------------------------------------------------------
revoke execute on function public.songbook_public_songs(uuid) from public;
revoke execute on function public.songbook_ministries(uuid) from public;
revoke execute on function public.songbook_ministry_songs(uuid) from public, anon;
revoke execute on function public.songbook_can_edit_ministry(uuid) from public, anon;
revoke execute on function public.songbook_set_transpose(uuid, uuid, integer) from public, anon;
revoke execute on function public.songbook_create_song(uuid, text, text, text, text) from public;
revoke execute on function public.songbook_update_song(uuid, uuid, text, text, text, text) from public;
revoke execute on function public.songbook_delete_song(uuid, uuid) from public;
revoke execute on function public.songbook_set_ministry_usage(uuid, uuid, boolean) from public;

grant execute on function public.songbook_public_songs(uuid) to anon, authenticated;
grant execute on function public.songbook_ministries(uuid) to anon, authenticated;
grant execute on function public.songbook_ministry_songs(uuid) to authenticated;
grant execute on function public.songbook_can_edit_ministry(uuid) to authenticated;
grant execute on function public.songbook_set_transpose(uuid, uuid, integer) to authenticated;
grant execute on function public.songbook_create_song(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.songbook_update_song(uuid, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.songbook_delete_song(uuid, uuid) to anon, authenticated;
grant execute on function public.songbook_set_ministry_usage(uuid, uuid, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
