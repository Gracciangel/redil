import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, TextField, Typography,
} from '@mui/material'
import type { NewsInput, NewsItem } from '../services/newsService'

interface Props {
  open: boolean
  item: NewsItem | null
  busy: boolean
  onSave: (input: NewsInput) => void
  onClose: () => void
}

/** Formulario del aviso. La lógica de guardado vive en `useAnnouncementsView`. */
export function NewsFormDialog({ open, item, busy, onSave, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? '')
    setBody(item?.body ?? '')
    setImageUrl(item?.imageUrl ?? '')
    setIsGlobal(item?.isGlobal ?? false)
    setError(null)
  }, [open, item])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    onSave({
      title: title.trim(),
      body: body.trim() || null,
      imageUrl: imageUrl.trim() || null,
      isGlobal,
    })
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{item ? 'Editar aviso' : 'Nuevo aviso'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Título *" size="small" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus fullWidth />
            <TextField label="Mensaje" value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={5} fullWidth />
            <TextField label="URL de la imagen (opcional)" size="small" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} fullWidth />
            <FormControlLabel
              control={<Checkbox checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />}
              label="Público (visible para todos)"
            />
            <Typography variant="caption" color="text.secondary">
              Si no lo marcás, el aviso lo ven solo los miembros de tu congregación.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Guardando…' : 'Publicar'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
