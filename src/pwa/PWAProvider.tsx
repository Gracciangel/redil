import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export interface PWAContextValue {
  /** El precache terminó: la app ya puede abrirse sin conexión. */
  offlineReady: boolean
  /** Hay una versión nueva esperando activación. */
  needRefresh: boolean
  /** El navegador permite mostrar el diálogo de instalación. */
  canInstall: boolean
  /** La app se abrió como aplicación instalada. */
  installed: boolean
  isStandalone: boolean
  updateServiceWorker: () => Promise<void>
  install: () => Promise<InstallOutcome>
  checkForUpdate: () => void
  dismissUpdate: () => void
  dismissOfflineReady: () => void
}

const PWAContext = createContext<PWAContextValue | null>(null)

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(detectStandalone)
  const [wasInstalled, setWasInstalled] = useState(detectStandalone)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? null
      if (!registration) return
      // Comprueba si hay una versión nueva cada hora mientras la app está abierta.
      window.setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      // Evita el mini-infobar del navegador; la app muestra su propio botón.
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setWasInstalled(true)
      setIsStandalone(true)
      setInstallPrompt(null)
    }
    const media = window.matchMedia('(display-mode: standalone)')
    const handleDisplayMode = () => setIsStandalone(media.matches)

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    media.addEventListener('change', handleDisplayMode)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      media.removeEventListener('change', handleDisplayMode)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!installPrompt) return 'unavailable'
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') setWasInstalled(true)
    return choice.outcome
  }, [installPrompt])

  const updateApp = useCallback(async () => {
    await updateServiceWorker(true)
  }, [updateServiceWorker])

  const checkForUpdate = useCallback(() => {
    void registrationRef.current?.update()
  }, [])

  const dismissUpdate = useCallback(() => setNeedRefresh(false), [setNeedRefresh])
  const dismissOfflineReady = useCallback(() => setOfflineReady(false), [setOfflineReady])

  const installed = isStandalone || wasInstalled

  const value: PWAContextValue = {
    offlineReady,
    needRefresh,
    canInstall: installPrompt !== null && !installed,
    installed,
    isStandalone,
    updateServiceWorker: updateApp,
    install,
    checkForUpdate,
    dismissUpdate,
    dismissOfflineReady,
  }

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>
}

export function usePWA(): PWAContextValue {
  const context = useContext(PWAContext)
  if (!context) throw new Error('usePWA debe usarse dentro de <PWAProvider>')
  return context
}
