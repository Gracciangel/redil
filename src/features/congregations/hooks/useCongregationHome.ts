import { useSettings } from '@/lib/settings'
import { useUserStore } from '@/store/Store'

/**
 * Viewmodel de la pantalla principal de la congregación.
 *
 * Responsabilidad: tomar el estado de configuración y del usuario y exponerlo
 * como datos listos para presentar. No carga datos de negocio: eso ya lo hace
 * `useDashboardView`, que es consumido por `DashboardView`.
 *
 * La vista no consulta nada por su cuenta; solo recibe este viewmodel.
 */
export function useCongregationHome() {
  const { settings } = useSettings()
  const user = useUserStore((state) => state.user)

  return {
    congregationName: settings.congregationName,
    adminEmail: user?.email ?? null,
    adminName: user?.displayName ?? null,
  }
}
