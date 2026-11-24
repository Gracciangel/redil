import { Typography, type SxProps, type Theme } from '@mui/material'

interface Props {
  name: string | null
  /** true cuando otra persona está mirando este perfil. */
  visiting?: boolean
  sx?: SxProps<Theme>
}

/**
 * Línea de congregación del perfil. En el propio alcanza con el nombre;
 * cuando alguien visita el perfil se aclara con «Pertenece a».
 */
export function ProfileCongregationLine({ name, visiting = false, sx }: Props) {
  if (!name) return null

  return (
    <Typography variant="body2" color="text.secondary" sx={sx}>
      {visiting ? `Pertenece a ${name}` : name}
    </Typography>
  )
}
