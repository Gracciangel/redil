import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material'

/**
 * Overlay global de carga: cubre toda la pantalla con blur y mantiene el spinner
 * siempre centrado. Es solo para la carga de la app (Auth, sesión del tenant,
 * Suspense y guard R7). Las listas siguen usando sus skeletons in-place.
 */
export function LoadingOverlay({ label = 'Cargando…' }: { label?: string }) {
  return (
    <Backdrop
      open
      role="status"
      aria-live="polite"
      sx={{
        // Por encima de la tabbar (50), modales propios (100) y MUI (1300).
        zIndex: 9999,
        color: 'primary.main',
        bgcolor: 'rgba(10, 5, 12, 0.68)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <Stack spacing={2} sx={{ px: 3, textAlign: 'center', alignItems: 'center' }}>
        <CircularProgress color="inherit" size={44} thickness={4} />
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Stack>
    </Backdrop>
  )
}
