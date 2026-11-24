import { fetchWithTimeout } from './http'
import type { SyncOperation } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Quita barras finales para construir URLs previsibles. */
export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

function operationUrl(baseUrl: string, op: SyncOperation): string {
  return `${normalizeBaseUrl(baseUrl)}/${op.entity}/${encodeURIComponent(op.entityId)}`
}

/**
 * Contrato de la API (backend propio, todavía por implementar):
 *   PUT/DELETE {apiUrl}/{entity}/{id} → 200/201/204
 *   GET {apiUrl}/health → 200
 * `X-Redil-Op` identifica la operación para deduplicar reintentos.
 */
export async function sendOperation(
  baseUrl: string,
  op: SyncOperation,
  signal?: AbortSignal,
): Promise<void> {
  const init: RequestInit = {
    method: op.op === 'delete' ? 'DELETE' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Redil-Op': op.id,
    },
    body: op.op === 'upsert' ? JSON.stringify(op.payload) : undefined,
    signal,
  }

  try {
    const response = await fetchWithTimeout(operationUrl(baseUrl, op), init)
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new ApiError(
        response.status,
        detail.trim() || `La API respondió con estado ${response.status}`,
      )
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('La API tardó demasiado en responder.')
    }
    throw new Error('No se pudo conectar con la API', { cause: error })
  }
}

export async function pingApi(baseUrl: string, signal?: AbortSignal): Promise<void> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/health`,
    { headers: { Accept: 'application/json' }, signal },
  )
  if (!response.ok) {
    throw new ApiError(response.status, `La API respondió con estado ${response.status}`)
  }
}
