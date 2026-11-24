import { useCallback, useEffect, useState } from 'react'
import {
  hasUnsplashKey, searchUnsplash, type UnsplashPhoto, type UnsplashVariant,
} from '../services/unsplash'

const INITIAL_QUERY = 'paisaje'

/** State del picker: dispara búsquedas explícitas, no una por tecla presionada. */
export function useUnsplashPicker(variant: UnsplashVariant = 'banner') {
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasKey = hasUnsplashKey()

  const run = useCallback(async (term: string) => {
    if (!hasKey) return
    setLoading(true)
    setError(null)
    try {
      setPhotos(await searchUnsplash(term, variant))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las imágenes.')
    } finally {
      setLoading(false)
    }
  }, [hasKey, variant])

  useEffect(() => {
    void run(INITIAL_QUERY)
  }, [run])

  return {
    hasKey,
    query,
    setQuery,
    photos,
    loading,
    error,
    search: () => void run(query),
  }
}
