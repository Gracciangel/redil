import type { useMinistriesManagement } from '../hooks/useMinistriesManagement'
import { MinistryEditDialog } from './MinistryEditDialog'

type ViewModel = ReturnType<typeof useMinistriesManagement>

/** Conecta el modal de edición con el viewmodel, sin lógica en la vista. */
export function MinistryEditModal({ vm }: { vm: ViewModel }) {
  const leaderId = vm.members.find((member) => member.role === 'leader')?.userId ?? null
  const editing = vm.ministries.find((item) => item.id === vm.editingId) ?? null

  return (
    <MinistryEditDialog
      open={vm.editingId !== null}
      item={editing}
      isTenant={vm.isTenant}
      editName={vm.editName}
      editIsGroup={vm.editIsGroup}
      editIcon={vm.editIcon}
      members={vm.members}
      candidates={vm.candidates}
      leaderId={leaderId}
      busy={vm.busy}
      onName={vm.setEditName}
      onIsGroup={vm.setEditIsGroup}
      onIcon={vm.setEditIcon}
      onLeader={(id) => vm.handleLeader(id, leaderId)}
      onSave={vm.handleSave}
      onAdd={vm.handleAdd}
      onRole={vm.handleRole}
      onDrop={vm.handleDrop}
      onClose={vm.closeEdit}
    />
  )
}
