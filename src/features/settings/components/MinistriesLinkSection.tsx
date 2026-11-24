import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'

/** Atajo a la vista donde se gestionan ministerios y grupos. */
export function MinistriesLinkSection() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <EntityIcon kind="ministries" color="primary" />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Ministerios y grupos</Typography>
            <Typography variant="body2" color="text.secondary">
              Crealos, asigná líderes, sumá integrantes y cambiá el ícono desde su vista.
            </Typography>
          </Box>
        </Stack>
        <Button component={RouterLink} to="/ministerios" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }}>
          Ir a Ministerios
        </Button>
      </Stack>
    </Paper>
  )
}
