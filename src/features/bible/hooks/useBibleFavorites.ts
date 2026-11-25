import { useCallback, useState } from 'react'
import { hasFavorite, listFavorites, removeFavorite, toggleFavorite } from '../services/bibleLocal'
import type { BibleFavorite, BibleReference, BibleVerse } from '../lib/types'

/** Favoritos por dispositivo: viven en localStorage y no viajan al servidor. */
export function useBibleFavorites() {
  const [favorites, setFavorites] = useState<BibleFavorite[]>(listFavorites)

  const addFavorite = useCallback((verse: BibleVerse) => {
    setFavorites((current) => toggleFavorite(verse, current))
  }, [])

  const deleteFavorite = useCallback((reference: BibleReference) => {
    setFavorites((current) => removeFavorite(reference, current))
  }, [])

  const isFavorite = useCallback(
    (reference: BibleReference) => hasFavorite(reference, favorites),
    [favorites],
  )

  return { favorites, addFavorite, deleteFavorite, isFavorite }
}
