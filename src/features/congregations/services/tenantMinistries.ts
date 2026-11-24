import { callRpc, requireToken } from './tenantRpc'

export interface CongregationMinistry {
  id: string
  name: string
  isGroup: boolean
  icon: string | null
  memberCount: number
}

/** Integrante de un ministerio, con su alcance (L) dentro de ese grupo. */
export interface TenantMinistryMember {
  userId: string
  name: string
  surname: string
  email: string | null
  photoUrl: string | null
  role: 'leader' | 'member'
}

export async function listTenantMinistries(): Promise<CongregationMinistry[]> {
  const rows = await callRpc<Array<Record<string, unknown>>>('list_tenant_ministries', {
    p_token: requireToken(),
  })
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    isGroup: Boolean(row.is_group),
    icon: row.icon ? String(row.icon) : null,
    memberCount: Number(row.member_count ?? 0),
  }))
}

export async function createTenantMinistry(name: string, isGroup: boolean): Promise<void> {
  await callRpc('create_tenant_ministry', {
    p_token: requireToken(), p_name: name, p_is_group: isGroup,
  })
}

export async function deleteTenantMinistry(ministryId: string): Promise<void> {
  await callRpc('delete_tenant_ministry', {
    p_token: requireToken(), p_ministry_id: ministryId,
  })
}

export async function updateTenantMinistry(
  ministryId: string, name: string, isGroup: boolean, icon: string | null,
): Promise<void> {
  await callRpc('update_tenant_ministry', {
    p_token: requireToken(), p_ministry_id: ministryId,
    p_name: name, p_is_group: isGroup, p_icon: icon,
  })
}

export async function listTenantMinistryMembers(ministryId: string): Promise<TenantMinistryMember[]> {
  const rows = await callRpc<Array<Record<string, unknown>>>('list_tenant_ministry_members', {
    p_token: requireToken(), p_ministry_id: ministryId,
  })
  return (rows ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.name ?? ''),
    surname: String(row.surname ?? ''),
    email: row.email ? String(row.email) : null,
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    role: row.role === 'leader' ? 'leader' : 'member',
  }))
}

export async function assignMemberToMinistry(ministryId: string, userId: string): Promise<void> {
  await callRpc('assign_member_to_ministry', {
    p_token: requireToken(), p_ministry_id: ministryId, p_user_id: userId,
  })
}

export async function unassignMemberFromMinistry(ministryId: string, userId: string): Promise<void> {
  await callRpc('unassign_member_from_ministry', {
    p_token: requireToken(), p_ministry_id: ministryId, p_user_id: userId,
  })
}
