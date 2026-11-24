import { Link as RouterLink } from 'react-router-dom'
import { Avatar, Box, Chip, List, ListItem, Paper, Stack, Typography } from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { EmptyState } from '@/components/Feedback'
import { avatarTone, initials } from '@/lib/format'
import type { CongregationMember, TenantMemberRole } from '../services/tenantAdmin'

const ROLE_LABEL: Record<TenantMemberRole, string> = {
  admin: 'Admin',
  leader: 'Líder',
  member: 'Miembro',
}

const toneColors = ['#7c3aed', '#4f46e5', '#a21caf', '#b45309', '#be123c']

/** Lista de miembros vinculados al tenant. Vista de presentación, sin RPCs. */
export function TenantMemberList({ members }: { members: CongregationMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Todavía no hay miembros"
        description="Las personas se vinculan cuando escanean tu QR o escriben el código de invitación."
      />
    )
  }

  return (
    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {members.map((member) => {
        const fullName = `${member.name} ${member.surname}`.trim() || member.email || 'Miembro'
        return (
          <ListItem key={member.userId} disableGutters sx={{ p: 0 }}>
            <Paper
              component={RouterLink}
              to={`/miembros/${member.userId}`}
              variant="outlined"
              sx={{
                p: 2, width: '100%', display: 'block', color: 'inherit', textDecoration: 'none',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Avatar
                  src={member.photoUrl ?? undefined}
                  sx={{ bgcolor: toneColors[avatarTone(fullName)] ?? toneColors[0], fontWeight: 700 }}
                >
                  {initials(fullName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600 }}>{fullName}</Typography>
                    <Chip size="small" label={ROLE_LABEL[member.role]} />
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', color: 'text.secondary', mt: 0.5 }}>
                    {member.email && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{member.email}</Typography>
                      </Stack>
                    )}
                    {member.phone && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{member.phone}</Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </ListItem>
        )
      })}
    </List>
  )
}
