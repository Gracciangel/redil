import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import type { SongInput } from '../types'
import { FLATS } from '../lib/notes'

interface Props {
  open: boolean
  initial: SongInput
  busy: boolean
  onClose: () => void
  onSave: (input: SongInput) => void
}

/** Alta y edición de canciones: la congregación carga ChordPro con corchetes. */
export function SongFormDialog({ open, initial, busy, onClose, onSave }: Props) {
  const [form, setForm] = useState<SongInput>(initial)
  const patch = (key: keyof SongInput, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial.title ? 'Editar canción' : 'Nueva canción'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField label="Título" value={form.title} required fullWidth onChange={(e) => patch('title', e.target.value)} />
          <TextField label="Artista" value={form.artist} fullWidth onChange={(e) => patch('artist', e.target.value)} />
          <TextField select label="Tono original" value={form.originalKey} fullWidth onChange={(e) => patch('originalKey', e.target.value)}>
            {FLATS.map((note) => <MenuItem key={note} value={note}>{note}</MenuItem>)}
          </TextField>
          <TextField
            label="Letra con cifrado" value={form.content} fullWidth multiline minRows={8}
            helperText="Usá corchetes para los acordes: [C]Amazing [G]grace."
            onChange={(e) => patch('content', e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button variant="contained" disabled={busy || !form.title.trim()} onClick={() => onSave(form)}>
          {busy ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
