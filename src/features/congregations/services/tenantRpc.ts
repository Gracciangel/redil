import { supabase } from '@/supabase/supabase'
import { isSessionExpired, useCongregationStore } from '@/store/CongregationStore'
import type { TenantMemberRole } from './tenantMembers'

/** El tenant no tiene auth.uid(): sus RPCs se autorizan con el token de sesión. */
export function requireToken(): string {
  const session = useCongregationStore.getState().congregation
  if (!session?.sessionToken) throw new Error('Iniciá sesión como congregación para continuar.')
  if (isSessionExpired(session)) throw new Error('Sesión de congregación vencida. Ingresá de nuevo.')
  return session.sessionToken
}

export async function callRpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(error.message || 'No se pudo completar la operación.')
  return data as T
}

export function roleOf(value: unknown): TenantMemberRole {
  return value === 'admin' || value === 'leader' || value === 'member' ? value : 'member'
}
