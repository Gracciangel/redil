import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button } from '@mui/material'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { deleteTenantMember } from '../services/tenantDeletion'

interface Props {
  userId: string
  name: string
}

/** Baja irreversible de una persona desde su perfil, solo para el tenant. */
export function DeleteMemberButton({ userId, name }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await deleteTenantMember(userId)
      setOpen(false)
      navigate('/miembros', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el miembro.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outlined" color="error" size="small" onClick={() => { setError(''); setOpen(true) }}>
        Eliminar de Redil
      </Button>
      <ConfirmDialog
        open={open}
        title="Eliminar miembro de Redil"
        message={`Se borrarán la cuenta de ${name}, su perfil y todo su contenido en esta congregación. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
        onCancel={() => { if (!busy) setOpen(false) }}
        onConfirm={() => void confirm()}
      />
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </>
  )
}
