import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'

export interface SessionIdentity {
  /** Nombre que debe mostrarse en la cabecera: congregación o persona. */
  displayName: string
  /** Texto secundario opcional (email del administrador del tenant). */
  caption: string | null
  isTenant: boolean
}

/**
 * Identidad de la sesión para la cabecera.
 *
 * El store local de ajustes tiene un nombre genérico ("Mi hola") que no sirve
 * de rótulo. Priorizamos la sesión real: nombre del tenant si entró como
 * congregación, nombre (o email) del miembro si entró con Google.
 */
export function useSessionIdentity(): SessionIdentity {
  const congregation = useCongregationStore((s) => s.congregation)
  const user = useUserStore((s) => s.user)

  if (congregation) {
    return {
      displayName: congregation.name || 'Mi congregación',
      caption: congregation.admin_email,
      isTenant: true,
    }
  }

  const memberName = user?.displayName?.trim() || user?.email || ''
  return {
    displayName: memberName || 'Miembro',
    caption: null,
    isTenant: false,
  }
}
