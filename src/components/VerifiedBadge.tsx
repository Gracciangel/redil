import { Tooltip } from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'

interface Props {
  size?: number
  label?: string
}

/** Tilde azul de cuenta verificada, estilo Twitter. */
export function VerifiedBadge({ size = 18, label = 'Congregación verificada' }: Props) {
  return (
    <Tooltip title={label}>
      <VerifiedIcon
        role="img"
        aria-label={label}
        sx={{ color: '#1d9bf0', fontSize: size, flexShrink: 0, verticalAlign: 'middle' }}
      />
    </Tooltip>
  )
}
