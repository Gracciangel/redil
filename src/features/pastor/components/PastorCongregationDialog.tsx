import { useEffect, useState, type FormEvent } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import type { PastorCongregation, PastorInput } from '../services/pastorService'

interface Props {
  open: boolean
  pastor: PastorCongregation
  busy: boolean
  onClose: () => void
  onSave: (input: PastorInput) => void
}

function toInput(pastor: PastorCongregation): PastorInput {
  return {
    name: pastor.name, surname: pastor.surname, bio: pastor.bio,
    credential1: pastor.credential1, credential2: pastor.credential2,
    credential3: pastor.credential3,
  }
}

export function PastorCongregationDialog({ open, pastor, busy, onClose, onSave }: Props) {
  const [form, setForm] = useState<PastorInput>(() => toInput(pastor))

  useEffect(() => {
    if (open) setForm(toInput(pastor))
  }, [open, pastor])

  function set(field: keyof PastorInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.surname.trim()) return
    onSave(form)
    onClose()
  }

  const complete = Boolean(form.name.trim() && form.surname.trim())

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Datos del pastor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField fullWidth required size="small" label="Nombre" value={form.name}
              onChange={(event) => set('name', event.target.value)} />
            <TextField fullWidth required size="small" label="Apellido" value={form.surname}
              onChange={(event) => set('surname', event.target.value)} />
            <TextField fullWidth multiline minRows={3} size="small" label="Biografía (opcional)"
              value={form.bio} onChange={(event) => set('bio', event.target.value)} />
            {[1, 2, 3].map((number) => (
              <TextField
                key={number}
                fullWidth
                size="small"
                label={`Ruta de la credencial ${number}`}
                placeholder="https://…/diploma.png"
                value={form[`credential${number}` as keyof PastorInput]}
                onChange={(event) => set(`credential${number}` as keyof PastorInput, event.target.value)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={busy || !complete}>Guardar</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
