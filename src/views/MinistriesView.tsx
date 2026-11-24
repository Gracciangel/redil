import { Box, Grid, Typography } from '@mui/material'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/Feedback'
import { MinistryCreateForm } from '@/features/congregations/components/MinistryCreateForm'
import { MinistryDetail } from '@/features/congregations/components/MinistryDetail'
import { MinistryEditModal } from '@/features/congregations/components/MinistryEditModal'
import { MinistryList } from '@/features/congregations/components/MinistryList'
import { MinistryMembersPanel } from '@/features/congregations/components/MinistryMembersPanel'
import { MinistryViewHeader } from '@/features/congregations/components/MinistryViewHeader'
import { useMinistriesManagement } from '@/features/congregations/hooks/useMinistriesManagement'

/**
 * Ministerios y grupos: el listado tiene acciones de editar/borrar y la edición
 * completa ocurre en un modal (nombre, ícono, líder e integrantes).
 * Vista pura: datos y acciones vienen del viewmodel.
 */
export function MinistriesView() {
  const vm = useMinistriesManagement()
  const selected = vm.selected
  const leaderName = vm.leader
    ? `${vm.leader.name} ${vm.leader.surname}`.trim() || vm.leader.email
    : null

  return (
    <Box>
      <MinistryViewHeader notice={vm.notice} error={vm.error} isTenant={vm.isTenant} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          {vm.isTenant && (
            <MinistryCreateForm
              name={vm.newName}
              isGroup={vm.newIsGroup}
              usesSongbook={vm.newUsesSongbook}
              busy={vm.busy}
              onName={vm.setNewName}
              onIsGroup={vm.setNewIsGroup}
              onUsesSongbook={vm.setNewUsesSongbook}
              onSubmit={vm.handleCreate}
            />
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Ministerios y grupos</Typography>
          <MinistryList
            items={vm.ministries}
            selectedId={vm.selectedId}
            loading={vm.loading}
            canDelete={vm.isTenant}
            onSelect={vm.setSelectedId}
            onEdit={vm.openEdit}
            onDelete={vm.setConfirmDelete}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {!selected ? (
            <EmptyState icon="users" title="Elegí un ministerio" description="Puede ser un ministerio o un grupo." />
          ) : (
            <>
              <MinistryDetail
                item={selected}
                leaderName={leaderName}
                onEdit={() => vm.openEdit(selected)}
              />
              <MinistryMembersPanel members={vm.members} loading={vm.membersLoading} />
            </>
          )}
        </Grid>
      </Grid>

      <MinistryEditModal vm={vm} />

      <ConfirmDialog
        open={vm.confirmDelete !== null}
        title="Borrar ministerio o grupo"
        message="Se borrarán el ministerio o grupo y sus asignaciones. Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        busyLabel="Borrando…"
        onCancel={() => vm.setConfirmDelete(null)}
        onConfirm={() => void vm.handleDelete()}
      />
    </Box>
  )
}
