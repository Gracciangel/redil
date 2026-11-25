import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Card, CardContent, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import ShareIcon from '@mui/icons-material/Share'
import type { BibleVerse } from '../lib/types'

interface Props {
  verse?: BibleVerse
  loading: boolean
  error: Error | null
  favorite: boolean
  onToggleFavorite: () => void
  onShare: () => void
}

export function VerseOfDayCard({ verse, loading, error, favorite, onToggleFavorite, onShare }: Props) {
  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, bgcolor: 'rgba(124, 58, 237, 0.07)', borderColor: 'rgba(124, 58, 237, 0.35)' }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
              Versículo del día
            </Typography>
            {verse && (
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{verse.reference}</Typography>
            )}
          </Box>
          {verse && (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                <IconButton size="small" onClick={onToggleFavorite} aria-label="Favorito" sx={{ color: favorite ? 'warning.main' : 'inherit' }}>
                  {favorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Compartir versículo">
                <IconButton size="small" onClick={onShare} aria-label="Compartir versículo" sx={{ color: 'inherit' }}>
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {loading ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Skeleton variant="text" width="55%" />
            <Skeleton variant="text" width="90%" />
          </Stack>
        ) : error ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No se pudo cargar el versículo del día.
          </Typography>
        ) : verse ? (
          <Typography sx={{ mt: 1, whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {verse.text}
          </Typography>
        ) : null}

        {verse && (
          <Button
            component={RouterLink}
            to={`/biblia?ref=${encodeURIComponent(verse.reference)}`}
            size="small"
            sx={{ mt: 1.5, textTransform: 'none' }}
          >
            Leer en la Biblia
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
