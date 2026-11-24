import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Announcement,
  AppSettings,
  CongregationEvent,
  Member,
  SyncOperation,
} from './types'

interface RedilDB extends DBSchema {
  members: { key: string; value: Member; indexes: { 'by-name': string } }
  events: { key: string; value: CongregationEvent; indexes: { 'by-start': string } }
  announcements: { key: string; value: Announcement; indexes: { 'by-created': string } }
  outbox: { key: string; value: SyncOperation; indexes: { 'by-created': string } }
  settings: { key: string; value: AppSettings }
}

export type RedilDatabase = IDBPDatabase<RedilDB>

export const DB_NAME = 'redil'
export const SETTINGS_KEY = 'app'

export const dbPromise = openDB<RedilDB>(DB_NAME, 1, {
  upgrade(db) {
    const members = db.createObjectStore('members', { keyPath: 'id' })
    members.createIndex('by-name', 'name')

    const events = db.createObjectStore('events', { keyPath: 'id' })
    events.createIndex('by-start', 'startsAt')

    const announcements = db.createObjectStore('announcements', { keyPath: 'id' })
    announcements.createIndex('by-created', 'createdAt')

    const outbox = db.createObjectStore('outbox', { keyPath: 'id' })
    outbox.createIndex('by-created', 'createdAt')

    db.createObjectStore('settings')
  },
})
