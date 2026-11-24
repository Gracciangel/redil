import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import { formatShortDate } from '@/lib/format'
import type { NewsItem } from '../services/newsService'

interface Props {
  item: NewsItem
  onEdit?: (item: NewsItem) => void
  onDelete?: (item: NewsItem) => void
}

/** Tarjeta de aviso. Sin acciones queda en modo solo lectura. */
export function NewsCard({ item, onEdit, onDelete }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 650 }}>{item.title}</Typography>
        {item.isGlobal && <Chip size="small" icon={<PublicOutlinedIcon />} label="Público" />}
      </Stack>
      {item.imageUrl && (
        <Box
          component="img"
          src={item.imageUrl}
          alt={item.title}
          sx={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 1 }}
        />
      )}
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>{item.body ?? ''}</Typography>
      <Typography variant="caption" color="text.secondary">{formatShortDate(item.publishedAt)}</Typography>
      {(onEdit || onDelete) && (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          {onEdit && (
            <IconButton size="small" aria-label={`Editar ${item.title}`} onClick={() => onEdit(item)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton size="small" color="error" aria-label={`Borrar ${item.title}`} onClick={() => onDelete(item)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      )}
    </Paper>
  )
}
