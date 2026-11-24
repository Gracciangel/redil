import { useEffect } from 'react'
import { useDataVersion, useOnline } from '@/lib/hooks'
import { useSettings } from '@/lib/settings'
import { refreshPending, runSync } from '@/lib/sync'

/**
 * Sin interfaz: mantiene al día el contador de cambios pendientes y lanza
 * la sincronización automática al arrancar, al volver la conexión y cada minuto.
 */
export function SyncManager() {
  const { settings } = useSettings()
  const version = useDataVersion()
  const online = useOnline()

  useEffect(() => {
    void refreshPending()
  }, [version])

  useEffect(() => {
    if (!settings.apiUrl.trim()) return

    const attempt = () => {
      if (navigator.onLine) void runSync(settings)
    }

    attempt()
    window.addEventListener('online', attempt)
    const interval = window.setInterval(attempt, 60_000)
    return () => {
      window.removeEventListener('online', attempt)
      window.clearInterval(interval)
    }
    // `online` fuerza un intento inmediato al recuperar la conexión.
  }, [settings, online])

  return null
}
