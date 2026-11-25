import { useCallback } from 'react'
import { shareVerse } from '../lib/share'
import { useBibleFavorites } from './useBibleFavorites'
import { useVerseOfDay } from './useVerseOfDay'

/** Viewmodel de la tarjeta del Home: reusa favoritos y compartir del lector. */
export function useVerseOfDayCard() {
  const { data, loading, error } = useVerseOfDay()
  const { isFavorite, addFavorite } = useBibleFavorites()

  const reference = data
    ? { bookKey: data.bookKey, chapter: data.chapter, verse: data.verse }
    : null
  const favorite = reference ? isFavorite(reference) : false

  const onToggleFavorite = useCallback(() => {
    if (data) addFavorite(data)
  }, [data, addFavorite])

  const onShare = useCallback(() => {
    if (data) void shareVerse(data.reference, data.text).catch(() => undefined)
  }, [data])

  return { verse: data, loading, error, favorite, onToggleFavorite, onShare }
}
