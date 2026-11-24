import { callRpc } from '@/supabase/supabase'
import { requireToken } from '@/features/congregations/services/tenantRpc'
import type { SongInput, SongbookMinistry, SongSheetData, SongSummary } from '../types'

type Row = Record<string, unknown>

const asText = (value: unknown) => (value == null ? null : String(value))

export async function listPublicSongs(congregationId: string): Promise<SongSummary[]> {
  const rows = await callRpc<Row[]>('songbook_public_songs', { p_congregation_id: congregationId })
  return (rows ?? []).map((row) => ({
    id: String(row.id), title: String(row.title ?? ''), artist: asText(row.artist),
    originalKey: String(row.original_key ?? 'C'), lyrics: String(row.lyrics ?? ''),
  }))
}

export async function listSongbookMinistries(congregationId: string): Promise<SongbookMinistry[]> {
  const rows = await callRpc<Row[]>('songbook_ministries', { p_congregation_id: congregationId })
  return (rows ?? []).map((row) => ({
    id: String(row.id), name: String(row.name ?? ''), usesSongbook: Boolean(row.uses_songbook),
  }))
}

export async function listMinistrySongs(ministryId: string): Promise<SongSheetData[]> {
  const rows = await callRpc<Row[]>('songbook_ministry_songs', { p_ministry_id: ministryId })
  return (rows ?? []).map((row) => ({
    id: String(row.id), title: String(row.title ?? ''), artist: asText(row.artist),
    originalKey: String(row.original_key ?? 'C'), content: String(row.content ?? ''),
    semitones: Number(row.semitones ?? 0),
  }))
}

export async function canEditMinistry(ministryId: string): Promise<boolean> {
  const data = await callRpc<boolean>('songbook_can_edit_ministry', { p_ministry_id: ministryId })
  return Boolean(data)
}

export async function setTranspose(ministryId: string, songId: string, semitones: number): Promise<void> {
  await callRpc('songbook_set_transpose', {
    p_ministry_id: ministryId, p_song_id: songId, p_semitones: semitones,
  })
}

export async function createSong(input: SongInput): Promise<void> {
  await callRpc('songbook_create_song', {
    p_token: requireToken(), p_title: input.title, p_artist: input.artist,
    p_key: input.originalKey, p_content: input.content,
  })
}

export async function updateSong(id: string, input: SongInput): Promise<void> {
  await callRpc('songbook_update_song', {
    p_token: requireToken(), p_song_id: id, p_title: input.title, p_artist: input.artist,
    p_key: input.originalKey, p_content: input.content,
  })
}

export async function deleteSong(id: string): Promise<void> {
  await callRpc('songbook_delete_song', { p_token: requireToken(), p_song_id: id })
}

export async function setMinistryUsage(ministryId: string, enabled: boolean): Promise<void> {
  await callRpc('songbook_set_ministry_usage', {
    p_token: requireToken(), p_ministry_id: ministryId, p_enabled: enabled,
  })
}
