import { ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material'
import type { SongSummary } from '../types'

interface Props {
  songs: SongSummary[]
  availableIds: string[]
  selectedId: string
  canManage: boolean
  onSelect: (id: string) => void
  onEdit: (song: SongSummary) => void
  onDelete: (id: string) => void
}

/** Repertorio público: título, artista y letra; el cifrado se abre aparte. */
export function SongList({
  songs, availableIds, selectedId, canManage, onSelect, onEdit, onDelete,
}: Props) {
  return (
    <Stack spacing={1}>
      {songs.map((song) => (
        <Paper key={song.id} variant="outlined" sx={{ p: 1, borderColor: song.id === selectedId ? 'primary.main' : undefined }}>
          <ButtonBase onClick={() => onSelect(song.id)} sx={{ width: '100%', justifyContent: 'flex-start', borderRadius: 1 }}>
            <Stack spacing={0.5} sx={{ width: '100%', textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 600 }}>{song.title}</Typography>
              <Typography variant="caption" color="text.secondary">{song.artist || 'Artista sin definir'} · {song.originalKey}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{song.lyrics || 'Sin letra cargada.'}</Typography>
            </Stack>
          </ButtonBase>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            {availableIds.includes(song.id) && <Chip size="small" color="primary" variant="outlined" label="Con cifrado" />}
            {canManage && (
              <>
                <Chip size="small" label="Editar" onClick={() => onEdit(song)} />
                <Chip size="small" color="error" variant="outlined" label="Borrar" onClick={() => onDelete(song.id)} />
              </>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
