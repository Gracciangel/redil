import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Tab, Tabs, Typography } from '@mui/material'
import type { ProfileEditorVM, ProfileFocus } from '../hooks/useProfileEditor'
import { ProfileDetailsForm } from './ProfileDetailsForm'
import { ProfilePasswordForm } from './ProfilePasswordForm'

interface Props {
  vm: ProfileEditorVM
}

/**
 * Modal de edición del Perfil (congregación o miembro).
 * La lógica de guardado vive en `useProfileEditor`: acá solo se presenta.
 */
export function ProfileEditDialog({ vm }: Props) {
  const tab = vm.focus === 'password' ? 'password' : 'profile'

  return (
    <Dialog
      open={vm.open}
      onClose={vm.closeDialog}
      fullWidth
      maxWidth="sm"
      aria-labelledby="profile-edit-title"
    >
      <DialogTitle id="profile-edit-title">
        Editar {vm.isTenant ? 'perfil de la congregación' : 'mi perfil'}
      </DialogTitle>

      <DialogContent dividers>
        {vm.notice && (
          <Alert severity={vm.notice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
            {vm.notice.text}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, value) => vm.setFocus(value as ProfileFocus)} sx={{ mb: 2 }}>
          <Tab value="profile" label="Perfil" />
          <Tab value="password" label="Contraseña" />
        </Tabs>

        {tab === 'profile' ? <ProfileDetailsForm vm={vm} /> : <ProfilePasswordForm vm={vm} />}

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Los cambios se guardan en tu perfil de Redil y se reflejan en el directorio.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={vm.closeDialog} disabled={vm.busy !== null}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
