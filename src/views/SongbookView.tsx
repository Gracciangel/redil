import { useState } from 'react'
import { Alert, Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { MinistryPicker } from '@/features/songbook/components/MinistryPicker'
import { PublicCongregationPicker } from '@/features/songbook/components/PublicCongregationPicker'
import { SongFormDialog } from '@/features/songbook/components/SongFormDialog'
import { SongList } from '@/features/songbook/components/SongList'
import { SongSheet } from '@/features/songbook/components/SongSheet'
import { TransposeControl } from '@/features/songbook/components/TransposeControl'
import { useSongbook } from '@/features/songbook/hooks/useSongbook'
import type { SongInput, SongSummary } from '@/features/songbook/types'

const BLANK: SongInput = { title: '', artist: '', originalKey: 'C', content: '' }

/** Vista pura del cancionero: datos y permisos vienen de `useSongbook`. */
export function SongbookView() {
  const vm = useSongbook()
  const [editing, setEditing] = useState<{ id: string | null; form: SongInput } | null>(null)
  const [confirmId, setConfirmId] = useState('')
  const currentId = vm.songId || vm.selected?.id || vm.songs[0]?.id || ''
  const publicSong = vm.songs.find((song) => song.id === currentId) ?? null
  const sheet = vm.selected?.id === currentId ? vm.selected : null
  function openEdit(song: SongSummary) {
    const content = vm.sheets.find((item) => item.id === song.id)?.content ?? ''
    setEditing({ id: song.id, form: { title: song.title, artist: song.artist ?? '', originalKey: song.originalKey, content } })
  }
  if (vm.loading && vm.songs.length === 0) return <LoadingList rows={4} />

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1">Cancionero</Typography>
          <Typography color="text.secondary">Título y letra son públicos; el cifrado queda dentro del ministerio.</Typography>
        </Box>
        {vm.canManage && <Button startIcon={<AddIcon />} variant="contained" onClick={() => setEditing({ id: null, form: BLANK })}>Nueva canción</Button>}
      </Stack>
      {vm.isPublic && !vm.congregationId && <PublicCongregationPicker busy={vm.busy === 'public'} onSubmit={vm.handlePublicCode} />}
      {vm.notice && <Alert severity={vm.notice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>{vm.notice.text}</Alert>}
      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error.message}</Alert>}
      {vm.songs.length === 0 && <EmptyState icon="book" title="Sin canciones" description="Todavía no se cargó ninguna canción." />}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Repertorio</Typography>
          <SongList
            songs={vm.songs} availableIds={vm.sheets.map((song) => song.id)} selectedId={currentId}
            canManage={vm.canManage} onSelect={vm.setSongId} onEdit={openEdit} onDelete={setConfirmId}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Ministerios</Typography>
          <MinistryPicker
            ministries={vm.ministries} selectedId={vm.ministryId} canManage={vm.canManage}
            busy={vm.busy !== null} onSelect={vm.setMinistryId} onToggle={vm.handleUsage}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {!publicSong ? (
              <Typography color="text.secondary">Elegí una canción del repertorio.</Typography>
            ) : (
              <>
                <Typography variant="h6">{publicSong.title}</Typography>
                <Typography variant="caption" color="text.secondary">{publicSong.artist || 'Artista sin definir'}</Typography>
                <Box sx={{ mt: 2 }}>
                  {sheet && (
                    <TransposeControl
                      semitones={sheet.semitones} notation={vm.notation} canEdit={vm.canEditTone}
                      busy={vm.busy === 'tone'} onTranspose={vm.handleTranspose} onNotation={vm.setNotation}
                    />
                  )}
                  {sheet ? (
                    <SongSheet content={sheet.content} semitones={sheet.semitones} notation={vm.notation} />
                  ) : (
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{publicSong.lyrics || 'Sin letra cargada.'}</Typography>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {editing && (
        <SongFormDialog
          key={editing.id ?? 'new'} open initial={editing.form} busy={vm.busy === 'song'}
          onClose={() => setEditing(null)}
          onSave={(form) => { vm.handleSave(form, editing.id); setEditing(null) }}
        />
      )}
      <ConfirmDialog
        open={Boolean(confirmId)} title="Borrar canción" message="Se quitará del cancionero de la congregación."
        confirmLabel="Borrar" busyLabel="Borrando…" onCancel={() => setConfirmId('')}
        onConfirm={() => { vm.handleDelete(confirmId); setConfirmId('') }}
      />
    </Box>
  )
}
