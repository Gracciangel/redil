import { Box, Button, Stack, Typography } from '@mui/material'
import { PasswordField } from '@/components/PasswordField'
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
        <PasswordField
          label="Nueva contraseña" value={vm.password}
          onChange={vm.setPassword} autoComplete="new-password"
        />
        <PasswordField
          label="Repetir contraseña" value={vm.confirmPassword}
          onChange={vm.setConfirmPassword} autoComplete="new-password"
        />
        <Button type="submit" variant="contained" disabled={vm.busy === 'password'}>
          {vm.busy === 'password' ? 'Actualizando…' : 'Actualizar contraseña'}
        </Button>
      </Stack>
    </Box>
  )
}
