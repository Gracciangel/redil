import { MenuItem, TextField } from '@mui/material'
import type { MinistryMember } from '../services/leaderMinistries'

interface Props {
  members: MinistryMember[]
  leaderId: string | null
  busy: string | null
  onChange: (userId: string) => void
}

/** Designa al líder entre los integrantes del ministerio o grupo. */
export function MinistryLeaderSelect({ members, leaderId, busy, onChange }: Props) {
  return (
    <TextField
      select
      size="small"
      label="Líder"
      value={leaderId ?? ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={busy !== null}
      fullWidth
    >
      <MenuItem value="">Sin líder</MenuItem>
      {members.map((member) => (
        <MenuItem key={member.userId} value={member.userId}>
          {`${member.name} ${member.surname}`.trim() || member.email}
        </MenuItem>
      ))}
    </TextField>
  )
}
