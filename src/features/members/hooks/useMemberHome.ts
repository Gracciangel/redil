import { listMyNews } from '@/features/announcements/services/newsService'
import { getMyMembership } from '@/features/congregations/services/membership'
import { useAsyncData } from '@/lib/hooks'
import { listEvents } from '@/lib/repo'
import { useSettings } from '@/lib/settings'
import { useUserStore } from '@/store/Store'
import { useMemberJoin } from './useMemberJoin'

/** Contenido de solo lectura del miembro: eventos y avisos de la DB. */
async function loadMemberHome() {
  const [events, news] = await Promise.all([listEvents(), listMyNews()])
  return { events, news }
}

/** Loader estable para la membresía; `useAsyncData` lo recarga por versión. */
function loadMyMembership() {
  return getMyMembership()
}

/**
 * Viewmodel del Home del miembro (R4, R7). La vista solo presenta lo que acá
 * se expone: ni llama RPCs ni decide permisos.
 */
export function useMemberHome() {
  const { data, loading, error } = useAsyncData(loadMemberHome)
  const join = useMemberJoin()
  const membershipState = useAsyncData(loadMyMembership, [join.membershipVersion])
  const { settings } = useSettings()
  const user = useUserStore((state) => state.user)

  const now = Date.now()
  const upcoming = (data?.events ?? [])
    .filter((event) => new Date(event.startsAt).getTime() + event.durationMinutes * 60_000 >= now)
    .slice(0, 4)
  const latestAnnouncements = [...(data?.news ?? [])]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)

  return {
    congregationName: settings.congregationName,
    memberName: user?.displayName ?? null,
    loading,
    error,
    hasData: !!data,
    upcoming,
    latestAnnouncements,
    hasMembership: !!membershipState.data,
    membership: membershipState.data ?? null,
    membershipLoading: membershipState.loading && !membershipState.data,
    membershipError: membershipState.error,
    code: join.code,
    setCode: join.setCode,
    preview: join.preview,
    previewing: join.previewing,
    joining: join.joining,
    actionError: join.actionError,
    joinedCongregationId: join.joinedCongregationId,
    handlePreview: join.handlePreview,
    handleJoin: join.handleJoin,
  }
}
