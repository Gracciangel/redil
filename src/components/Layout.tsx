import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSessionIdentity } from '@/features/profile/hooks/useSessionIdentity'
import { usePWA } from '@/pwa/PWAProvider'
import { Icon, type IconName } from './Icons'
import { OfflineBar } from './OfflineBar'
// import { SyncBadge } from './SyncBadge'
import { TbLogout2 } from "react-icons/tb";
import { UpdateToast } from './UpdateToast'
import { logout } from '@/supabase/login'
import { useCongregationStore } from '@/store/CongregationStore'

interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Solo se muestra cuando hay sesión de tenant (Code no aplica a miembros). */
  tenantOnly?: boolean
}

/**
 * Único origen del menú: solo las pantallas definidas en `rulesView.md`.
 * Code se filtra para miembros; el resto es igual para ambos perfiles.
 * `MembersView`, `EventsView` y `AnnouncementsView` siguen existiendo como
 * atajos internos, pero ya no ocupan lugar en el tab.
 */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
  { to: '/biblia', label: 'Biblia', icon: 'book' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar' },
  { to: '/code', label: 'Code', icon: 'qr', tenantOnly: true },
]

export function Layout() {
  const identity = useSessionIdentity()
  const { canInstall, install } = usePWA()
  const location = useLocation()
  const congregation = useCongregationStore((s) => s.congregation)
  const navItems = NAV_ITEMS.filter((item) => !item.tenantOnly || congregation)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <Link to="/" className="brand">
          <img src="/icons/brand-mark.png" alt="" className="brand-mark" width={36} height={36} />
          <span className="brand-text">
            <strong>Redil</strong>
            <small title={identity.caption ?? identity.displayName}>{identity.displayName}</small>
          </span>
        </Link>

        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* <SyncBadge /> */}
          <TbLogout2 color="currentColor" width={30} height={30} 
          onClick={() => void logout()}
          />
      
        </div>
      </aside>

      <div className="app-body">
        <OfflineBar />

        <header className="topbar">
          <Link to="/" className="topbar-brand">
            <img src="/icons/brand-mark.png" alt="" width={30} height={30} />
            <strong>{identity.displayName}</strong>
          </Link>
          <div className="topbar-actions">
            {canInstall && (
              <button
              type="button"
              className="icon-btn"
              aria-label="Instalar aplicación"
              title="Instalar aplicación"
              onClick={() => void install()}
              >
                <Icon name="install" size={20} />
              </button>
            )}
            {/* <SyncBadge /> */}
            <TbLogout2 color="currentColor" width={30} height={30} 
            onClick={() => void logout()}
            />
          </div>
        </header>

        <main id="main" className="content">
          <div key={location.pathname} className="route-transition">
            <Outlet />
          </div>
        </main>

        <nav className="tabbar" aria-label="Navegación">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `tab-link${isActive ? ' is-active' : ''}`}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <UpdateToast />
    </div>
  )
}
