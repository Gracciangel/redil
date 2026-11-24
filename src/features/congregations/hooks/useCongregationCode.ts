import { useCongregationStore, type CongregationSession } from '@/store/CongregationStore'

export interface CongregationCodeVM {
  congregation: CongregationSession | null
  code: string
  name: string
  adminEmail: string | null
}

/**
 * Estado para la vista Code del tenant.
 *
 * Lee únicamente la sesión que persistió `loginWithCongregation`: ese flujo es
 * un RPC con password y no crea `auth.uid()`, así que acá no se consulta
 * Supabase ni se evalúan permisos (eso es responsabilidad del guard).
 */
export function useCongregationCode(): CongregationCodeVM {
  const congregation = useCongregationStore((s) => s.congregation)

  return {
    congregation,
    code: congregation?.invitation_code ?? '',
    name: congregation?.name ?? '',
    adminEmail: congregation?.admin_email ?? null,
  }
}
