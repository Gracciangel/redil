import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { listMyTenantProfiles, listTenantProfiles } from '../services/socialProfiles'

/** Una sola llamada: el tenant usa su token; el miembro usa auth.uid(). */
function loadOwnTenantProfiles(isTenant: boolean) {
  return isTenant ? listTenantProfiles() : listMyTenantProfiles()
}

/**
 * Viewmodel del perfil de otro miembro de la congregación.
 * No decide permisos: los RPC ya validan la sesión y el alcance al tenant.
 */
export function useMemberProfileView(userId?: string) {
  const isTenant = Boolean(useCongregationStore((s) => s.congregation))
  const { data, loading, error } = useAsyncData(
    () => loadOwnTenantProfiles(isTenant),
    [isTenant],
  )

  const profile = (data ?? []).find((item) => item.userId === userId) ?? null

  return {
    isTenant,
    profile,
    loading,
    error,
    notFound: !loading && !error && !profile,
  }
}
