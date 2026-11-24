import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import type { MinistryItem } from '../hooks/useMinistriesData'
import { EntityIcon } from './EntityIcon'

interface Props {
  item: MinistryItem
  leaderName: string | null
  onEdit: () => void
}

/** Detalle de solo lectura del ministerio elegido; la edición vive en el modal. */
export function MinistryDetail({ item, leaderName, onEdit }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <EntityIcon
          kind={item.isGroup ? 'groups' : 'ministries'}
          iconKey={item.icon}
          color="primary"
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{item.name}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size="small" label={item.isGroup ? 'Grupo' : 'Ministerio'} />
            <Typography variant="caption" color="text.secondary">
              Líder: {leaderName ?? 'sin asignar'}
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Button size="small" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
            Editar
          </Button>
        </Box>
      </Stack>
    </Paper>
  )
}
