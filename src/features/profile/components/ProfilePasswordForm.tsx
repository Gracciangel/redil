import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { ProfileEditorVM } from '../hooks/useProfileEditor'

interface Props {
  vm: ProfileEditorVM
}

/** Formulario de contraseña del modal de Perfil. */
export function ProfilePasswordForm({ vm }: Props) {
  return (
    <Box component="form" onSubmit={(event) => void vm.handleChangePassword(event)} id="password-form">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Mínimo 6 caracteres. Usá una contraseña que no uses en otros sitios.
        </Typography>
        <TextField
          label="Nueva contraseña" type="password" size="small" value={vm.password}
          onChange={(event) => vm.setPassword(event.target.value)} autoComplete="new-password" fullWidth
        />
        <TextField
          label="Repetir contraseña" type="password" size="small" value={vm.confirmPassword}
          onChange={(event) => vm.setConfirmPassword(event.target.value)} autoComplete="new-password" fullWidth
        />
        <Button type="submit" variant="contained" disabled={vm.busy === 'password'}>
          {vm.busy === 'password' ? 'Actualizando…' : 'Actualizar contraseña'}
        </Button>
      </Stack>
    </Box>
  )
}
