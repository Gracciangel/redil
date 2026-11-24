import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import PersonRemoveAlt1OutlinedIcon from '@mui/icons-material/PersonRemoveAlt1Outlined'
import type { MinistryMember, MinistryRole } from '../services/leaderMinistries'
import { RoleBadge } from './RoleBadge'

interface Props {
  members: MinistryMember[]
  error?: string | null
  busy: string | null
  readOnly?: boolean
  onRole: (userId: string, role: MinistryRole) => void
  onDrop: (userId: string) => void
}

/** Integrantes con su alcance (L); en el modal permite cambiar rol y quitarlos. */
export function MinistryMemberList({
  members, error, busy, readOnly = false, onRole, onDrop,
}: Props) {
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Este ministerio o grupo todavía no tiene integrantes.
      </Typography>
    )
  }

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {members.map((member) => (
        <Paper key={member.userId} variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {`${member.name} ${member.surname}`.trim() || member.email}
              </Typography>
              <RoleBadge role={member.role} />
            </Stack>
            {!readOnly && (
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Rol en el grupo"
                  value={member.role}
                  onChange={(event) => onRole(member.userId, event.target.value as MinistryRole)}
                  disabled={busy !== null}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="member">Miembro</MenuItem>
                  <MenuItem value="leader">Líder</MenuItem>
                </TextField>
                <Button
                  size="small"
                  color="error"
                  startIcon={<PersonRemoveAlt1OutlinedIcon />}
                  onClick={() => onDrop(member.userId)}
                  disabled={busy !== null}
                >
                  Quitar
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
