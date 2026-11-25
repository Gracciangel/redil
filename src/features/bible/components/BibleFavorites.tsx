import { Box, IconButton, List, ListItemButton, Stack, Tooltip, Typography } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ShareIcon from '@mui/icons-material/Share'
import { normalizeVerse } from '../services/bibleService'
import type { BibleFavorite, BibleReference } from '../lib/types'

interface Props {
  favorites: BibleFavorite[]
  onOpen: (favorite: BibleFavorite) => void
  onRemove: (reference: BibleReference) => void
  onShare: (favorite: BibleFavorite) => void
}

function referenceOf(favorite: BibleFavorite): BibleReference {
  return { bookKey: favorite.bookKey, chapter: favorite.chapter, verse: favorite.verse }
}

export function BibleFavorites({ favorites, onOpen, onRemove, onShare }: Props) {
  if (favorites.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Todavía no guardaste versículos. Tocá la estrella junto a un versículo para agregarlo.
      </Typography>
    )
  }

  return (
    <List disablePadding>
      {favorites.map((favorite) => (
        <ListItemButton
          key={`${favorite.bookKey}-${favorite.chapter}-${favorite.verse}`}
          onClick={() => onOpen(favorite)}
          divider
          sx={{ px: 0.5 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
              {favorite.reference}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {normalizeVerse(favorite.text).replace(/\n/g, ' ').slice(0, 120)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Compartir">
              <IconButton
                size="small"
                aria-label="Compartir favorito"
                onClick={(event) => { event.stopPropagation(); onShare(favorite) }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quitar de favoritos">
              <IconButton
                size="small"
                aria-label="Quitar de favoritos"
                onClick={(event) => { event.stopPropagation(); onRemove(referenceOf(favorite)) }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </ListItemButton>
      ))}
      <Box sx={{ height: 8 }} />
    </List>
  )
}
