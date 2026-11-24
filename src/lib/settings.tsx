import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './repo'
import type { AppSettings } from './types'

interface SettingsContextValue {
  settings: AppSettings
  loading: boolean
  save: (patch: Partial<AppSettings>) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    loadSettings()
      .then((stored) => {
        if (active) setSettings(stored)
      })
      .catch((error: unknown) => {
        console.error('No se pudieron cargar los ajustes', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await saveSettings(patch)
    setSettings(next)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, save }),
    [settings, loading, save],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings debe usarse dentro de <SettingsProvider>')
  return context
}
