import type { FormEvent } from 'react'
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

interface Props {
  name: string
  isGroup: boolean
  busy: string | null
  onName: (value: string) => void
  onIsGroup: (value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

/** Alta de ministerios y grupos: solo la congregación la presenta. */
export function MinistryCreateForm({ name, isGroup, busy, onName, onIsGroup, onSubmit }: Props) {
  return (
    <Stack spacing={1} component="form" onSubmit={onSubmit} sx={{ mb: 2 }}>
      <Typography variant="subtitle2">Crear ministerio o grupo</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small"
          label="Nombre"
          value={name}
          onChange={(event) => onName(event.target.value)}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Tipo"
          value={isGroup ? 'group' : 'ministry'}
          onChange={(event) => onIsGroup(event.target.value === 'group')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ministry">Ministerio</MenuItem>
          <MenuItem value="group">Grupo</MenuItem>
        </TextField>
        <Button
          type="submit"
          variant="contained"
          startIcon={<AddIcon />}
          disabled={busy === 'create' || !name.trim()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Crear
        </Button>
      </Stack>
    </Stack>
  )
}
