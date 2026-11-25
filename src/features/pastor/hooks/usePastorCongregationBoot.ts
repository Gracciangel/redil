import { useEffect } from 'react'
import { useCongregationStore } from '@/store/CongregationStore'
import { readPastorCongregation } from '../services/pastorService'

/**
 * Lee el estado del pastor al arrancar una sesión de congregación.
 * No bloquea ni desloguea: si el RPC falta, la tarjeta mostrará el error.
 */
export function usePastorCongregationBoot(): void {
  const sessionToken = useCongregationStore((s) => s.congregation?.sessionToken)

  useEffect(() => {
    if (!sessionToken) return
    void readPastorCongregation().catch(() => undefined)
  }, [sessionToken])
}
