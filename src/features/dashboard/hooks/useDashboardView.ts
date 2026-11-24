import { useCongregationStats } from '@/features/congregations/hooks/useCongregationStats'
import { listMyNews } from '@/features/announcements/services/newsService'
import { useAsyncData } from '@/lib/hooks'
import { listEvents, listMembers } from '@/lib/repo'
import { useCongregationStore } from '@/store/CongregationStore'

async function loadLocal() {
  const [members, events] = await Promise.all([listMembers(), listEvents()])
  return { members, events }
}

function loadMemberNews() {
  return listMyNews()
}

/**
 * Home: el tenant lee los conteos de la cache (ya con avisos de la DB); el
 * miembro lee sus avisos con `list_my_news()`. Ninguno usa IndexedDB para avisos.
 */
export function useDashboardView() {
  const congregation = useCongregationStore((s) => s.congregation)
  const isTenant = Boolean(congregation)
  const stats = useCongregationStats(isTenant)
  const local = useAsyncData(loadLocal)
  const news = useAsyncData(loadMemberNews, [], !isTenant)

  const now = Date.now()
  const events = local.data?.events ?? []
  const isUpcoming = (event: (typeof events)[number]) =>
    new Date(event.startsAt).getTime() + event.durationMinutes * 60_000 >= now

  return {
    isTenant,
    loading: local.loading || (!isTenant && news.loading) || (isTenant && stats.loading && !stats.hasCache),
    error: local.error ?? (!isTenant ? news.error : null) ?? (isTenant ? stats.error : null),
    membersCount: isTenant ? stats.counts.members : (local.data?.members.length ?? 0),
    ministriesCount: stats.counts.ministries,
    groupsCount: stats.counts.groups,
    eventsCount: events.filter(isUpcoming).length,
    announcementsCount: isTenant ? stats.counts.announcements : (news.data?.length ?? 0),
    upcoming: events.filter(isUpcoming).slice(0, 4),
    hasData: isTenant ? stats.hasCache : Boolean(local.data && news.data),
    statsLoading: stats.loading,
    statsError: stats.error,
    refreshStats: stats.refresh,
  }
}
