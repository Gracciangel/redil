import { useState } from 'react'
import { getMyMembership } from '@/features/congregations/services/membership'
import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'
import {
  getMySocialContext,
  listExternalProfiles,
  listExternalProfilesForMember,
  listMyTenantProfiles,
  listSharedAnnouncements,
  listSharedAnnouncementsForMember,
  listTenantProfiles,
  listVerifiedCongregations,
  listVerifiedCongregationsForMember,
} from '../services/socialProfiles'

function loadContext() {
  return getMySocialContext()
}
function loadMyMembership() {
  return getMyMembership()
}
function loadTenantProfiles() {
  return listTenantProfiles()
}
function loadMyProfiles() {
  return listMyTenantProfiles()
}
function loadTenantCongregations() {
  return listVerifiedCongregations()
}
function loadMemberCongregations() {
  return listVerifiedCongregationsForMember()
}

export type DirectoryTab = 'own' | 'external'

/**
 * Viewmodel del directorio de perfiles.
 *
 * El tenant usa su token de sesión; el miembro usa auth.uid(). La regla de
 * cruce entre tenants la validan los RPCs (`can_cross_tenants`), acá solo se
 * decide qué muestra la vista según la verificación.
 */
export function useDirectoryView() {
  const congregation = useCongregationStore((s) => s.congregation)
  const user = useUserStore((s) => s.user)
  const isTenant = Boolean(congregation)

  const context = useAsyncData(loadContext, [], !isTenant && Boolean(user))
  const membership = useAsyncData(loadMyMembership, [], !isTenant && Boolean(user))
  const ownCongregationName = isTenant
    ? congregation?.name ?? null
    : membership.data?.name ?? null
  const verified = isTenant ? Boolean(congregation?.vify) : Boolean(context.data?.vify)
  const token = congregation?.sessionToken ?? ''

  const [tab, setTab] = useState<DirectoryTab>('own')
  const [selectedId, setSelectedId] = useState('')

  const own = useAsyncData(isTenant ? loadTenantProfiles : loadMyProfiles, [], verified)
  const congregations = useAsyncData(
    isTenant ? loadTenantCongregations : loadMemberCongregations,
    [],
    verified,
  )
  const selected = congregations.data?.find((item) => item.id === selectedId) ?? null

  const externalEnabled = verified && tab === 'external' && Boolean(selectedId)
  const externalProfiles = useAsyncData(
    () =>
      isTenant
        ? listExternalProfiles({ token, congregationId: selectedId })
        : listExternalProfilesForMember(selectedId),
    [selectedId, isTenant],
    externalEnabled,
  )
  const announcements = useAsyncData(
    () =>
      isTenant
        ? listSharedAnnouncements(selectedId)
        : listSharedAnnouncementsForMember(selectedId),
    [selectedId, isTenant],
    externalEnabled,
  )

  return {
    isTenant,
    verified,
    ownCongregationName,
    contextLoading: !isTenant && context.loading && Boolean(user),
    contextError: !isTenant ? context.error : null,
    tab,
    setTab,
    ownProfiles: own.data ?? [],
    ownLoading: own.loading,
    ownError: own.error,
    congregations: congregations.data ?? [],
    congregationsLoading: congregations.loading,
    congregationsError: congregations.error,
    selectedCongregation: selected,
    selectedId,
    setSelectedId,
    externalProfiles: externalProfiles.data ?? [],
    externalLoading: externalProfiles.loading,
    externalError: externalProfiles.error,
    announcements: announcements.data ?? [],
    announcementsLoading: announcements.loading,
    announcementsError: announcements.error,
  }
}
