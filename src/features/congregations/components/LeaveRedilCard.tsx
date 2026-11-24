import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Modal } from '@/components/Modal'
import { logout } from '@/supabase/login'
import { deleteTenantCongregation } from '../services/tenantDeletion'

const CONFIRM = 'DEJAR REDIL'

/** Zona de peligro del perfil del tenant: baja total e irreversible. */
export function LeaveRedilCard() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function confirm() {
    if (typed !== CONFIRM) return
    setBusy(true)
    setError('')
    try {
      await deleteTenantCongregation()
      await logout({ redirect: false })
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la baja.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'error.main' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>Dejar Redil</Typography>
          <Typography variant="body2" color="text.secondary">
            Borra la congregación, miembros, ministerios, grupos, cancionero, avisos y las cuentas de todos. No se puede deshacer.
          </Typography>
        </Box>
        <Button color="error" variant="outlined" size="small" onClick={() => { setTyped(''); setError(''); setOpen(true) }}>
          Dejar Redil
        </Button>
      </Stack>

      <Modal
        open={open}
        title="Dejar Redil"
        description="Baja definitiva de la congregación y de todas las cuentas asociadas."
        onClose={() => { if (!busy) setOpen(false) }}
        footer={
          <>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy || typed !== CONFIRM}
              onClick={() => void confirm()}
            >
              {busy ? 'Borrando…' : 'Borrar todo'}
            </button>
          </>
        }
      >
        <Stack spacing={1}>
          <Typography variant="body2">
            Escribí <strong>{CONFIRM}</strong> para confirmar. Se borrarán también los usuarios de Supabase Auth.
          </Typography>
          <TextField size="small" fullWidth label="Confirmación" value={typed} onChange={(event) => setTyped(event.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Modal>
    </Paper>
  )
}
