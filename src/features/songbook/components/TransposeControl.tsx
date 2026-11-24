import { Button, Stack, Typography } from '@mui/material'
import type { Notation } from '../types'

interface Props {
  semitones: number
  notation: Notation
  canEdit: boolean
  busy: boolean
  onTranspose: (semitones: number) => void
  onNotation: (notation: Notation) => void
}

/** Tono global del ministerio y notación elegida por cada persona. */
export function TransposeControl({
  semitones, notation, canEdit, busy, onTranspose, onNotation,
}: Props) {
  const display = semitones > 0 ? `+${semitones}` : String(semitones)

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">Tono del ministerio</Typography>
        <Button size="small" disabled={!canEdit || busy || semitones <= -12} onClick={() => onTranspose(semitones - 1)}>−</Button>
        <Typography sx={{ minWidth: 34, textAlign: 'center', fontWeight: 700 }}>{display}</Typography>
        <Button size="small" disabled={!canEdit || busy || semitones >= 12} onClick={() => onTranspose(semitones + 1)}>+</Button>
        <Button size="small" disabled={!canEdit || busy || semitones === 0} onClick={() => onTranspose(0)}>Original</Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant={notation === 'american' ? 'contained' : 'outlined'} onClick={() => onNotation('american')}>Americano</Button>
        <Button size="small" variant={notation === 'european' ? 'contained' : 'outlined'} onClick={() => onNotation('european')}>Europeo</Button>
      </Stack>
    </Stack>
  )
}
