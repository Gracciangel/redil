import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { MinistryMember } from '../services/leaderMinistries'

interface Props {
  candidates: MinistryMember[]
  assignedIds: Set<string>
  busy: string | null
  onAdd: (userId: string) => void
}

function labelOf(member: MinistryMember): string {
  return `${member.name} ${member.surname}`.trim() || member.email || 'Sin nombre'
}

/** Lista visible de miembros a sumar; excluye asignados y líderes. */
export function MinistryCandidateList({ candidates, assignedIds, busy, onAdd }: Props) {
  // Un líder ya tiene alcance (L) dentro de un ministerio: no puede sumarse
  // como miembro de otro. El filtro se aplica antes de renderizar.
  const available = candidates.filter(
    (member) => member.role !== 'leader' && !assignedIds.has(member.userId),
  )

  if (available.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay miembros disponibles. Quienes ya pertenecen al grupo o son líderes no se pueden sumar.
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {available.map((member) => (
        <Paper key={member.userId} variant="outlined" sx={{ p: 1.25 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{labelOf(member)}</Typography>
              {member.email && (
                <Typography variant="caption" color="text.secondary">{member.email}</Typography>
              )}
            </Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => onAdd(member.userId)}
              disabled={busy !== null}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Sumar
            </Button>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
