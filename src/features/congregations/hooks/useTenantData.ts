import { useAsyncData } from '@/lib/hooks'
import { bump } from '@/lib/live'
import { listCongregationMembers, listTenantMinistries, listTenantMinistryMembers } from '../services/tenantAdmin'

function loadMembers() {
  return listCongregationMembers()
}

function loadMinistries() {
  return listTenantMinistries()
}

/** Miembros reales del tenant (Supabase), no los del store local offline. */
export function useCongregationMembers(enabled = true) {
  const { data, loading, error } = useAsyncData(loadMembers, [], enabled)
  return { members: data ?? [], loading, error, reload: bump }
}

/** Ministerios y grupos del tenant, para el ABM de Ajustes. */
export function useTenantMinistries(enabled = true) {
  const { data, loading, error } = useAsyncData(loadMinistries, [], enabled)
  return { ministries: data ?? [], loading, error, reload: bump }
}

/** Integrantes de un ministerio del tenant, con su rol dentro del grupo. */
export function useTenantMinistryMembers(ministryId: string, enabled = true) {
  const { data, loading, error } = useAsyncData(
    () => listTenantMinistryMembers(ministryId),
    [ministryId],
    Boolean(enabled && ministryId),
  )
  return { ministryMembers: data ?? [], loading, error, reload: bump }
}
