import { useState } from 'react'
import { usePWA } from '@/pwa/PWAProvider'
import { Icon } from './Icons'

export function InstallCard() {
  const { canInstall, install, isStandalone } = usePWA()
  const [message, setMessage] = useState<string | null>(null)

  if (isStandalone) return null

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <section className="install-card" aria-labelledby="install-title">
      <span className="install-icon">
        <Icon name="install" size={24} />
      </span>
      <div className="install-copy">
        <h2 id="install-title">Lleva Redil contigo</h2>
        {isIOS ? (
          <p>
            En Safari, toca <strong>Compartir</strong> y elige{' '}
            <strong>Añadir a pantalla de inicio</strong>.
          </p>
        ) : canInstall ? (
          <p>
            Instálala como aplicación: se abre a pantalla completa y funciona sin conexión.
          </p>
        ) : (
          <p>
            También puedes instalarla desde el menú del navegador:{' '}
            <strong>Instalar aplicación</strong>.
          </p>
        )}
        {message && <p className="install-message">{message}</p>}
      </div>
      {canInstall && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void install().then((outcome) => {
              if (outcome === 'accepted') {
                setMessage('¡Instalando! Busca Redil en tu pantalla de inicio.')
              }
            })
          }}
        >
          <Icon name="install" size={18} />
          Instalar
        </button>
      )}
    </section>
  )
}
