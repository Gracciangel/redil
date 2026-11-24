import { useState } from 'react'
import { bump } from '@/lib/live'
import { useCongregationStore } from '@/store/CongregationStore'
import { useCongregationMembers } from '@/features/congregations/hooks/useTenantData'
import {
  updateMemberRole,
  type TenantMemberRole,
} from '@/features/congregations/services/tenantAdmin'

export type Notice = { tone: 'ok' | 'error'; text: string }

/**
 * Viewmodel de Ajustes: solo administración de miembros. La ABM de
 * ministerios/grupos vive en `MinistriesView` y la edición de perfil en
 * `useProfileEditor`. El líder se designa dentro de un ministerio, nunca acá.
 */
export function useAccountSettings() {
  const congregation = useCongregationStore((s) => s.congregation)
  const isTenant = Boolean(congregation)
  const members = useCongregationMembers(isTenant)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleRoleChange(userId: string, role: TenantMemberRole) {
    if (role === 'leader') {
      setNotice({
        tone: 'error',
        text: 'Para designar líderes, abrí un ministerio o grupo y asigná el rol ahí.',
      })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await updateMemberRole(userId, role)
      bump()
      setNotice({ tone: 'ok', text: 'Rol actualizado.' })
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo actualizar el rol.',
      })
    } finally {
      setBusy(false)
    }
  }

  return {
    isTenant,
    congregationName: congregation?.name ?? null,
    members: members.members,
    membersLoading: members.loading,
    membersError: members.error,
    tenantError: members.error,
    notice,
    busy: busy ? 'role' : null,
    handleRoleChange,
  }
}
