import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { ButtonGoogle } from '@/components/ButtonGoogle'
import { CongregationAccess } from '@/features/congregations/components/CongregationAccess'
import { loginWithGoogle } from '@/supabase/login'
import { useUserStore } from '@/store/Store'
import logo from '../../public/icons/redil-logo-white.png'
import '../principalView.css'

/** Supabase devuelve los errores de OAuth en la query o en el hash. */
function readOAuthError(): string | null {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = search.get('error') ?? hash.get('error')
  if (!code) return null
  if (code === 'access_denied') return 'Inicio de sesión cancelado.'
  return search.get('error_description') ?? hash.get('error_description') ?? 'No se pudo iniciar sesión con Google.'
}

export const PrincipalView = () => {
  const user = useUserStore((s) => s.user)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(() => readOAuthError())
  const [mode, setMode] = useState<'member' | 'congregation'>('member')
  const [busy, setBusy] = useState(false)
  const showLargeLogo = mode !== 'congregation'

  useEffect(() => {
    if (readOAuthError()) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const auth = async () => {
    setBusy(true)
    setError(null)
    try {
      // Redirige a Google; Supabase vuelve a /login con la sesión y AuthProvider
      // actualiza el store, que a su vez redirige a "/" desde LoginRoute.
      await loginWithGoogle()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión con Google.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="principal-view">
      <img src={logo} alt="Redil Logo" className={showLargeLogo ? 'principal-logo principal-logo--large' : 'principal-logo'} />

      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          size="small"
          variant={mode === 'member' ? 'contained' : 'outlined'}
          onClick={() => setMode('member')}
        >
          Miembro
        </Button>
        <Button
          size="small"
          variant={mode === 'congregation' ? 'contained' : 'outlined'}
          onClick={() => setMode('congregation')}
        >
          Congregación
        </Button>
      </Stack>

      <Box sx={{ width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 230px)', overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}>
        <Box key={mode} className="slide-transition">
          {mode === 'member' ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1.5 }} color="text.secondary">
                Iniciá sesión para unirte a tu congregación
              </Typography>
              {!user ? (
                <Box sx={{ opacity: busy ? 0.7 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
                  <ButtonGoogle action={() => void auth()} />
                </Box>
              ) : (
                <Alert severity="success" sx={{ py: 0.5 }}>Sesión iniciada como {user.displayName || user.email || 'usuario'}.</Alert>
              )}
            </Box>
          ) : (
            <CongregationAccess
              onLoginSuccess={() => navigate('/code', { replace: true })}
            />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 1, py: 0, maxWidth: 520, width: '100%' }}>{error}</Alert>}
    </div>
  )
}