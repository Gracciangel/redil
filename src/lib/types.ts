export type MemberRole = 'miembro' | 'lider' | 'diacono' | 'anciano' | 'pastor'

export const MEMBER_ROLES: MemberRole[] = [
  'miembro',
  'lider',
  'diacono',
  'anciano',
  'pastor',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
  miembro: 'Miembro',
  lider: 'Líder',
  diacono: 'Diácono',
  anciano: 'Anciano',
  pastor: 'Pastor',
}

export interface Member {
  id: string
  name: string
  phone: string
  email: string
  group: string
  role: MemberRole
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CongregationEvent {
  id: string
  title: string
  description: string
  location: string
  /** ISO 8601, hora local del dispositivo. */
  startsAt: string
  durationMinutes: number
  createdAt: string
  updatedAt: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type EntityKind = 'members' | 'events' | 'announcements'

export type SyncOp = 'upsert' | 'delete'

export interface SyncOperation {
  id: string
  entity: EntityKind
  entityId: string
  op: SyncOp
  payload: unknown
  createdAt: string
  attempts: number
  lastError?: string
}

export interface AppSettings {
  congregationName: string
  /** URL base de la API propia. Vacío = sin backend (solo local). */
  apiUrl: string
  demoLoaded: boolean
}
