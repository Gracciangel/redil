import { Alert, Box, Stack, Typography } from '@mui/material'
import { TenantSessionAlert } from '@/features/congregations/components/TenantSessionAlert'
import { MembersSection } from '@/features/settings/components/MembersSection'
import { MinistriesLinkSection } from '@/features/settings/components/MinistriesLinkSection'
import { ProfileEditHint } from '@/features/settings/components/ProfileEditHint'
import { useAccountSettings } from '@/features/settings/hooks/useAccountSettings'

/**
 * Ajustes según `rulesView.md`: administra miembros y deriva la gestión de
 * ministerios/grupos a su propia vista. La edición de perfil vive en Perfil.
 * Vista pura: los datos y acciones vienen de `useAccountSettings`.
 */
export function SettingsView() {
  const vm = useAccountSettings()

  return (
    <Box>
      <Stack sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Mi cuenta
        </Typography>
        <Typography variant="h4" component="h1">Ajustes</Typography>
        <Typography color="text.secondary">
          {vm.isTenant
            ? `Configuración de ${vm.congregationName ?? 'la congregación'}`
            : 'Configuración de tu cuenta'}
        </Typography>
      </Stack>

      {vm.notice && (
        <Alert severity={vm.notice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
          {vm.notice.text}
        </Alert>
      )}
      {vm.isTenant && <TenantSessionAlert error={vm.tenantError} />}

      <ProfileEditHint />

      {vm.isTenant && (
        <>
          <MinistriesLinkSection />
          <MembersSection vm={vm} />
        </>
      )}
    </Box>
  )
}
