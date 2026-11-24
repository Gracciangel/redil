import { ApiError, normalizeBaseUrl, sendOperation } from './api'
import { dbPromise } from './db'
import type { AppSettings, SyncOperation } from './types'

export type SyncState = 'unconfigured' | 'idle' | 'syncing' | 'error'
export interface SyncStatus {
  state: SyncState
  pending: number
  lastSyncAt: string | null
  error: string | null
}

type QueuedOp = SyncOperation & { nextAttemptAt?: number }
const MAX_ATTEMPTS = 5
const BACKOFF_BASE_MS = 5_000
const BACKOFF_MAX_MS = 60_000
let status: SyncStatus = { state: 'unconfigured', pending: 0, lastSyncAt: null, error: null }
const listeners = new Set<() => void>()

export function getSyncStatus(): SyncStatus {
  return status
}
/** Recalcula el contador de la cola sin intentar envíos. */
export async function refreshPending(): Promise<void> {
  update({ pending: await (await dbPromise).count('outbox') })
}
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function update(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch }
  for (const listener of listeners) listener()
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de sincronización desconocido'
}
function isPermanentFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  const { status: code } = error
  return code >= 400 && code < 500 && code !== 408 && code !== 429
}
function retryDelay(attempts: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1))
}
/** Envía en orden, pero un op fallido (con backoff) no bloquea a los siguientes. */
export async function runSync(settings: AppSettings): Promise<SyncStatus> {
  const baseUrl = normalizeBaseUrl(settings.apiUrl)
  if (!baseUrl) {
    update({ state: 'unconfigured', error: null })
    return status
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    update({ state: 'idle', error: 'Sin conexión a internet' })
    return status
  }
  if (status.state === 'syncing') return status
  update({ state: 'syncing', error: null })
  const db = await dbPromise
  let lastError: string | null = null

  try {
    const operations = (await db.getAllFromIndex('outbox', 'by-created')) as QueuedOp[]
    const now = Date.now()
    for (const op of operations) {
      if (typeof op.nextAttemptAt === 'number' && op.nextAttemptAt > now) continue
      try {
        await sendOperation(baseUrl, op)
        await db.delete('outbox', op.id)
      } catch (error) {
        const attempts = op.attempts + 1
        const message = errorMessage(error)
        lastError = message
        if (isPermanentFailure(error) && attempts >= MAX_ATTEMPTS) {
          await db.delete('outbox', op.id)
          continue
        }
        const retry: QueuedOp = {
          ...op,
          attempts,
          lastError: message,
          nextAttemptAt: now + retryDelay(attempts),
        }
        await db.put('outbox', retry)
      }
    }
    update({
      state: lastError ? 'error' : 'idle',
      lastSyncAt: new Date().toISOString(),
      error: lastError,
    })
  } catch (error) {
    update({ state: 'error', error: errorMessage(error) })
  } finally {
    update({ pending: await db.count('outbox') })
  }
  return status
}
