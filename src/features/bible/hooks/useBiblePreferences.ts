import { useCallback, useState } from 'react'
import { loadPreferences, savePreferences } from '../services/bibleLocal'
import type { BiblePreferences } from '../lib/types'

/** Apariencia del lector: se guarda en localStorage, sin Supabase. */
export function useBiblePreferences() {
  const [preferences, setPreferences] = useState<BiblePreferences>(loadPreferences)

  const updatePreferences = useCallback((patch: Partial<BiblePreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      savePreferences(next)
      return next
    })
  }, [])

  return { preferences, updatePreferences }
}
