import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/supabase/supabase'
import { syncMyRole } from '@/features/congregations/services/membership'
import { clearTenantSession, mapAuthUser } from '@/supabase/login'
import { useUserStore } from '@/store/Store'

/**
 * Sincroniza la sesión de Supabase Auth con el store de usuario.
 *
 * `getSession()` cubre la carga inicial (incluido el retorno del OAuth de
 * Google); `onAuthStateChange` cubre login, logout y expiración de token.
 * La vista no conoce Supabase: solo consume `user` / `authReady` del store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((s) => s.setUser)
  const setAuthReady = useUserStore((s) => s.setAuthReady)

  useEffect(() => {
    let active = true

    const applySession = (session: Session | null) => {
      if (!active) return
      setUser(mapAuthUser(session?.user ?? null))
      setAuthReady(true)

      // Una sola sesión activa: si hay Auth, la sesión de tenant no puede quedar.
      if (session?.user) clearTenantSession()

      // El rol no vive en Auth sino en memberships: lo traemos aparte. Si el
      // miembro todavía no pertenece a un tenant, syncMyRole() no hace nada y
      // se completará cuando canjee el código.
      if (session?.user) void syncMyRole().catch(() => undefined)
    }

    void supabase.auth.getSession().then(({ data }) => applySession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [setUser, setAuthReady])

  return <>{children}</>
}
