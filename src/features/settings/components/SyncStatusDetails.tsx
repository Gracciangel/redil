import { Box, Stack, Typography } from '@mui/material'
import { formatRelative, pluralize } from '@/lib/format'
import type { SyncStatus } from '@/lib/sync'

function syncStateLabel(sync: SyncStatus, apiConfigured: boolean): string {
  if (!apiConfigured) return 'Solo local: los datos no salen del dispositivo'
  switch (sync.state) {
    case 'syncing': return 'Sincronizando…'
    case 'error': return 'Error de sincronización'
    case 'unconfigured': return 'API sin configurar'
    default: return 'Al día'
  }
}

export function SyncStatusDetails({ sync, apiConfigured }: { sync: SyncStatus; apiConfigured: boolean }) {
  const rows = [
    ['Estado', syncStateLabel(sync, apiConfigured)],
    ['Cambios pendientes', pluralize(sync.pending, 'cambio', 'cambios')],
    ['Última sincronización', sync.lastSyncAt ? formatRelative(sync.lastSyncAt) : 'Nunca'],
  ] as const

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        {rows.map(([label, value]) => (
          <Box key={label}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>{label}</Typography>
            <Typography variant="body2">{value}</Typography>
          </Box>
        ))}
        {sync.error && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>Último error</Typography>
            <Typography variant="body2" color="error.main">{sync.error}</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}