import { Link } from 'react-router-dom'
import { formatRelative } from '@/lib/format'
import { useOnline, useSyncStatus } from '@/lib/hooks'
import { useSettings } from '@/lib/settings'
import { Icon, type IconName } from './Icons'

interface Appearance {
  icon: IconName
  label: string
  tone: 'ok' | 'pending' | 'busy' | 'error' | 'offline' | 'neutral'
  title: string
}

export function SyncBadge() {
  const { settings } = useSettings()
  const sync = useSyncStatus()
  const online = useOnline()
  const apiConfigured = settings.apiUrl.trim().length > 0

  let appearance: Appearance

  if (!online) {
    appearance = {
      icon: 'wifiOff',
      label: 'Sin conexión',
      tone: 'offline',
      title: 'Puedes seguir trabajando. Los cambios se enviarán al recuperar la conexión.',
    }
  } else if (sync.state === 'syncing') {
    appearance = {
      icon: 'refresh',
      label: 'Sincronizando…',
      tone: 'busy',
      title: 'Enviando los cambios pendientes a la API.',
    }
  } else if (apiConfigured && sync.state === 'error') {
    appearance = {
      icon: 'alert',
      label: 'Error al sincronizar',
      tone: 'error',
      title: sync.error ?? 'No se pudo contactar con la API.',
    }
  } else if (!apiConfigured) {
    appearance = {
      icon: 'database',
      label: sync.pending > 0 ? `${sync.pending} sin enviar` : 'Solo local',
      tone: 'neutral',
      title:
        'Los datos se guardan en este dispositivo. Configura la URL de la API en Ajustes para sincronizar.',
    }
  } else if (sync.pending > 0) {
    appearance = {
      icon: 'upload',
      label: `${sync.pending} pendiente${sync.pending === 1 ? '' : 's'}`,
      tone: 'pending',
      title: 'Hay cambios esperando a enviarse a la API.',
    }
  } else {
    appearance = {
      icon: 'check',
      label: 'Sincronizado',
      tone: 'ok',
      title: sync.lastSyncAt
        ? `Última sincronización: ${formatRelative(sync.lastSyncAt)}.`
        : 'Todos los cambios están enviados.',
    }
  }

  return (
    <Link
      to="/ajustes"
      className={`sync-badge sync-tone-${appearance.tone}`}
      title={appearance.title}
    >
      <Icon name={appearance.icon} size={16} />
      <span>{appearance.label}</span>
    </Link>
  )
}
