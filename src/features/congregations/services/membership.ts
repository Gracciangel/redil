import { toAppError } from '@/lib/errors'
import { withAbort } from '@/lib/http'
import { callRpc, supabase } from '@/supabase/supabase'
import { useUserStore } from '@/store/Store'

export interface CongregationPreview {
  id: string
  name: string
  city: string | null
  country: string | null
  photo_url: string | null
}

export interface MyMembership {
  congregation_id: string
  name: string
  slug: string
  role: 'admin' | 'leader' | 'member'
}

/**
 * Congregación del usuario autenticado, o `null`. Sin sesión de Auth no existe
 * `auth.uid()`, así que ni se llama al RPC.
 */
export async function getMyMembership(): Promise<MyMembership | null> {
  const { data: auth } = await supabase.auth.getSession()
  if (!auth.session) return null

  const request = Promise.resolve(supabase.rpc('get_my_membership'))
  const { data, error } = await withAbort(request)
  if (error) {
    // PGRST202/404: falta el RPC en el schema cache (SQL no ejecutado).
    if (error.code === 'PGRST202' || error.code === 'PGRST404') {
      throw new Error(
        'Falta el RPC get_my_membership en Supabase. Ejecutá src/supabase/rpcs/getMyMembership.sql en el SQL Editor y recargá la app.',
      )
    }
    throw toAppError(error, 'get_my_membership')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null

  return {
    congregation_id: String(row.congregation_id),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    role: row.role as MyMembership['role'],
  }
}

/** Actualiza el rol del store: `onAuthStateChange` no detecta cambios de membresía. */
export async function syncMyRole(): Promise<void> {
  const membership = await getMyMembership()
  if (!membership) return

  const { user, setUser } = useUserStore.getState()
  if (user) setUser({ ...user, rol: membership.role })
}

/** Vista previa por código de invitación (QR/código). */
export async function previewCongregationByCode(code: string): Promise<CongregationPreview | null> {
  const normalized = code.trim()
  if (!normalized) return null

  const data = await callRpc<unknown>('preview_congregation', { p_code: normalized })
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    city: row.city ?? null,
    country: row.country ?? null,
    photo_url: row.photo_url ?? null,
  }
}

/** Asocia al usuario autenticado con `auth.uid()` a una congregación. */
export async function joinCongregationByCode(code: string): Promise<string> {
  const normalized = code.trim()
  if (!normalized) throw new Error('Ingresá un código de invitación válido.')

  const data = await callRpc<unknown>('join_congregation', { p_code: normalized })
  return String(data)
}
