import { useState } from 'react'
import { Button, Stack, TextField, Typography } from '@mui/material'

interface Props {
  busy: boolean
  onSubmit: (code: string) => void
}

/** Acceso público: un visitante elige la congregación por su código de invitación. */
export function PublicCongregationPicker({ busy, onSubmit }: Props) {
  const [code, setCode] = useState('')

  return (
    <Stack spacing={1} sx={{ mb: 2, maxWidth: 420 }}>
      <Typography variant="body2" color="text.secondary">
        Estás viendo el cancionero público. Ingresá el código de la congregación para ver su repertorio.
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small" label="Código de congregación" value={code} fullWidth
          onChange={(event) => setCode(event.target.value)}
        />
        <Button variant="contained" disabled={busy || !code.trim()} onClick={() => onSubmit(code.trim())}>
          {busy ? 'Buscando…' : 'Ver'}
        </Button>
      </Stack>
    </Stack>
  )
}
