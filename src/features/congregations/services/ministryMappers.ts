import type { MinistryMember, MinistryRole, MyMinistry } from './leaderMinistries'

export type Row = Record<string, unknown>

export function rows(data: unknown): Row[] {
  return (Array.isArray(data) ? data : []).map((row) => row as Row)
}

export function ministryRole(value: unknown): MinistryRole {
  return value === 'leader' ? 'leader' : 'member'
}

export function toMinistry(row: Row): MyMinistry {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    isGroup: Boolean(row.is_group),
    icon: row.icon ? String(row.icon) : null,
    isLeader: Boolean(row.is_leader),
    memberCount: Number(row.member_count ?? 0),
  }
}

export function toMember(row: Row): MinistryMember {
  return {
    userId: String(row.user_id),
    name: String(row.name ?? ''),
    surname: String(row.surname ?? ''),
    email: row.email ? String(row.email) : null,
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    role: ministryRole(row.role),
  }
}
