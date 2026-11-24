import { useOnline } from '@/lib/hooks'
import { Icon } from './Icons'

export function OfflineBar() {
  const online = useOnline()
  if (online) return null

  return (
    <div className="offline-bar" role="status">
      <Icon name="wifiOff" size={16} />
      <span>Sin conexión. Puedes seguir trabajando: todo se guarda en tu dispositivo.</span>
    </div>
  )
}
