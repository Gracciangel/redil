import { Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { TenantSessionAlert } from '@/features/congregations/components/TenantSessionAlert'
import { usePastorCongregationBoot } from '@/features/pastor/hooks/usePastorCongregationBoot'
import { validateCongregationSession } from '@/supabase/login'
import { isSessionExpired, useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'
import { MemberAccessGuard } from './MemberAccessGuard'
import {
  AccessRequiredView, AnnouncementsView, BibleView, CalendarView, CodeView,
  CongregationHomeView, DashboardView, DirectoryView, EventsView, MemberHomeView,
  MemberProfileView, MembersView, MinistriesView, NotFoundView, PrincipalView,
  SettingsView, SongbookView, TenantProfileView,
} from './lazyViews'

function ProtectedRoute() {
  const user = useUserStore((s) => s.user)
  const authReady = useUserStore((s) => s.authReady)
  const congregation = useCongregationStore((s) => s.congregation)
  const location = useLocation()
  usePastorCongregationBoot()
  // El cancionero público (título y letra) se abre sin sesión.
  const isPublicSongbook = location.pathname === '/cancionero'
  const [tenantReady, setTenantReady] = useState(!congregation)

  useEffect(() => {
    if (!congregation) {
      setTenantReady(true)
      return
    }
    setTenantReady(false)
    let alive = true
    void validateCongregationSession().then((ok) => { if (alive) setTenantReady(ok) })
    return () => { alive = false }
  }, [congregation])

  if (!isPublicSongbook && congregation && !tenantReady) return <LoadingOverlay label="Verificando sesión…" />
  if (!isPublicSongbook && !congregation && !authReady) return <LoadingOverlay label="Cargando…" />
  if (!isPublicSongbook && !user && !congregation) return <Navigate to="/login" replace />

  return <>{!isPublicSongbook && <TenantSessionAlert />}<Outlet /></>
}

function LoginRoute() {
  const user = useUserStore((s) => s.user)
  const congregation = useCongregationStore((s) => s.congregation)

  // El tenant vuelve siempre a su Code; el miembro, a su Home.
  if (congregation && !isSessionExpired(congregation)) return <Navigate to="/code" replace />
  return user ? <Navigate to="/" replace /> : <PrincipalView />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingOverlay label="Cargando…" />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<ProtectedRoute />}>
          {/* R7: sin Layout, para que el modal sea la única UI visible. */}
          <Route path="acceso" element={<AccessRequiredView />} />

          {/* Público: título y letra sin cifrado; sin guard de membresía. */}
          <Route element={<Layout />}>
            <Route path="cancionero" element={<SongbookView />} />
          </Route>

          <Route element={<MemberAccessGuard />}>
            <Route element={<Layout />}>
              {/* Únicas pantallas del tab, según rulesView.md. */}
              <Route index element={<DashboardView />} />
              <Route path="perfil" element={<TenantProfileView />} />
              <Route path="ajustes" element={<SettingsView />} />
              <Route path="biblia" element={<BibleView />} />
              <Route path="calendario" element={<CalendarView />} />
              <Route path="code" element={<CodeView />} />

              {/* Atajos internos heredados: no están en el tab. */}
              <Route path="congregacion" element={<CongregationHomeView />} />
              <Route path="ministerios" element={<MinistriesView />} />
              <Route path="directorio" element={<DirectoryView />} />
              <Route path="miembro" element={<MemberHomeView />} />
              <Route path="miembros" element={<MembersView />} />
              <Route path="miembros/:userId" element={<MemberProfileView />} />
              <Route path="eventos" element={<EventsView />} />
              <Route path="avisos" element={<AnnouncementsView />} />
              <Route path="*" element={<NotFoundView />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
