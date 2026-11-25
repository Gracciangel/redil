import { Box, Button, FormControlLabel, Paper, Slider, Stack, Switch, TextField, Typography } from '@mui/material'
import type { BiblePreferences } from '../lib/types'

const TEXT_COLORS = ['#ffffff', '#111827', '#fbbf24', '#fca5a5', '#86efac', '#93c5fd']
const BACKGROUND_COLORS = ['#000000', '#111827', '#1e1b4b', '#0f766e', '#3f3f46', '#ffffff']

interface Props {
  preferences: BiblePreferences
  onChange: (patch: Partial<BiblePreferences>) => void
}

function Swatches({ label, color, options, onPick }: {
  label: string
  color: string
  options: string[]
  onPick: (value: string) => void
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
        {options.map((option) => (
          <Button
            key={option}
            aria-label={`${label} ${option}`}
            onClick={() => onPick(option)}
            sx={{
              minWidth: 36, width: 36, height: 36, p: 0, bgcolor: option,
              border: '3px solid',
              borderColor: color === option ? 'primary.main' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </Stack>
    </Box>
  )
}

export function BibleAppearancePanel({ preferences, onChange }: Props) {
  return (
    <Stack spacing={2}>
      <Swatches label="Color del texto" color={preferences.textColor} options={TEXT_COLORS} onPick={(textColor) => onChange({ textColor })} />
      <Swatches label="Fondo" color={preferences.backgroundColor} options={BACKGROUND_COLORS} onPick={(backgroundColor) => onChange({ backgroundColor })} />

      <Box>
        <Typography variant="caption" color="text.secondary">Tamaño: {preferences.fontSize} px</Typography>
        <Slider
          min={12}
          max={32}
          step={1}
          value={preferences.fontSize}
          valueLabelDisplay="auto"
          onChange={(_event, value) => onChange({ fontSize: Array.isArray(value) ? value[0] : value })}
        />
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={preferences.highlightEnabled}
            onChange={(event) => onChange({ highlightEnabled: event.target.checked })}
          />
        }
        label="Resaltar una palabra"
      />
      <TextField
        fullWidth
        size="small"
        label="Palabra a resaltar"
        value={preferences.highlightWord}
        disabled={!preferences.highlightEnabled}
        onChange={(event) => onChange({ highlightWord: event.target.value })}
      />

      <Paper
        variant="outlined"
        sx={{ p: 2, bgcolor: preferences.backgroundColor, color: preferences.textColor }}
      >
        <Typography sx={{ fontSize: preferences.fontSize }}>Génesis 1:1</Typography>
        <Typography sx={{ fontSize: preferences.fontSize }}>
          En el principio creó Dios los cielos y la tierra.
        </Typography>
      </Paper>
    </Stack>
  )
}
