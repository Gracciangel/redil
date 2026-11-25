import { PastorCongregationCard } from '@/features/pastor/components/PastorCongregationCard'
import { useSessionIdentity } from '@/features/profile/hooks/useSessionIdentity'
import { ProfileView } from './ProfileView'

/** Perfil del tenant: el perfil existente más la tarjeta del pastor. */
export function TenantProfileView() {
  const { isTenant } = useSessionIdentity()
  return (
    <>
      <ProfileView />
      {isTenant && <PastorCongregationCard />}
    </>
  )
}
