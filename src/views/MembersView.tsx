import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TenantMemberList } from '@/features/congregations/components/TenantMemberList'
import { TenantSessionAlert } from '@/features/congregations/components/TenantSessionAlert'
import { isTenantSessionError } from '@/features/congregations/services/tenantAdmin'
import { useCongregationMembers } from '@/features/congregations/hooks/useTenantData'
import { useCongregationStore } from '@/store/CongregationStore'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { deleteMember } from '@/lib/repo'
import { pluralize } from '@/lib/format'
import { useMembersView } from '@/features/members/hooks/useMembersView'
import { MemberFormDialog } from '@/features/members/components/MemberFormDialog'
import { MemberList } from '@/features/members/components/MemberList'

export function MembersView() {
  const congregation = useCongregationStore((s) => s.congregation)
  const tenant = useCongregationMembers(Boolean(congregation))
  const vm = useMembersView(!congregation)

  // El tenant lista los miembros vinculados en Supabase, no los del dispositivo.
  if (congregation) {
    return (
      <Box>
        <Stack sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">Miembros</Typography>
          <Typography color="text.secondary">
            Personas vinculadas a {congregation.name} mediante el código de invitación.
          </Typography>
        </Stack>

        <TenantSessionAlert error={tenant.error} />
        {tenant.error && !isTenantSessionError(tenant.error) && (
          <Alert severity="error" sx={{ mb: 2 }}>{tenant.error.message}</Alert>
        )}
        {tenant.loading && tenant.members.length === 0 ? (
          <LoadingList />
        ) : (
          <TenantMemberList members={tenant.members} />
        )}
      </Box>
    )
  }

  if (vm.error) return <Alert severity="error">{vm.error.message}</Alert>

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}
      >
        <Box>
          <Typography variant="h4" component="h1">Miembros</Typography>
          <Typography color="text.secondary">
            {vm.loading && vm.members.length === 0
              ? 'Cargando…'
              : pluralize(vm.members.length, 'persona', 'personas')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => vm.setCreating(true)}>
          Nuevo miembro
        </Button>
      </Stack>

      <TextField
        value={vm.query}
        onChange={(e) => vm.setQuery(e.target.value)}
        placeholder="Buscar por nombre, grupo o teléfono…"
        fullWidth
        sx={{ mb: 2, maxWidth: 420 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {vm.loading && vm.members.length === 0 ? (
        <LoadingList />
      ) : vm.filtered.length === 0 ? (
        vm.query ? (
          <EmptyState
            icon="search"
            title="Sin resultados"
            description={`Nadie coincide con «${vm.query}».`}
            action={
              <Button variant="outlined" size="small" onClick={() => vm.setQuery('')}>
                Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="users"
            title="Aún no hay miembros"
            description="Registra a las personas de tu congregación para tener sus datos a mano."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => vm.setCreating(true)}>
                Añadir el primero
              </Button>
            }
          />
        )
      ) : (
        <MemberList members={vm.filtered} onEdit={vm.setEditing} onDelete={vm.setDeleting} />
      )}

      <MemberFormDialog
        open={vm.creating || vm.editing !== null}
        member={vm.editing}
        onClose={() => {
          vm.setCreating(false)
          vm.setEditing(null)
        }}
      />

      <ConfirmDialog
        open={vm.deleting !== null}
        title="Eliminar miembro"
        message={
          vm.deleting
            ? `Se eliminará a ${vm.deleting.name} de este dispositivo. Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => vm.setDeleting(null)}
        onConfirm={async () => {
          if (vm.deleting) await deleteMember(vm.deleting.id)
          vm.setDeleting(null)
        }}
      />
    </Box>
  )
}