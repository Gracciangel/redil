import type { ReactNode } from 'react'
import { Button, ButtonGroup } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import SearchIcon from '@mui/icons-material/Search'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SettingsIcon from '@mui/icons-material/Settings'
import type { BibleMode } from '../lib/types'

const MODES = [
  { id: 'navegar', label: 'Leer', icon: <MenuBookIcon /> },
  { id: 'buscar', label: 'Buscar', icon: <SearchIcon /> },
  { id: 'favoritos', label: 'Favoritos', icon: <StarBorderIcon /> },
  { id: 'config', label: 'Apariencia', icon: <SettingsIcon /> },
] as const satisfies readonly { id: BibleMode; label: string; icon: ReactNode }[]

interface Props {
  mode: BibleMode
  favoritesCount: number
  onChange: (mode: BibleMode) => void
}

export function BibleModeSelector({ mode, favoritesCount, onChange }: Props) {
  return (
    <ButtonGroup fullWidth variant="outlined" size="small" aria-label="Modos de la Biblia">
      {MODES.map((item) => (
        <Button
          key={item.id}
          startIcon={item.icon}
          variant={mode === item.id ? 'contained' : 'outlined'}
          onClick={() => onChange(item.id)}
          sx={{ textTransform: 'none', px: 1 }}
        >
          {item.label}
          {item.id === 'favoritos' && favoritesCount > 0 ? ` (${favoritesCount})` : ''}
        </Button>
      ))}
    </ButtonGroup>
  )
}
