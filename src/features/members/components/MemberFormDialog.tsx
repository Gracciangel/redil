import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { saveMember, type MemberInput } from '@/lib/repo'
import { MEMBER_ROLES, ROLE_LABELS, type Member, type MemberRole } from '@/lib/types'

interface Props {
  open: boolean
  member: Member | null
  onClose: () => void
}

export function MemberFormDialog({ open, member, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [group, setGroup] = useState('')
  const [role, setRole] = useState<MemberRole>('miembro')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(member?.name ?? '')
    setPhone(member?.phone ?? '')
    setEmail(member?.email ?? '')
    setGroup(member?.group ?? '')
    setRole(member?.role ?? 'miembro')
    setNotes(member?.notes ?? '')
    setError(null)
    setSaving(false)
  }, [open, member])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('El correo electrónico no parece válido.')
      return
    }

    const input: MemberInput = { name, phone, email, group, role, notes }
    setSaving(true)
    setError(null)
    try {
      await saveMember(input, member?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el miembro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{member ? 'Editar miembro' : 'Nuevo miembro'}</DialogTitle>
      <form id="member-form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nombre y apellidos *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
              />
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Grupo o ministerio"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Rol"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                fullWidth
              >
                {MEMBER_ROLES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {ROLE_LABELS[option]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText="Visitas, necesidades, cumpleaños…"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={saving} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}