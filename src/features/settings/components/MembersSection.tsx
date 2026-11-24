import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { LoadingList } from '@/components/Feedback'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { RoleBadge } from '@/features/congregations/components/RoleBadge'
import {
  isTenantSessionError,
  type TenantMemberRole,
} from '@/features/congregations/services/tenantAdmin'
import type { useAccountSettings } from '../hooks/useAccountSettings'

type ViewModel = ReturnType<typeof useAccountSettings>

/** Sección principal de Ajustes para la congregación: sus miembros y roles. */
export function MembersSection({ vm }: { vm: ViewModel }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <EntityIcon kind="members" color="primary" fontSize="small" />
        <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>Miembros</Typography>
        <Box component="span" sx={{ ml: 'auto' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">{vm.members.length}</Typography>
            <Button component={RouterLink} to="/miembros" variant="outlined" size="small">
              Ver miembros
            </Button>
          </Stack>
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Personas vinculadas a la congregación. El rol global no da alcance sobre ministerios:
        designá líderes dentro de un grupo.
      </Typography>

      {vm.membersError && !isTenantSessionError(vm.membersError) && (
        <Alert severity="error" sx={{ mb: 2 }}>{vm.membersError.message}</Alert>
      )}
      {vm.membersLoading && vm.members.length === 0 ? (
        <LoadingList rows={3} />
      ) : vm.members.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Todavía no hay miembros vinculados.</Typography>
      ) : (
        <Stack spacing={1}>
          {vm.members.map((member) => (
            <Paper key={member.userId} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {`${member.name} ${member.surname}`.trim() || member.email}
                    </Typography>
                    <RoleBadge role={member.role} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{member.email}</Typography>
                </Box>
                <TextField
                  select
                  size="small"
                  label="Rol global"
                  value={member.role}
                  onChange={(event) => void vm.handleRoleChange(member.userId, event.target.value as TenantMemberRole)}
                  disabled={vm.busy === 'role'}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Miembro</MenuItem>
                  <MenuItem value="leader" disabled>Líder (solo por grupo)</MenuItem>
                </TextField>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  )
}
