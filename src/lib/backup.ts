import { dbPromise } from './db'
import { importRecords } from './repo'
import {
  MEMBER_ROLES,
  type Announcement,
  type CongregationEvent,
  type Member,
  type MemberRole,
} from './types'

export interface BackupFile {
  app: 'redil'
  version: 1
  exportedAt: string
  members: Member[]
  events: CongregationEvent[]
  announcements: Announcement[]
}

export interface ParsedBackup {
  members: Member[]
  events: CongregationEvent[]
  announcements: Announcement[]
}

export async function createBackup(): Promise<BackupFile> {
  const db = await dbPromise
  const [members, events, announcements] = await Promise.all([
    db.getAll('members'),
    db.getAll('events'),
    db.getAll('announcements'),
  ])
  return {
    app: 'redil',
    version: 1,
    exportedAt: new Date().toISOString(),
    members,
    events,
    announcements,
  }
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `redil-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function parseMember(raw: unknown): Member | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const name = asString(raw.name).trim()
  if (!id || !name) return null
  const role = MEMBER_ROLES.includes(raw.role as MemberRole)
    ? (raw.role as MemberRole)
    : 'miembro'
  const createdAt = asString(raw.createdAt, new Date().toISOString())
  return {
    id,
    name,
    phone: asString(raw.phone),
    email: asString(raw.email),
    group: asString(raw.group),
    role,
    notes: asString(raw.notes),
    createdAt,
    updatedAt: asString(raw.updatedAt, createdAt),
  }
}

function parseEvent(raw: unknown): CongregationEvent | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const title = asString(raw.title).trim()
  const startsAt = asString(raw.startsAt)
  if (!id || !title || Number.isNaN(Date.parse(startsAt))) return null
  const createdAt = asString(raw.createdAt, new Date().toISOString())
  return {
    id,
    title,
    description: asString(raw.description),
    location: asString(raw.location),
    startsAt,
    durationMinutes:
      typeof raw.durationMinutes === 'number' && raw.durationMinutes > 0
        ? raw.durationMinutes
        : 60,
    createdAt,
    updatedAt: asString(raw.updatedAt, createdAt),
  }
}

function parseAnnouncement(raw: unknown): Announcement | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const title = asString(raw.title).trim()
  if (!id || !title) return null
  const createdAt = asString(raw.createdAt, new Date().toISOString())
  return {
    id,
    title,
    body: asString(raw.body),
    pinned: raw.pinned === true,
    createdAt,
    updatedAt: asString(raw.updatedAt, createdAt),
  }
}

export async function readBackupFile(file: File): Promise<ParsedBackup> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }

  if (!isRecord(raw) || raw.app !== 'redil') {
    throw new Error('El archivo no es una copia de seguridad de Redil')
  }

  const parseAll = <T>(value: unknown, parser: (item: unknown) => T | null): T[] =>
    Array.isArray(value) ? value.map(parser).filter((item): item is T => item !== null) : []

  return {
    members: parseAll(raw.members, parseMember),
    events: parseAll(raw.events, parseEvent),
    announcements: parseAll(raw.announcements, parseAnnouncement),
  }
}

export async function restoreBackup(parsed: ParsedBackup): Promise<number> {
  const total = parsed.members.length + parsed.events.length + parsed.announcements.length
  await importRecords(parsed)
  return total
}
