import { Box, Button, Stack, Typography } from '@mui/material'
import type { BibleBook, Testament } from '../lib/types'

interface Props {
  books: readonly BibleBook[]
  selectedKey: string
  onSelect: (key: string) => void
}

const GROUPS: { id: Testament; label: string }[] = [
  { id: 'AT', label: 'Antiguo Testamento' },
  { id: 'NT', label: 'Nuevo Testamento' },
]

export function BibleBookGrid({ books, selectedKey, onSelect }: Props) {
  return (
    <Stack spacing={2}>
      {GROUPS.map((group) => (
        <Box key={group.id}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
            {group.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1, mt: 1 }}>
            {books.filter((book) => book.testamento === group.id).map((book) => (
              <Button
                key={book.key}
                variant={book.key === selectedKey ? 'contained' : 'outlined'}
                onClick={() => onSelect(book.key)}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
              >
                {book.nombre}
              </Button>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  )
}
