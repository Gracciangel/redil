import { Box, Button, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface Props {
  bookName: string
  count: number
  onSelect: (chapter: number) => void
  onBack: () => void
}

export function BibleChapterGrid({ bookName, count, onSelect, onBack }: Props) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} size="small">
          Libros
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{bookName}</Typography>
      </Stack>

      {count === 0 ? (
        <Typography variant="body2" color="text.secondary">Cargando capítulos…</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 1 }}>
          {Array.from({ length: count }, (_, index) => (
            <Button
              key={index}
              variant="outlined"
              onClick={() => onSelect(index)}
              sx={{ minWidth: 0, fontWeight: 700 }}
            >
              {index + 1}
            </Button>
          ))}
        </Box>
      )}
    </Stack>
  )
}
