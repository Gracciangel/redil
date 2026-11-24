import type { FormEvent } from 'react'
import { Button, DialogActions, DialogContent, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { MinistryMember, MinistryRole } from '../services/leaderMinistries'
import { MinistryCandidateList } from './MinistryCandidateList'
import { MinistryIconSelect } from './MinistryIconSelect'
import { MinistryLeaderSelect } from './MinistryLeaderSelect'
import { MinistryMemberList } from './MinistryMemberList'

export interface MinistryEditFormProps {
  isTenant: boolean
  editName: string
  editIsGroup: boolean
  editIcon: string
  members: MinistryMember[]
  candidates: MinistryMember[]
  leaderId: string | null
  busy: string | null
  onName: (value: string) => void
  onIsGroup: (value: boolean) => void
  onIcon: (value: string) => void
  onLeader: (userId: string) => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
  onAdd: (userId: string) => void
  onRole: (userId: string, role: MinistryRole) => void
  onDrop: (userId: string) => void
  onClose: () => void
}

/** Contenido del modal: identidad, líder, integrantes y altas visibles. */
export function MinistryEditForm(props: MinistryEditFormProps) {
  return (
    <form id="ministry-edit-form" onSubmit={props.onSave} noValidate>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="Nombre *"
              size="small"
              value={props.editName}
              onChange={(event) => props.onName(event.target.value)}
              fullWidth
            />
            {props.isTenant && (
              <TextField
                select
                label="Tipo"
                size="small"
                value={props.editIsGroup ? 'group' : 'ministry'}
                onChange={(event) => props.onIsGroup(event.target.value === 'group')}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="ministry">Ministerio</MenuItem>
                <MenuItem value="group">Grupo</MenuItem>
              </TextField>
            )}
            <MinistryIconSelect value={props.editIcon} onChange={props.onIcon} />
          </Stack>

          <MinistryLeaderSelect
            members={props.members}
            leaderId={props.leaderId}
            busy={props.busy}
            onChange={props.onLeader}
          />

          <Divider />
          <Typography variant="subtitle2">Integrantes</Typography>
          <MinistryMemberList
            members={props.members}
            busy={props.busy}
            onRole={props.onRole}
            onDrop={props.onDrop}
          />

          <Divider />
          <Typography variant="subtitle2">Miembros para sumar</Typography>
          <MinistryCandidateList
            candidates={props.candidates}
            assignedIds={new Set(props.members.map((member) => member.userId))}
            busy={props.busy}
            onAdd={props.onAdd}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={props.onClose} color="inherit" disabled={props.busy !== null}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={props.busy === 'save' || !props.editName.trim()}>
          Guardar
        </Button>
      </DialogActions>
    </form>
  )
}
