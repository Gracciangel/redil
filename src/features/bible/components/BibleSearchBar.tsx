import { useState, type FormEvent } from 'react'
import { Button, Stack, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

interface Props {
  error: string | null
  onSearch: (reference: string) => void
}

export function BibleSearchBar({ error, onSearch }: Props) {
  const [query, setQuery] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (query.trim()) onSearch(query)
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Escribí una referencia, por ejemplo «Juan 3:16» o «1 Corintios 13:4».
      </Typography>
      <Stack component="form" direction="row" spacing={1} onSubmit={handleSubmit}>
        <TextField
          fullWidth
          size="small"
          label="Referencia"
          placeholder="Juan 3:16"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          error={Boolean(error)}
          helperText={error ?? ''}
        />
        <Button type="submit" variant="contained" startIcon={<SearchIcon />} sx={{ textTransform: 'none', px: 2 }}>
          Ir
        </Button>
      </Stack>
    </Stack>
  )
}
