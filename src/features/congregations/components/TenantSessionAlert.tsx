import { useNavigate } from 'react-router-dom'
import { Alert, Button } from '@mui/material'
import { clearTenantSession } from '@/supabase/login'
import { isSessionExpired, isTenantSessionError, useCongregationStore } from '@/store/CongregationStore'

interface Props {
  /**
   * Sin prop: aviso global, reacciona al vencimiento local del token.
   * Con error: aviso de vista, reacciona solo a un error de sesión del backend.
   * Así se pueden montar ambos sin duplicar mensajes.
   */
  error?: Error | null
}

/** Aviso de token de tenant vencido/inválido, sin regex duplicados. */
export function TenantSessionAlert({ error = null }: Props) {
  const navigate = useNavigate()
  const congregation = useCongregationStore((s) => s.congregation)

  if (!congregation) return null
  if (error ? !isTenantSessionError(error) : !isSessionExpired(congregation)) return null

  function handleRelogin() {
    clearTenantSession()
    navigate('/login', { replace: true })
  }

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" onClick={handleRelogin}>
          Ingresar de nuevo
        </Button>
      }
    >
      Tu sesión de congregación venció o no es válida (dura 12 horas). Ingresá de nuevo para refrescar el acceso.
    </Alert>
  )
}
