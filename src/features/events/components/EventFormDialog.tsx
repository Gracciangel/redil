import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import {
  fromDateAndTime,
  nextHourTimeValue,
  toDateInputValue,
  toTimeInputValue,
} from '@/lib/format'
import { saveEvent, type EventInput } from '@/lib/repo'
import type { CongregationEvent } from '@/lib/types'

interface Props {
  open: boolean
  event: CongregationEvent | null
  /** `YYYY-MM-DD` elegido en el calendario; se usa al crear un evento. */
  initialDate?: string | null
  onClose: () => void
}

export function EventFormDialog({ open, event, initialDate, onClose }: Props) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (event) {
      setDate(toDateInputValue(event.startsAt))
      setTime(toTimeInputValue(event.startsAt))
      setDurationMinutes(event.durationMinutes)
      setLocation(event.location ?? '')
      setDescription(event.description ?? '')
      setTitle(event.title)
    } else {
      const now = new Date()
      setDate(initialDate || toDateInputValue(now))
      setTime(nextHourTimeValue())
      setDurationMinutes(60)
      setLocation('')
      setDescription('')
      setTitle('')
    }
    setError(null)
    setSaving(false)
  }, [open, event, initialDate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return setError('El título es obligatorio.')
    const iso = fromDateAndTime(date, time)
    if (!iso) return setError('Indicá una fecha y un horario válidos.')

    const input: EventInput = { title: title.trim(), startsAt: iso, durationMinutes, location, description }
    setSaving(true)
    setError(null)
    try {
      await saveEvent(input, event?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{event ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
      <form id="event-form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Fecha *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Horario *"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField select label="Duración" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} fullWidth>
              {[30, 45, 60, 75, 90, 120, 180].map((minutes) => (
                <MenuItem key={minutes} value={minutes}>
                  {minutes < 60 ? `${minutes} min` : `${minutes / 60} ${minutes === 60 ? 'hora' : 'horas'}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Lugar" value={location} onChange={(e) => setLocation(e.target.value)} fullWidth />
            <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
