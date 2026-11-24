import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { getMyMembership } from '@/features/congregations/services/membership'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useAsyncData } from '@/lib/hooks'
import { bump } from '@/lib/live'
import { clearAuthSession, isAuthSessionError } from '@/supabase/login'
import { useCongregationStore } from '@/store/CongregationStore'

/** Loader estable para `useAsyncData`. */
function loadMembership() {
  return getMyMembership()
}

/**
 * Guard global de R7: un miembro autenticado sin relación con un tenant no puede
 * ver ninguna pantalla del app. El tenant no pasa por acá: su sesión es un RPC
 * con password (auth.uid() es null) y vive en CongregationStore.
 */
export function MemberAccessGuard() {
  const congregation = useCongregationStore((s) => s.congregation)
  const navigate = useNavigate()
  const { data, loading, error } = useAsyncData(loadMembership, [], !congregation)

  async function handleRelogin() {
    await clearAuthSession() // limpia Auth y el store de usuario sin usar Supabase acá
    navigate('/login', { replace: true })
  }

  if (congregation) return <Outlet />

  // 401 / JWT vencido: requiere re-login. Red caída o RPC ausente: solo reintentar.
  if (error) {
    const authError = isAuthSessionError(error)
    return (
      <Box className="page">
        <Alert
          severity="error"
          action={
            <Stack direction="row" spacing={1}>
              {authError && (
                <Button color="inherit" size="small" onClick={() => void handleRelogin()}>
                  Iniciar sesión
                </Button>
              )}
              <Button color="inherit" size="small" onClick={() => bump()}>Reintentar</Button>
            </Stack>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {authError ? 'Tu sesión venció o no es válida' : 'No pudimos verificar tu membresía'}
          </Typography>
          <Typography variant="body2">{error.message}</Typography>
        </Alert>
      </Box>
    )
  }

  if (loading && !data) return <LoadingOverlay label="Verificando acceso…" />

  // Sin membresía el único destino permitido es /acceso.
  if (!data) return <Navigate to="/acceso" replace />

  return <Outlet />
}
