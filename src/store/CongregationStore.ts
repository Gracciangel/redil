import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Vigencia local del token opaco de tenant (el RPC no devuelve `expires_at`). */
export const TENANT_SESSION_MS = 12 * 60 * 60 * 1000

/**
 * Datos de la congregación cuando entra como tenant (login por RPC con
 * password). No hay sesión de Supabase Auth en este flujo: `auth.uid()` es null.
 */
export interface CongregationSession {
  id: string
  name: string
  slug: string
  invitation_code: string
  admin_email: string | null
  vify: boolean
  /** Token opaco de `login_congregation`: autoriza los RPCs del tenant. */
  sessionToken: string | null
  /** ISO del vencimiento local. Ausente en sesiones de versiones anteriores. */
  expiresAt?: string | null
  photoUrl: string | null
  bannerUrl: string | null
  bio: string | null
}

interface CongregationState {
  congregation: CongregationSession | null
  setCongregation: (congregation: CongregationSession | null) => void
}

export const useCongregationStore = create<CongregationState>()(
  persist(
    (set) => ({
      congregation: null,
      setCongregation: (congregation) => set({ congregation }),
    }),
    { name: 'redil-congregation' },
  ),
)

/**
 * true si la sesión persistida ya venció localmente. Las sesiones viejas sin
 * `expiresAt` no se descartan: en ese caso decide el backend.
 */
export function isSessionExpired(
  session: CongregationSession | null = useCongregationStore.getState().congregation,
): boolean {
  if (!session?.expiresAt) return false
  const time = Date.parse(session.expiresAt)
  return Number.isFinite(time) && time <= Date.now()
}

/** Único lugar que interpreta el error de token de tenant vencido/inválido. */
export function isTenantSessionError(error: unknown): boolean {
  const candidate = error && typeof error === 'object' && 'message' in error ? error.message : error
  const message = typeof candidate === 'string' ? candidate : error instanceof Error ? error.message : ''
  return /sesión de congregación inválida|vencida/i.test(message)
}
