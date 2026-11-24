import { callRpc as rpc } from '@/supabase/supabase'
import { useCongregationStore } from '@/store/CongregationStore'

type Row = Record<string, unknown>

export interface SocialProfile {
  userId: string; name: string; surname: string; photoUrl: string | null
  bio: string | null; role: string; ministries: string[]; groups: string[]; ledCount: number
}
export interface SocialCongregation {
  id: string; name: string; slug: string; bio: string | null
  photoUrl: string | null; bannerUrl: string | null
}
export interface SharedAnnouncement {
  id: string; title: string; body: string | null; imageUrl: string | null; publishedAt: string
}
export interface ExternalProfilesInput { token: string; congregationId: string }

/** Mantiene la firma local; delega en el RPC con timeout/errores traducidos. */
async function callRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  return rpc<T>(name, params)
}
function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}
function token(): string {
  const value = useCongregationStore.getState().congregation?.sessionToken
  if (!value) throw new Error('Iniciá sesión como congregación para continuar.')
  return value
}
function toProfile(row: Row): SocialProfile {
  return {
    userId: String(row.user_id), name: String(row.name ?? ''), surname: String(row.surname ?? ''),
    photoUrl: row.photo_url ? String(row.photo_url) : null, bio: row.bio ? String(row.bio) : null,
    role: String(row.role ?? 'member'),
    ministries: Array.isArray(row.ministries) ? row.ministries.map(String) : [],
    groups: Array.isArray(row.groups) ? row.groups.map(String) : [],
    ledCount: Number(row.led_count ?? 0),
  }
}
function toCongregation(row: Row): SocialCongregation {
  return {
    id: String(row.id), name: String(row.name ?? ''), slug: String(row.slug ?? ''),
    bio: row.bio ? String(row.bio) : null, photoUrl: row.photo_url ? String(row.photo_url) : null,
    bannerUrl: row.banner_url ? String(row.banner_url) : null,
  }
}
function toAnnouncement(row: Row): SharedAnnouncement {
  return {
    id: String(row.id), title: String(row.title ?? ''), body: row.body ? String(row.body) : null,
    imageUrl: row.image_url ? String(row.image_url) : null, publishedAt: String(row.published_at ?? ''),
  }
}

export async function getMySocialContext(): Promise<{ vify: boolean; congregationId: string | null } | null> {
  const data = await callRpc<Row[]>('get_my_social_context')
  const row = rows<Row>(data)[0]
  if (!row) return null
  return { vify: Boolean(row.vify), congregationId: row.congregation_id ? String(row.congregation_id) : null }
}
export async function listTenantProfiles(): Promise<SocialProfile[]> {
  return rows<Row>(await callRpc<Row[]>('list_tenant_profiles', { p_token: token() })).map(toProfile)
}
export async function listMyTenantProfiles(): Promise<SocialProfile[]> {
  return rows<Row>(await callRpc<Row[]>('list_my_tenant_profiles')).map(toProfile)
}
export async function listVerifiedCongregations(): Promise<SocialCongregation[]> {
  return rows<Row>(await callRpc<Row[]>('list_verified_congregations', { p_token: token() })).map(toCongregation)
}
export async function listVerifiedCongregationsForMember(): Promise<SocialCongregation[]> {
  return rows<Row>(await callRpc<Row[]>('list_verified_congregations_for_member')).map(toCongregation)
}
export async function listSharedAnnouncements(congregationId: string): Promise<SharedAnnouncement[]> {
  const data = await callRpc<Row[]>('list_shared_announcements', {
    p_token: token(), p_congregation_id: congregationId,
  })
  return rows<Row>(data).map(toAnnouncement)
}
/** Los perfiles de otro tenant se piden por RPC (el helper valida vify). */
export async function listExternalProfiles(input: ExternalProfilesInput): Promise<SocialProfile[]> {
  const data = await callRpc<Row[]>('list_external_profiles', {
    p_token: input.token, p_congregation_id: input.congregationId,
  })
  return rows<Row>(data).map(toProfile)
}
export async function listExternalProfilesForMember(congregationId: string): Promise<SocialProfile[]> {
  const data = await callRpc<Row[]>('list_external_profiles_for_member', {
    p_congregation_id: congregationId,
  })
  return rows<Row>(data).map(toProfile)
}
export async function listSharedAnnouncementsForMember(congregationId: string): Promise<SharedAnnouncement[]> {
  const data = await callRpc<Row[]>('list_shared_announcements_for_member', {
    p_congregation_id: congregationId,
  })
  return rows<Row>(data).map(toAnnouncement)
}
