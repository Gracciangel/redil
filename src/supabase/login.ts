import type { User } from '@supabase/supabase-js'
import type { IUser } from '@/interfaces/IUser'
import type { IError } from '@/interfaces/IErrors'
import { supabase } from '@/supabase/supabase'
import { clearAllData } from '@/lib/repo'
import {
  isSessionExpired, isTenantSessionError, TENANT_SESSION_MS,
  useCongregationStore, type CongregationSession,
} from '@/store/CongregationStore'
import { useStatsStore } from '@/store/StatsStore'
import { useUserStore } from '@/store/Store'
/** Resultado del login de tenant: el IError de siempre + la sesión. */
export interface CongregationLoginResult extends IError {
  congregation?: CongregationSession | null
}
/** Convierte el usuario de Supabase Auth al shape IUser del store. */
export function mapAuthUser(user: User | null): IUser | null {
  if (!user) return null
  const m = user.user_metadata ?? {}
  const name = m.full_name || m.name || user.email?.split('@')[0] || null
  const photo = m.avatar_url || m.picture || null
  const provider = user.app_metadata?.provider
  return {
    uid: user.id, displayName: typeof name === 'string' ? name : null,
    email: user.email ?? null, phoneNumber: user.phone ?? (typeof m.phone === 'string' ? m.phone : null),
    photoURL: typeof photo === 'string' ? photo : null,
    providerId: typeof provider === 'string' ? provider : 'google', rol: null,
  }
}
/** Limpia la sesión de tenant y su caché, sin tocar Supabase Auth. */
export function clearTenantSession(): void {
  useCongregationStore.getState().setCongregation(null)
  useStatsStore.getState().reset()
}
/** Cierra Auth aunque falle la red; el store de usuario se limpia ya, en sync. */
export async function clearAuthSession(): Promise<void> {
  useUserStore.getState().setUser(null); localStorage.removeItem('user')
  try {
    const { error } = await supabase.auth.signOut(); if (error) throw error
  } catch (error) {
    console.warn('[auth] signOut remoto falló; se fuerza cierre local:', error)
    try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* sin sesión local */ }
    useUserStore.getState().setUser(null)
  }
}
/** Errores 401/JWT de Auth; NO confundir con red caída o RPC ausente. */
export function isAuthSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /\b401\b|jwt|token.*(expir|invalid)|sesión.*(expir|vencid)/i.test(message)
}
/** Google redirige a /login; AuthProvider detecta la sesión al volver. */
export const loginWithGoogle = async (): Promise<void> => {
  clearTenantSession() // una sola sesión activa: se baja la de congregación
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })
  if (error) throw new Error(error.message || 'No se pudo iniciar sesión con Google.')
}
/** Login de congregación: RPC con password, sin auth.uid(). */
export const loginWithCongregation = async (username: string, password: string): Promise<CongregationLoginResult> => {
  const adminEmail = username.trim().toLowerCase()
  if (!adminEmail || !password) return { error: true, msj: 'Usuario y contraseña son obligatorios.', detils: null }
  try {
    await clearAuthSession() // una sola sesión activa: se cierra Auth primero
    const { data, error } = await supabase.rpc('login_congregation', { p_admin_email: adminEmail, p_password: password })
    if (error) return { error: true, msj: 'No se pudo iniciar sesión como congregación.', detils: error.message }
    const r = data as { ok?: boolean; vify?: boolean; error?: string; session_token?: string | null; congregation?: Record<string, unknown> | null } | null
    if (!r?.ok) return { error: true, msj: r?.vify === false ? 'Congregación pendiente de validación.' : 'No se pudo iniciar sesión como congregación.', detils: r?.error ?? 'Credenciales inválidas.' }
    const raw = r.congregation
    const congregation: CongregationSession | null = raw?.id ? {
      id: String(raw.id), name: String(raw.name ?? ''), slug: String(raw.slug ?? ''), invitation_code: String(raw.invitation_code ?? ''),
      admin_email: typeof raw.admin_email === 'string' ? raw.admin_email : null,
      vify: Boolean(r.vify), sessionToken: r.session_token ? String(r.session_token) : null,
      expiresAt: new Date(Date.now() + TENANT_SESSION_MS).toISOString(),
      photoUrl: typeof raw.photo_url === 'string' ? raw.photo_url : null,
      bannerUrl: typeof raw.banner_url === 'string' ? raw.banner_url : null,
      bio: typeof raw.bio === 'string' ? raw.bio : null,
    } : null
    useCongregationStore.getState().setCongregation(congregation)
    if (congregation) useStatsStore.getState().reset()
    return { error: false, msj: 'Sesión iniciada correctamente.', detils: null, congregation }
  } catch (e) {
    return { error: true, msj: 'No se pudo iniciar sesión como congregación.', detils: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

/** Chequeo liviano para el router; limpia la congregación si venció localmente. */
export async function validateCongregationSession(): Promise<boolean> {
  const session = useCongregationStore.getState().congregation
  if (!session?.sessionToken) return false
  if (isSessionExpired(session)) { clearTenantSession(); return false }
  const { error } = await supabase.rpc('list_tenant_news', { p_token: session.sessionToken })
  if (error && isTenantSessionError(error)) { clearTenantSession(); return false }
  return true // un fallo de red no deslogea: no prueba que la sesión sea inválida
}
/** Cierra todo. Pasá `{ redirect: false }` si el caller navega con react-router. */
export const logout = async ({ redirect = true }: { redirect?: boolean } = {}): Promise<void> => {
  await clearAuthSession()
  clearTenantSession()
  // Barrido final: por si quedó alguna clave vieja de sesiones anteriores.
  try { localStorage.clear() } catch (error) { console.warn('[auth] localStorage:', error) }
  try { await clearAllData() } catch (error) { console.warn('[auth] IndexedDB:', error) }
  if (redirect && window.location.pathname !== '/login') window.location.assign('/login')
}
