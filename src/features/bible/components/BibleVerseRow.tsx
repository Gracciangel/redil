import { memo, type ReactNode } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { normalizeVerse } from '../services/bibleService'
import type { BiblePreferences } from '../lib/types'

interface Props {
  number: number
  text: string
  preferences: BiblePreferences
  selected: boolean
  favorite: boolean
  onSelect: (verse: number) => void
  onToggleFavorite: (verse: number) => void
}

function highlighted(text: string, word: string): ReactNode {
  const needle = word.trim().toLowerCase()
  if (!needle) return text
  const lower = text.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let found = lower.indexOf(needle, cursor)
  while (found >= 0) {
    if (found > cursor) parts.push(text.slice(cursor, found))
    parts.push(
      <Box component="mark" key={found} sx={{ bgcolor: 'warning.main', color: 'common.black', borderRadius: 0.5, px: 0.25 }}>
        {text.slice(found, found + needle.length)}
      </Box>,
    )
    cursor = found + needle.length
    found = lower.indexOf(needle, cursor)
  }
  parts.push(text.slice(cursor))
  return parts
}

export const BibleVerseRow = memo(function BibleVerseRow({
  number, text, preferences, selected, favorite, onSelect, onToggleFavorite,
}: Props) {
  const value = normalizeVerse(text)
  return (
    <Box
      onClick={() => onSelect(number)}
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1, py: 1.25,
        borderRadius: 1, cursor: 'pointer',
        bgcolor: selected ? 'rgba(124, 58, 237, 0.16)' : 'transparent',
        borderLeft: selected ? '3px solid' : '3px solid transparent',
        borderColor: selected ? 'primary.main' : 'transparent',
      }}
    >
      <Typography component="span" sx={{ fontWeight: 800, minWidth: 22, fontSize: preferences.fontSize }}>
        {number}
      </Typography>
      <Typography
        component="span"
        sx={{ flex: 1, fontSize: preferences.fontSize, lineHeight: 1.6, whiteSpace: 'pre-line', color: 'inherit' }}
      >
        {preferences.highlightEnabled ? highlighted(value, preferences.highlightWord) : value}
      </Typography>
      <Tooltip title={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
        <IconButton
          size="small"
          aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(event) => { event.stopPropagation(); onToggleFavorite(number) }}
          sx={{ color: favorite ? 'warning.main' : 'inherit' }}
        >
          {favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
})
