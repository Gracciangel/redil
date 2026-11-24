import { Box, Button, Stack, TextField } from '@mui/material'
import type { ProfileEditorVM, ProfileFocus } from '../hooks/useProfileEditor'
import { UnsplashImagePicker } from './UnsplashImagePicker'

interface Props {
  vm: ProfileEditorVM
}

type Section = Exclude<ProfileFocus, 'password'>

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'photo', label: 'Foto' },
  { key: 'banner', label: 'Portada' },
  { key: 'profile', label: 'Bio' },
]

/** Editación separada de foto, portada y bio dentro de un mismo formulario. */
export function ProfileDetailsForm({ vm }: Props) {
  const section: Section = vm.focus === 'password' ? 'profile' : vm.focus

  return (
    <Box component="form" onSubmit={(event) => void vm.handleSaveProfile(event)} id="profile-form">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1}>
          {SECTIONS.map((item) => (
            <Button
              key={item.key}
              size="small"
              variant={section === item.key ? 'contained' : 'outlined'}
              onClick={() => vm.setFocus(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        {section === 'photo' && (
          <UnsplashImagePicker
            variant="photo"
            value={vm.photoUrl || null}
            onSelect={(url) => vm.setPhotoUrl(url ?? '')}
            autoFocus={vm.focus === 'photo'}
          />
        )}
        {section === 'banner' && (
          <UnsplashImagePicker
            variant="banner"
            value={vm.bannerUrl || null}
            onSelect={(url) => vm.setBannerUrl(url ?? '')}
            autoFocus={vm.focus === 'banner'}
          />
        )}
        {section === 'profile' && (
          <TextField
            label="Biografía" value={vm.bio}
            onChange={(event) => vm.setBio(event.target.value)}
            placeholder="Contá un poco sobre vos…" multiline minRows={3} fullWidth
          />
        )}

        <Button type="submit" variant="contained" disabled={vm.busy === 'profile'}>
          {vm.busy === 'profile' ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Stack>
    </Box>
  )
}
