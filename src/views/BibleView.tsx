import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Box, Typography } from '@mui/material'
import { BibleAppearancePanel } from '@/features/bible/components/BibleAppearancePanel'
import { BibleBookGrid } from '@/features/bible/components/BibleBookGrid'
import { BibleChapterGrid } from '@/features/bible/components/BibleChapterGrid'
import { BibleFavorites } from '@/features/bible/components/BibleFavorites'
import { BibleModeSelector } from '@/features/bible/components/BibleModeSelector'
import { BibleReader } from '@/features/bible/components/BibleReader'
import { BibleSearchBar } from '@/features/bible/components/BibleSearchBar'
import { useBible } from '@/features/bible/hooks/useBible'
import { LIBROS } from '@/features/bible/lib/books'
import { getBook, referenceOf } from '@/features/bible/lib/bookUtils'
import { shareVerse } from '@/features/bible/lib/share'
import type { BibleFavorite } from '@/features/bible/lib/types'

/** Vista pura: compone el viewmodel del lector y delega acciones en él. */
export function BibleView() {
  const vm = useBible()
  const [params] = useSearchParams()
  const deepLink = params.get('ref')

  useEffect(() => {
    if (deepLink) vm.openReference(deepLink)
  }, [deepLink, vm.openReference])

  const book = getBook(vm.bookKey) ?? LIBROS[0]
  const share = useCallback((reference: string, text: string) => {
    void shareVerse(reference, text).catch(() => undefined)
  }, [])
  const toggleVerseFavorite = useCallback((number: number) => {
    const text = vm.verses[number - 1]
    if (!text) return
    vm.addFavorite({
      bookKey: vm.bookKey, chapter: vm.chapter, verse: number,
      text, reference: referenceOf(book, vm.chapter, number),
    })
  }, [book, vm.bookKey, vm.chapter, vm.verses, vm.addFavorite])
  const openFavorite = useCallback(
    (favorite: BibleFavorite) => { vm.openReference(favorite.reference) },
    [vm.openReference],
  )
  const selectedReference = vm.selectedVerse
    ? referenceOf(book, vm.chapter, vm.selectedVerse)
    : ''

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>Espiritual</Typography>
        <Typography variant="h4" component="h1">Biblia</Typography>
      </Box>

      <BibleModeSelector mode={vm.mode} favoritesCount={vm.favorites.length} onChange={vm.setMode} />

      <Box sx={{ mt: 2 }}>
        {vm.error && !(vm.mode === 'navegar' && vm.step === 'lectura') && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}

        {vm.mode === 'navegar' && (
          vm.step === 'libros' ? (
            <BibleBookGrid books={LIBROS} selectedKey={vm.bookKey} onSelect={vm.selectBook} />
          ) : vm.step === 'capitulos' ? (
            <BibleChapterGrid bookName={book.nombre} count={vm.chapterCount} onSelect={vm.selectChapter} onBack={vm.backToBooks} />
          ) : (
            <BibleReader
              book={book}
              chapter={vm.chapter}
              chapterCount={vm.chapterCount}
              verses={vm.verses}
              preferences={vm.preferences}
              selectedVerse={vm.selectedVerse}
              isFavorite={(number) => vm.isFavorite({ bookKey: vm.bookKey, chapter: vm.chapter, verse: number })}
              loading={vm.loading}
              error={vm.error}
              onPrev={() => vm.changeChapter(-1)}
              onNext={() => vm.changeChapter(1)}
              onBack={vm.backToChapters}
              onSelectVerse={vm.selectVerse}
              onToggleFavorite={toggleVerseFavorite}
              onShare={() => share(selectedReference, vm.selectedText)}
            />
          )
        )}
        {vm.mode === 'buscar' && <BibleSearchBar error={vm.error} onSearch={vm.openReference} />}
        {vm.mode === 'favoritos' && (
          <BibleFavorites
            favorites={vm.favorites}
            onOpen={openFavorite}
            onRemove={vm.deleteFavorite}
            onShare={(favorite) => share(favorite.reference, favorite.text)}
          />
        )}
        {vm.mode === 'config' && (
          <BibleAppearancePanel preferences={vm.preferences} onChange={vm.updatePreferences} />
        )}
      </Box>
    </Box>
  )
}
