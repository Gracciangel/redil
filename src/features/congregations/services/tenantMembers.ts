import { callRpc, requireToken, roleOf } from './tenantRpc'

export type TenantMemberRole = 'admin' | 'leader' | 'member'

export interface CongregationMember {
  userId: string
  name: string
  surname: string
  email: string | null
  photoUrl: string | null
  phone: string | null
  role: TenantMemberRole
  joinedAt: string
}

export async function listCongregationMembers(): Promise<CongregationMember[]> {
  const rows = await callRpc<Array<Record<string, unknown>>>('list_congregation_members', {
    p_token: requireToken(),
  })
  return (rows ?? []).map((row) => ({
    userId: String(row.user_id),
    name: String(row.name ?? ''),
    surname: String(row.surname ?? ''),
    email: row.email ? String(row.email) : null,
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    phone: row.phone ? String(row.phone) : null,
    role: roleOf(row.role),
    joinedAt: String(row.joined_at ?? ''),
  }))
}

export async function updateMemberRole(userId: string, role: TenantMemberRole): Promise<void> {
  await callRpc('update_member_role', {
    p_token: requireToken(), p_user_id: userId, p_role: role,
  })
}
