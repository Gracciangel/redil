import { Box, IconButton, Paper, Stack, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import { dateBadge, formatEventDay, formatTimeRange } from '@/lib/format'
import type { CongregationEvent } from '@/lib/types'

interface Props {
  event: CongregationEvent
  past?: boolean
  /** Si se omite, la card se muestra en modo solo lectura. */
  onEdit?: () => void
  onDelete?: () => void
}

export function EventCard({ event, past, onEdit, onDelete }: Props) {
  const badge = dateBadge(event.startsAt)
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start', opacity: past ? 0.65 : 1 }}>
      <Box sx={{ width: 58, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, py: 1, flex: '0 0 auto' }}>
        <Typography variant="caption" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>{badge.weekday}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{badge.day}</Typography>
        <Typography variant="caption" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1 }}>{badge.month}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'baseline' } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{event.title}</Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>{formatEventDay(event.startsAt)}</Typography>
        </Stack>
        <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 0.5, color: 'text.secondary', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">{formatTimeRange(event.startsAt, event.durationMinutes)}</Typography>
          </Stack>
          {event.location && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PlaceOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{event.location}</Typography>
            </Stack>
          )}
        </Stack>
        {event.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{event.description}</Typography>}
      </Box>
      {(onEdit || onDelete) && (
        <Stack direction="row" spacing={0.5}>
          {onEdit && <IconButton aria-label={`Editar ${event.title}`} onClick={onEdit}><EditOutlinedIcon /></IconButton>}
          {onDelete && <IconButton aria-label={`Eliminar ${event.title}`} color="error" onClick={onDelete}><DeleteOutlinedIcon /></IconButton>}
        </Stack>
      )}
    </Paper>
  )
}