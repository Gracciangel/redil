import { MenuItem, TextField } from '@mui/material'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import { MINISTRY_ICON_OPTIONS } from './EntityIcon'

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
}

const OPTION_SX = { minWidth: 48, justifyContent: 'center', px: 1 }

/** Selector de la clave de `ministries.icon`: solo glifos, sin texto visible. */
export function MinistryIconSelect({ value, onChange, label = 'Ícono' }: Props) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ minWidth: 96 }}
    >
      <MenuItem value="" aria-label="Predeterminado" sx={OPTION_SX}>
        <RestartAltOutlinedIcon fontSize="small" />
      </MenuItem>
      {MINISTRY_ICON_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <MenuItem key={option.key} value={option.key} aria-label={option.label} sx={OPTION_SX}>
            <Icon fontSize="small" />
          </MenuItem>
        )
      })}
    </TextField>
  )
}
