import { Box, ButtonBase, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { EmptyState, LoadingList } from '@/components/Feedback'
import type { MinistryItem } from '../hooks/useMinistriesData'
import { EntityIcon } from './EntityIcon'

interface Props {
  items: MinistryItem[]
  selectedId: string
  loading: boolean
  canDelete: boolean
  onSelect: (id: string) => void
  onEdit: (item: MinistryItem) => void
  onDelete: (id: string) => void
}

/** Listado con ícono asignado y acciones de editar/borrar por ministerio. */
export function MinistryList({
  items, selectedId, loading, canDelete, onSelect, onEdit, onDelete,
}: Props) {
  if (loading && items.length === 0) return <LoadingList rows={3} />
  if (items.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Sin ministerios ni grupos"
        description="Cuando la congregación los cree (o te designe líder), van a aparecer acá."
      />
    )
  }

  return (
    <Stack spacing={1}>
      {items.map((item) => (
        <Paper
          key={item.id}
          variant="outlined"
          sx={{ p: 1, borderColor: item.id === selectedId ? 'primary.main' : undefined }}
        >
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <ButtonBase
              onClick={() => onSelect(item.id)}
              sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', borderRadius: 1, p: 0.5 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                <EntityIcon
                  kind={item.isGroup ? 'groups' : 'ministries'}
                  iconKey={item.icon}
                  color="primary"
                  fontSize="small"
                />
                <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.isGroup ? 'Grupo' : 'Ministerio'}
                  </Typography>
                </Box>
                <Chip size="small" label={`${item.memberCount} ${item.memberCount === 1 ? 'miembro' : 'miembros'}`} />
              </Stack>
            </ButtonBase>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit(item)} aria-label={`Editar ${item.name}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canDelete && (
              <Tooltip title="Borrar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Borrar ${item.name}`}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
