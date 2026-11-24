import { useAsyncData } from '@/lib/hooks'
import { bump } from '@/lib/live'
import { useUserStore } from '@/store/Store'
import { getMyMinistries } from '../services/leaderMinistries'

function load() {
  return getMyMinistries()
}

/**
 * Ministerios/grupos del usuario autenticado. Se habilita solo para miembros
 * con sesión de Supabase Auth: el tenant no tiene `auth.uid()`.
 */
export function useMyMinistries(enabled = true) {
  const user = useUserStore((s) => s.user)
  const { data, loading, error } = useAsyncData(load, [], enabled && Boolean(user))
  return {
    ministries: data ?? [],
    loading,
    error,
    reload: bump,
  }
}
