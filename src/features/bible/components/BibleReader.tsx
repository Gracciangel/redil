import { Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ShareIcon from '@mui/icons-material/Share'
import { LoadingList } from '@/components/Feedback'
import type { BibleBook, BiblePreferences } from '../lib/types'
import { BibleVerseRow } from './BibleVerseRow'

interface Props {
  book: BibleBook
  chapter: number
  chapterCount: number
  verses: string[]
  preferences: BiblePreferences
  selectedVerse: number | null
  isFavorite: (verse: number) => boolean
  loading: boolean
  error: string | null
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  onSelectVerse: (verse: number | null) => void
  onToggleFavorite: (verse: number) => void
  onShare: () => void
}

export function BibleReader({
  book, chapter, chapterCount, verses, preferences, selectedVerse, isFavorite,
  loading, error, onPrev, onNext, onBack, onSelectVerse, onToggleFavorite, onShare,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: preferences.backgroundColor, color: preferences.textColor }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton onClick={onPrev} disabled={chapter <= 0} aria-label="Capítulo anterior" sx={{ color: 'inherit' }}>
          <ArrowBackIcon />
        </IconButton>
        <Stack sx={{ alignItems: 'center' }}>
          <Button onClick={onBack} size="small" sx={{ color: 'inherit', textTransform: 'none' }}>{book.nombre}</Button>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>Capítulo {chapter + 1}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Compartir versículo seleccionado">
            <span>
              <IconButton onClick={onShare} disabled={!selectedVerse} aria-label="Compartir versículo" sx={{ color: 'inherit' }}>
                <ShareIcon />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onNext} disabled={chapter >= chapterCount - 1} aria-label="Capítulo siguiente" sx={{ color: 'inherit' }}>
            <ArrowForwardIcon />
          </IconButton>
        </Stack>
      </Stack>

      {error && <Typography variant="body2" color="error" sx={{ mb: 1 }}>{error}</Typography>}
      {loading ? (
        <LoadingList rows={4} />
      ) : verses.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>Sin versículos cargados.</Typography>
      ) : (
        verses.map((text, index) => (
          <BibleVerseRow
            key={index}
            number={index + 1}
            text={text}
            preferences={preferences}
            selected={selectedVerse === index + 1}
            favorite={isFavorite(index + 1)}
            onSelect={onSelectVerse}
            onToggleFavorite={onToggleFavorite}
          />
        ))
      )}
      <Button onClick={onBack} size="small" sx={{ mt: 1, color: 'inherit', textTransform: 'none' }}>
        Volver a capítulos
      </Button>
    </Paper>
  )
}
