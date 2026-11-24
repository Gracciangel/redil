import { usePWA } from '@/pwa/PWAProvider'
import { Icon } from './Icons'

export function UpdateToast() {
  const {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
    dismissOfflineReady,
  } = usePWA()

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {needRefresh && (
        <div className="toast" role="status">
          <div className="toast-content">
            <strong>Nueva versión disponible</strong>
            <span>Actualiza para recibir los últimos cambios.</span>
          </div>
          <div className="toast-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void updateServiceWorker()}
            >
              Actualizar
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Descartar aviso"
              onClick={dismissUpdate}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div className="toast" role="status">
          <div className="toast-content">
            <strong>Lista para usar sin conexión</strong>
            <span>Redil ya funciona aunque no tengas internet.</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Cerrar aviso"
            onClick={dismissOfflineReady}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
