import { useState } from 'react'
import { bump } from '@/lib/live'

export type Notice = { tone: 'ok' | 'error'; text: string }

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

/**
 * Ejecuta una mutación, dispara la recarga de todos los `useAsyncData` y deja
 * un aviso para la vista. Centraliza el patrón busy/notice de los formularios.
 */
export function useActionRunner() {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<void>, ok: string) {
    setBusy(key)
    setNotice(null)
    try {
      await action()
      bump()
      setNotice({ tone: 'ok', text: ok })
    } catch (error) {
      setNotice({ tone: 'error', text: messageOf(error) })
    } finally {
      setBusy(null)
    }
  }

  return { notice, busy, run, setNotice }
}
