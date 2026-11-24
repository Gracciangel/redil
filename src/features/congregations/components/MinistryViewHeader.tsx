import { Alert, Stack, Typography } from '@mui/material'
import type { Notice } from '../hooks/useActionRunner'
import { TenantSessionAlert } from './TenantSessionAlert'

interface Props {
  notice: Notice | null
  error: Error | null
  isTenant: boolean
}

/** Encabezado y avisos de la vista Ministerios, separados de la vista pura. */
export function MinistryViewHeader({ notice, error, isTenant }: Props) {
  return (
    <>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Organización
        </Typography>
        <Typography variant="h4" component="h1">Ministerios y grupos</Typography>
        <Typography color="text.secondary" style={{
          textAlign:'center'
        }}>
          Elegí uno para ver su líder e integrantes, y gestionarlo desde acá.
        </Typography>
      </Stack>

      {notice && (
        <Alert severity={notice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
          {notice.text}
        </Alert>
      )}
      {isTenant && <TenantSessionAlert error={error} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
    </>
  )
}
