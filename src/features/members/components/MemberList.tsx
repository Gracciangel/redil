import {
  Avatar,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import { avatarTone, initials } from '@/lib/format'
import { ROLE_LABELS, type Member } from '@/lib/types'

interface Props {
  members: Member[]
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
}

const toneColors = ['#7c3aed', '#4f46e5', '#a21caf', '#b45309', '#be123c']

export function MemberList({ members, onEdit, onDelete }: Props) {
  return (
    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {members.map((member) => (
        <ListItem key={member.id} disableGutters sx={{ p: 0 }}>
          <Paper variant="outlined" sx={{ p: 2, width: '100%', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Avatar sx={{ bgcolor: toneColors[avatarTone(member.name)] ?? toneColors[0], fontWeight: 700 }}>
              {initials(member.name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {member.name}
                </Typography>
                <Chip size="small" label={ROLE_LABELS[member.role]} />
              </Stack>
              <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 0.5, color: 'text.secondary', flexWrap: 'wrap', alignItems: 'center' }}>
                {member.group && (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{member.group}</Typography>
                  </Stack>
                )}
                {member.phone && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    component="a"
                    href={`tel:${member.phone.replace(/\s+/g, '')}`}
                    sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
                  >
                    <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{member.phone}</Typography>
                  </Stack>
                )}
                {member.email && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    component="a"
                    href={`mailto:${member.email}`}
                    sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
                  >
                    <EmailOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{member.email}</Typography>
                  </Stack>
                )}
              </Stack>
              {member.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }}>
                  {member.notes}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.5}>
              <IconButton aria-label={`Editar a ${member.name}`} onClick={() => onEdit(member)}>
                <EditOutlinedIcon />
              </IconButton>
              <IconButton aria-label={`Eliminar a ${member.name}`} color="error" onClick={() => onDelete(member)}>
                <DeleteOutlinedIcon />
              </IconButton>
            </Stack>
          </Paper>
        </ListItem>
      ))}
    </List>
  )
}