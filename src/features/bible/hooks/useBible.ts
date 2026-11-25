import { useCallback, useEffect, useState } from 'react'
import type { BibleIndex, BibleMode, BibleReference, BibleStep } from '../lib/types'
import { loadBibleIndex, loadBook, parseReference } from '../services/bibleService'
import { useBibleFavorites } from './useBibleFavorites'
import { useBiblePreferences } from './useBiblePreferences'

const EMPTY_INDEX: BibleIndex = {}
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error)

/** Viewmodel del lector: la vista solo presenta lo que acá se expone. */
export function useBible() {
  const [mode, setMode] = useState<BibleMode>('navegar')
  const [step, setStep] = useState<BibleStep>('libros')
  const [index, setIndex] = useState<BibleIndex>(EMPTY_INDEX)
  const [bookKey, setBookKey] = useState('juan')
  const [chapter, setChapter] = useState(0)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [verses, setVerses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const favorites = useBibleFavorites()
  const preferences = useBiblePreferences()

  useEffect(() => {
    let alive = true
    loadBibleIndex()
      .then((data) => { if (alive) setIndex(data) })
      .catch((reason: unknown) => { if (alive) setError(messageOf(reason)) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loadBook(bookKey)
      .then((data) => {
        if (alive) { setVerses(data[chapter] ?? []); setLoading(false) }
      })
      .catch((reason: unknown) => {
        if (alive) { setError(messageOf(reason)); setLoading(false) }
      })
    return () => { alive = false }
  }, [bookKey, chapter])

  const selectBook = useCallback((key: string) => {
    setBookKey(key); setChapter(0); setSelectedVerse(null); setStep('capitulos'); setMode('navegar')
  }, [])
  const selectChapter = useCallback((next: number) => {
    setChapter(Math.max(0, next)); setSelectedVerse(null); setStep('lectura'); setMode('navegar')
  }, [])
  const openReference = useCallback((input: string) => {
    const reference: BibleReference | null = parseReference(input)
    if (!reference) { setError('No encontré esa referencia. Probá «Juan 3:16».'); return false }
    setBookKey(reference.bookKey); setChapter(reference.chapter); setSelectedVerse(reference.verse)
    setStep('lectura'); setMode('navegar'); setError(null)
    return true
  }, [])
  const changeChapter = useCallback((delta: number) => {
    const next = chapter + delta
    if (next >= 0 && next < (index[bookKey]?.length ?? 0)) selectChapter(next)
  }, [bookKey, chapter, index, selectChapter])
  const backToBooks = useCallback(() => setStep('libros'), [])
  const backToChapters = useCallback(() => setStep('capitulos'), [])
  const selectVerse = useCallback((number: number | null) => setSelectedVerse(number), [])

  return {
    mode, setMode, step, bookKey, chapter,
    chapterCount: index[bookKey]?.length ?? 0,
    verseCount: index[bookKey]?.[chapter] ?? verses.length,
    verses, selectedVerse, selectedText: selectedVerse ? verses[selectedVerse - 1] ?? '' : '',
    loading, error, index,
    ...favorites, ...preferences,
    selectBook, selectChapter, changeChapter, backToBooks, backToChapters,
    selectVerse, openReference,
  }
}
