import { listTenantNews } from '@/features/announcements/services/newsService'
import { useCongregationStore } from '@/store/CongregationStore'
import { useStatsStore, type CongregationCounts } from '@/store/StatsStore'
import { listCongregationMembers, listTenantMinistries } from './tenantAdmin'

/**
 * Los conteos se calculan con los RPCs que ya existen. Se llaman una sola vez
 * por sesión/cambio: el resultado se guarda en localStorage (`StatsStore`).
 */
export async function fetchCongregationCounts(): Promise<CongregationCounts> {
  const [members, ministries, news] = await Promise.all([
    listCongregationMembers(),
    listTenantMinistries(),
    listTenantNews(),
  ])
  return {
    members: members.length,
    ministries: ministries.filter((item) => !item.isGroup).length,
    groups: ministries.filter((item) => item.isGroup).length,
    announcements: news.length,
  }
}

/** Refresca la cache de la congregación activa. Lo llaman las mutaciones (ABM). */
export async function refreshCongregationStats(): Promise<CongregationCounts | null> {
  const id = useCongregationStore.getState().congregation?.id
  if (!id) return null
  const counts = await fetchCongregationCounts()
  useStatsStore.getState().setStats(id, counts)
  return counts
}
