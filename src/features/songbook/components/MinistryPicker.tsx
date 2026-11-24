import { Box, Button, Chip, Stack, Switch, Typography } from '@mui/material'
import type { SongbookMinistry } from '../types'

interface Props {
  ministries: SongbookMinistry[]
  selectedId: string
  canManage: boolean
  busy: boolean
  onSelect: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

/** El ministerio habilitado es el único que puede leer el cifrado. */
export function MinistryPicker({
  ministries, selectedId, canManage, busy, onSelect, onToggle,
}: Props) {
  if (ministries.length === 0) {
    return <Typography variant="body2" color="text.secondary">Todavía no hay ministerios ni grupos.</Typography>
  }

  return (
    <Stack spacing={0.5}>
      {ministries.map((ministry) => (
        <Box key={ministry.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small" variant={ministry.id === selectedId ? 'contained' : 'text'}
            onClick={() => onSelect(ministry.id)} sx={{ flex: 1, justifyContent: 'flex-start' }}
          >
            {ministry.name}
          </Button>
          {ministry.usesSongbook
            ? <Chip size="small" color="primary" variant="outlined" label="Cancionero" />
            : <Chip size="small" label="Sin cancionero" />}
          {canManage && (
            <Switch
              size="small" checked={ministry.usesSongbook} disabled={busy}
              slotProps={{ input: { 'aria-label': `Usar cancionero en ${ministry.name}` } }}
              onChange={(event) => onToggle(ministry.id, event.target.checked)}
            />
          )}
        </Box>
      ))}
    </Stack>
  )
}
