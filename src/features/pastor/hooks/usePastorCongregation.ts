import { useCallback } from 'react'
import { useActionRunner } from '@/features/congregations/hooks/useActionRunner'
import { useAsyncData } from '@/lib/hooks'
import type { PastorInput } from '../services/pastorService'
import { readPastorCongregation, savePastorCongregation } from '../services/pastorService'

/** Viewmodel de la tarjeta del pastor: solo expone estado y acciones. */
export function usePastorCongregation() {
  const { data, loading, error } = useAsyncData(readPastorCongregation)
  const { notice, busy, run } = useActionRunner()

  const save = useCallback((input: PastorInput) => (
    run('pastor', async () => {
      await savePastorCongregation(input)
    }, 'Datos del pastor guardados.')
  ), [run])

  return { pastor: data, loading, error, notice, busy, save }
}
