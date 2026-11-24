import { useState, type FormEvent } from 'react'
import { ministryActions } from '../services/ministryActions'
import type { MinistryRole } from '../services/leaderMinistries'
import type { MinistryItem } from './useMinistriesData'
import { useActionRunner } from './useActionRunner'

/** Formularios y acciones sobre el ministerio que se está editando. */
export function useMinistryCrud(isTenant: boolean) {
  const actions = ministryActions(isTenant)
  const { notice, busy, run, setNotice } = useActionRunner()

  const [newName, setNewName] = useState('')
  const [newIsGroup, setNewIsGroup] = useState(false)
  const [newUsesSongbook, setNewUsesSongbook] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsGroup, setEditIsGroup] = useState(false)
  const [editIcon, setEditIcon] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openEdit(item: MinistryItem) {
    setNotice(null)
    setEditingId(item.id)
    setEditName(item.name)
    setEditIsGroup(item.isGroup)
    setEditIcon(item.icon ?? '')
  }

  function closeEdit() {
    setEditingId(null)
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newName.trim()) return
    void run('create', async () => {
      await actions.create(newName.trim(), newIsGroup, newUsesSongbook)
      setNewName('')
      setNewUsesSongbook(false)
    }, newIsGroup ? 'Grupo creado.' : 'Ministerio creado.')
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId || !editName.trim()) return
    const name = editName.trim()
    const kind = editIsGroup ? 'grupo' : 'ministerio'
    void run(
      'save',
      () => actions.update(editingId, name, editIsGroup, editIcon.trim() || null),
      `${kind} ${name} actualizado`,
    )
  }

  function handleDelete() {
    if (!confirmDelete) return
    const id = confirmDelete
    void run('delete', async () => {
      await actions.remove(id)
      if (editingId === id) closeEdit()
      setConfirmDelete(null)
    }, 'Eliminado.')
  }

  function handleAdd(userId: string) {
    if (!editingId || !userId) return
    void run('add', () => actions.addMember(editingId, userId), 'Miembro sumado.')
  }

  function handleDrop(userId: string) {
    if (!editingId) return
    void run('drop', () => actions.dropMember(editingId, userId), 'Miembro quitado.')
  }

  function handleRole(userId: string, role: MinistryRole) {
    if (!editingId) return
    void run('role', () => actions.setRole(editingId, userId, role), 'Rol actualizado.')
  }

  function handleLeader(userId: string, previousId: string | null) {
    if (!editingId) return
    void run('leader', async () => {
      if (previousId && previousId !== userId) await actions.setRole(editingId, previousId, 'member')
      if (userId) await actions.setRole(editingId, userId, 'leader')
    }, 'Líder actualizado.')
  }

  return {
    notice, busy,
    newName, setNewName, newIsGroup, setNewIsGroup, newUsesSongbook, setNewUsesSongbook,
    editingId, editName, setEditName, editIsGroup, setEditIsGroup, editIcon, setEditIcon,
    confirmDelete, setConfirmDelete,
    openEdit, closeEdit, handleCreate, handleSave, handleDelete,
    handleAdd, handleDrop, handleRole, handleLeader,
  }
}
