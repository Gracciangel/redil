import { dbPromise, SETTINGS_KEY } from './db'
import { bump } from './live'
import type {
  Announcement,
  AppSettings,
  CongregationEvent,
  EntityKind,
  Member,
  SyncOp,
} from './types'

const nowIso = (): string => new Date().toISOString()

export function newId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && 'randomUUID' in cryptoApi) return cryptoApi.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Guarda la operación en la cola local para enviarla cuando haya API/conexión. */
async function enqueue(
  entity: EntityKind,
  entityId: string,
  op: SyncOp,
  payload: unknown,
): Promise<void> {
  const db = await dbPromise
  await db.put('outbox', {
    id: newId(),
    entity,
    entityId,
    op,
    payload,
    createdAt: nowIso(),
    attempts: 0,
  })
}

/* ------------------------------------------------------------------ */
/* Ajustes                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS: AppSettings = {
  congregationName: 'Mi congregación',
  apiUrl: '',
  demoLoaded: false,
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await dbPromise
  const stored = await db.get('settings', SETTINGS_KEY)
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
  return { ...DEFAULT_SETTINGS, apiUrl: envUrl, ...stored }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = await dbPromise
  const next = { ...(await loadSettings()), ...patch }
  await db.put('settings', next, SETTINGS_KEY)
  return next
}

/* ------------------------------------------------------------------ */
/* Miembros                                                           */
/* ------------------------------------------------------------------ */

export type MemberInput = Pick<
  Member,
  'name' | 'phone' | 'email' | 'group' | 'role' | 'notes'
>

export async function listMembers(): Promise<Member[]> {
  const db = await dbPromise
  const members = await db.getAll('members')
  return members.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}

export async function saveMember(input: MemberInput, id?: string): Promise<Member> {
  const db = await dbPromise
  const existing = id ? await db.get('members', id) : undefined
  const timestamp = nowIso()
  const member: Member = {
    id: existing?.id ?? id ?? newId(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    group: input.group.trim(),
    role: input.role,
    notes: input.notes.trim(),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  await db.put('members', member)
  await enqueue('members', member.id, 'upsert', member)
  bump()
  return member
}

export async function deleteMember(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('members', id)
  await enqueue('members', id, 'delete', { id })
  bump()
}

/* ------------------------------------------------------------------ */
/* Eventos                                                            */
/* ------------------------------------------------------------------ */

export type EventInput = Pick<
  CongregationEvent,
  'title' | 'description' | 'location' | 'startsAt' | 'durationMinutes'
>

export async function listEvents(): Promise<CongregationEvent[]> {
  const db = await dbPromise
  const events = await db.getAll('events')
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export async function saveEvent(
  input: EventInput,
  id?: string,
): Promise<CongregationEvent> {
  const db = await dbPromise
  const existing = id ? await db.get('events', id) : undefined
  const timestamp = nowIso()
  const event: CongregationEvent = {
    id: existing?.id ?? id ?? newId(),
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  await db.put('events', event)
  await enqueue('events', event.id, 'upsert', event)
  bump()
  return event
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('events', id)
  await enqueue('events', id, 'delete', { id })
  bump()
}

/* ------------------------------------------------------------------ */
/* Avisos                                                             */
/* ------------------------------------------------------------------ */

export type AnnouncementInput = Pick<Announcement, 'title' | 'body' | 'pinned'>

export async function listAnnouncements(): Promise<Announcement[]> {
  const db = await dbPromise
  const items = await db.getAll('announcements')
  return items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export async function saveAnnouncement(
  input: AnnouncementInput,
  id?: string,
): Promise<Announcement> {
  const db = await dbPromise
  const existing = id ? await db.get('announcements', id) : undefined
  const timestamp = nowIso()
  const item: Announcement = {
    id: existing?.id ?? id ?? newId(),
    title: input.title.trim(),
    body: input.body.trim(),
    pinned: input.pinned,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  await db.put('announcements', item)
  await enqueue('announcements', item.id, 'upsert', item)
  bump()
  return item
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete('announcements', id)
  await enqueue('announcements', id, 'delete', { id })
  bump()
}

export async function togglePinned(item: Announcement): Promise<void> {
  const db = await dbPromise
  const updated: Announcement = { ...item, pinned: !item.pinned, updatedAt: nowIso() }
  await db.put('announcements', updated)
  await enqueue('announcements', updated.id, 'upsert', updated)
  bump()
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                         */
/* ------------------------------------------------------------------ */

export async function countPendingOps(): Promise<number> {
  const db = await dbPromise
  return db.count('outbox')
}

/**
 * Inserta registros ya existentes (importación / restauración) conservando
 * sus identificadores y fechas, y los encola para sincronizar.
 */
export async function importRecords(records: {
  members?: Member[]
  events?: CongregationEvent[]
  announcements?: Announcement[]
}): Promise<void> {
  const db = await dbPromise
  let total = 0

  for (const member of records.members ?? []) {
    await db.put('members', member)
    await enqueue('members', member.id, 'upsert', member)
    total += 1
  }
  for (const event of records.events ?? []) {
    await db.put('events', event)
    await enqueue('events', event.id, 'upsert', event)
    total += 1
  }
  for (const announcement of records.announcements ?? []) {
    await db.put('announcements', announcement)
    await enqueue('announcements', announcement.id, 'upsert', announcement)
    total += 1
  }

  if (total > 0) bump()
}

export async function clearAllData(): Promise<void> {
  const db = await dbPromise
  const stores: EntityKind[] = ['members', 'events', 'announcements']
  for (const store of stores) await db.clear(store)
  await db.clear('outbox')
  await saveSettings({ demoLoaded: false })
  bump()
}
