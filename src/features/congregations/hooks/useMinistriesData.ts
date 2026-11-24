import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'
import {
  listLeadersCongregationMembers,
  listMinistryMembers,
  type MinistryMember,
} from '../services/leaderMinistries'
import {
  useCongregationMembers,
  useTenantMinistries,
  useTenantMinistryMembers,
} from './useTenantData'
import { useMyMinistries } from './useMyMinistries'

/** Ministerio o grupo tal como lo muestra el listado, sin importar la sesión. */
export interface MinistryItem {
  id: string
  name: string
  isGroup: boolean
  icon: string | null
  memberCount: number
}

/**
 * Carga el mismo modelo para los dos tipos de sesión. El tenant ve todos los
 * ministerios; el miembro, solo los que lidera. Los RPCs validan el alcance.
 */
export function useMinistriesData(selectedId: string) {
  const isTenant = Boolean(useCongregationStore((s) => s.congregation))
  const user = useUserStore((s) => s.user)
  const tenant = useTenantMinistries(isTenant)
  const mine = useMyMinistries(!isTenant && Boolean(user))
  const congregation = useCongregationMembers(isTenant)
  const tenantMembers = useTenantMinistryMembers(selectedId, isTenant)
  const leaderMembers = useAsyncData(
    () => listMinistryMembers(selectedId),
    [selectedId],
    !isTenant && Boolean(selectedId),
  )
  const candidates = useAsyncData(listLeadersCongregationMembers, [], !isTenant && Boolean(user))

  const ministries: MinistryItem[] = isTenant
    ? tenant.ministries
    : mine.ministries.filter((item) => item.isLeader)
  const members = (isTenant ? tenantMembers.ministryMembers : leaderMembers.data ?? []) as MinistryMember[]

  return {
    isTenant,
    ministries,
    loading: isTenant ? tenant.loading : mine.loading,
    error: isTenant ? tenant.error : mine.error,
    selected: ministries.find((item) => item.id === selectedId) ?? null,
    members,
    membersLoading: isTenant ? tenantMembers.loading : leaderMembers.loading,
    candidates: (isTenant ? congregation.members : candidates.data ?? []) as MinistryMember[],
    leader: members.find((member) => member.role === 'leader') ?? null,
  }
}
