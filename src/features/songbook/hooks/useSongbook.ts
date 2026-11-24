import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActionRunner } from '@/features/congregations/hooks/useActionRunner'
import { getMyMembership, previewCongregationByCode } from '@/features/congregations/services/membership'
import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'
import * as api from '../services/songbook'
import type { Notation, SongInput } from '../types'

/** Viewmodel del cancionero: resuelve la congregación y el alcance del actor. */
export function useSongbook() {
  const tenant = useCongregationStore((s) => s.congregation)
  const user = useUserStore((s) => s.user)
  const [params] = useSearchParams()
  const urlCongregationId = params.get('cid') ?? ''
  const [congregationId, setCongregationId] = useState('')
  const [ministryId, setMinistryId] = useState('')
  const [songId, setSongId] = useState('')
  const [notation, setNotation] = useState<Notation>('american')
  const { notice, busy, run, setNotice } = useActionRunner()

  useEffect(() => {
    if (tenant?.id) { setCongregationId(tenant.id); return }
    if (urlCongregationId) { setCongregationId(urlCongregationId); return }
    if (!user) { setCongregationId(''); return }
    let alive = true
    void getMyMembership()
      .then((membership) => { if (alive) setCongregationId(membership?.congregation_id ?? '') })
      .catch(() => undefined)
    return () => { alive = false }
  }, [tenant?.id, user, urlCongregationId])

  const songs = useAsyncData(() => api.listPublicSongs(congregationId), [congregationId], Boolean(congregationId))
  const ministries = useAsyncData(() => api.listSongbookMinistries(congregationId), [congregationId], Boolean(congregationId))
  const sheets = useAsyncData(() => api.listMinistrySongs(ministryId), [ministryId], Boolean(ministryId))
  const access = useAsyncData(() => api.canEditMinistry(ministryId), [ministryId], Boolean(ministryId) && Boolean(user))

  const isTenant = Boolean(tenant)
  const isPublic = !tenant && !user
  const canManage = isTenant
  // El tono no lo habilita la sesión de congregación: solo el rol de líder.
  const canEditTone = Boolean(access.data)
  const list = sheets.data ?? []
  const selected = list.find((song) => song.id === songId) ?? list[0] ?? null

  function handleTranspose(semitones: number) {
    if (!canEditTone || !selected || !ministryId) return
    void run('tone', () => api.setTranspose(ministryId, selected.id, semitones), 'Tono actualizado para el ministerio.')
  }

  function handleSave(input: SongInput, editingId: string | null) {
    void run('song', () => editingId ? api.updateSong(editingId, input) : api.createSong(input),
      editingId ? 'Canción actualizada.' : 'Canción agregada.')
  }

  function handleDelete(id: string) {
    void run('delete', () => api.deleteSong(id), 'Canción eliminada.')
  }

  function handleUsage(id: string, enabled: boolean) {
    void run('usage', () => api.setMinistryUsage(id, enabled), enabled ? 'Cancionero habilitado.' : 'Cancionero deshabilitado.')
  }

  function handlePublicCode(code: string) {
    void run('public', async () => {
      const preview = await previewCongregationByCode(code)
      if (!preview) throw new Error('No encontramos una congregación con ese código.')
      setCongregationId(preview.id)
    }, 'Congregación encontrada.')
  }

  return {
    songs: songs.data ?? [], ministries: ministries.data ?? [], sheets: sheets.data ?? [],
    loading: songs.loading || ministries.loading || sheets.loading,
    error: songs.error ?? ministries.error ?? sheets.error,
    notice, busy, setNotice, isTenant, isPublic, canManage, canEditTone,
    congregationId, ministryId, setMinistryId, songId, setSongId, selected,
    notation, setNotation,
    handleTranspose, handleSave, handleDelete, handleUsage, handlePublicCode,
  }
}
