import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'

/** Ajustes no edita el perfil: lo hace el modal de `ProfileView`. */
export function ProfileEditHint() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <EditOutlinedIcon color="primary" />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Datos personales y contraseña</Typography>
            <Typography variant="body2" color="text.secondary">
              Bio, foto, portada y contraseña se editan desde tu Perfil.
            </Typography>
          </Box>
        </Stack>
        <Button component={RouterLink} to="/perfil" variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }}>
          Ir a Perfil
        </Button>
      </Stack>
    </Paper>
  )
}
