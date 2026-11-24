import { callRpc as rpc } from '@/supabase/supabase'
import { useCongregationStore } from '@/store/CongregationStore'
import { rows, toMember, toMinistry } from './ministryMappers'

export type MinistryRole = 'leader' | 'member'

export interface MyMinistry {
  id: string
  name: string
  isGroup: boolean
  icon: string | null
  /** (L) true cuando el usuario lidera este ministerio o grupo. */
  isLeader: boolean
  memberCount: number
}

export interface MinistryMember {
  userId: string
  name: string
  surname: string
  email: string | null
  photoUrl: string | null
  role: MinistryRole
}

/** Mantiene la firma local; delega en el RPC con timeout/errores traducidos. */
async function callRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  return rpc<T>(name, params)
}

/** Ministerios/grupos a los que pertenece el usuario (Perfil y vista (L)). */
export async function getMyMinistries(): Promise<MyMinistry[]> {
  const data = await callRpc<unknown>('get_my_ministries')
  return rows(data).map(toMinistry)
}

/** Miembros de un ministerio. El RPC verifica que el usuario lo lidere. */
export async function listMinistryMembers(ministryId: string): Promise<MinistryMember[]> {
  const data = await callRpc<unknown>('list_ministry_members', { p_ministry_id: ministryId })
  return rows(data).map(toMember)
}

/** Miembros de la congregación que un líder puede sumar a su ministerio. */
export async function listLeadersCongregationMembers(): Promise<MinistryMember[]> {
  const data = await callRpc<unknown>('list_leaders_congregation_members')
  return rows(data).map(toMember)
}

export async function addMinistryMember(ministryId: string, userId: string): Promise<void> {
  await callRpc('add_ministry_member', { p_ministry_id: ministryId, p_user_id: userId })
}

export async function removeMinistryMember(ministryId: string, userId: string): Promise<void> {
  await callRpc('remove_ministry_member', { p_ministry_id: ministryId, p_user_id: userId })
}

export async function setMinistryMemberRole(
  ministryId: string,
  userId: string,
  role: MinistryRole,
): Promise<void> {
  await callRpc('set_ministry_member_role', {
    p_ministry_id: ministryId,
    p_user_id: userId,
    p_ministry_role: role,
  })
}

export async function updateMinistry(ministryId: string, name: string, icon: string | null): Promise<void> {
  await callRpc('update_ministry', {
    p_ministry_id: ministryId,
    p_name: name,
    p_icon: icon,
  })
}

/** El tenant designa quién lidera cada ministerio (Ajustes). */
export async function setTenantMinistryMemberRole(
  ministryId: string,
  userId: string,
  role: MinistryRole,
): Promise<void> {
  const token = useCongregationStore.getState().congregation?.sessionToken
  if (!token) throw new Error('Iniciá sesión como congregación para continuar.')

  await callRpc('set_tenant_ministry_member_role', {
    p_token: token,
    p_ministry_id: ministryId,
    p_user_id: userId,
    p_ministry_role: role,
  })
}
