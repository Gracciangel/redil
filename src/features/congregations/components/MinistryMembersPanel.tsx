import { Paper, Typography } from '@mui/material'
import { LoadingList } from '@/components/Feedback'
import type { MinistryMember } from '../services/leaderMinistries'
import { MinistryMemberList } from './MinistryMemberList'

interface Props {
  members: MinistryMember[]
  loading: boolean
}

/** Resumen de integrantes del ministerio elegido; las acciones van en el modal. */
export function MinistryMembersPanel({ members, loading }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>Integrantes</Typography>
      {loading && members.length === 0 ? (
        <LoadingList rows={2} />
      ) : (
        <MinistryMemberList
          members={members}
          busy={null}
          readOnly
          onRole={() => undefined}
          onDrop={() => undefined}
        />
      )}
    </Paper>
  )
}
