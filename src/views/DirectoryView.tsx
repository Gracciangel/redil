import { Alert, Avatar, Box, Button, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { LoadingList } from '@/components/Feedback'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { RoleBadge } from '@/features/congregations/components/RoleBadge'
import { ProfileCongregationLine } from '@/features/profile/components/ProfileCongregationLine'
import { useDirectoryView } from '@/features/social/hooks/useDirectoryView'
import type { SocialProfile } from '@/features/social/services/socialProfiles'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface CardProps {
  profile: SocialProfile
  congregationName: string | null
}

function ProfileCard({ profile, congregationName }: CardProps) {
  const fullName = `${profile.name} ${profile.surname}`.trim() || 'Miembro'

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar src={profile.photoUrl ?? undefined} alt={fullName} sx={{ bgcolor: 'primary.main' }}>
          {initials(fullName)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{fullName}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <RoleBadge role={profile.role} />
            {profile.ledCount > 0 && (
              <Chip size="small" color="primary" label={`Líder de ${profile.ledCount}`} />
            )}
          </Stack>
        </Box>
      </Stack>

      <ProfileCongregationLine name={congregationName} visiting sx={{ mt: 1 }} />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {profile.bio || 'Todavía no agregó una biografía.'}
      </Typography>

      {(profile.ministries.length > 0 || profile.groups.length > 0) && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 1.5 }}>
          {profile.ministries.map((name) => (
            <Chip key={`m-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="ministries" />} label={name} />
          ))}
          {profile.groups.map((name) => (
            <Chip key={`g-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="groups" />} label={name} />
          ))}
        </Stack>
      )}
    </Paper>
  )
}

/**
 * Directorio de perfiles. Vista pura: el tenant y el miembro exploran perfiles
 * de su congregación y, si ambas están verificadas, de otros tenants.
 */
export function DirectoryView() {
  const vm = useDirectoryView()

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Red de Redil
        </Typography>
        <Typography variant="h4" component="h1">Perfiles</Typography>
        <Typography color="text.secondary">
          Conocé a las personas de tu congregación y, si está habilitado, de otras congregaciones.
        </Typography>
      </Stack>

      {vm.contextLoading ? (
        <LoadingList rows={2} />
      ) : vm.contextError ? (
        <Alert severity="error" sx={{ mb: 2 }}>{vm.contextError.message}</Alert>
      ) : !vm.verified ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tu congregación todavía no está verificada. Podés ver los perfiles de tu congregación;
          la exploración de otras congregaciones se habilita cuando la verificación esté aprobada.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant={vm.tab === 'own' ? 'contained' : 'outlined'} onClick={() => vm.setTab('own')}>
          Mi congregación
        </Button>
        <Button
          variant={vm.tab === 'external' ? 'contained' : 'outlined'}
          onClick={() => vm.setTab('external')}
          disabled={!vm.verified}
        >
          Otras congregaciones
        </Button>
      </Stack>

      {vm.tab === 'own' ? (
        <>
          {vm.ownError && <Alert severity="error" sx={{ mb: 2 }}>{vm.ownError.message}</Alert>}
          {vm.ownLoading && vm.ownProfiles.length === 0 ? (
            <LoadingList rows={3} />
          ) : vm.ownProfiles.length === 0 ? (
            <Alert severity="info">Todavía no hay perfiles para mostrar.</Alert>
          ) : (
            <Grid container spacing={2}>
              {vm.ownProfiles.map((profile) => (
                <Grid key={profile.userId} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ProfileCard profile={profile} congregationName={vm.ownCongregationName} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : (
        <>
          {vm.congregationsError && (
            <Alert severity="error" sx={{ mb: 2 }}>{vm.congregationsError.message}</Alert>
          )}
          <TextField
            select
            size="small"
            label="Congregación"
            value={vm.selectedId}
            onChange={(e) => vm.setSelectedId(e.target.value)}
            sx={{ minWidth: 260, mb: 2 }}
          >
            <MenuItem value="">Elegí una congregación</MenuItem>
            {vm.congregations.map((congregation) => (
              <MenuItem key={congregation.id} value={congregation.id}>{congregation.name}</MenuItem>
            ))}
          </TextField>

          {vm.selectedCongregation && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                {vm.selectedCongregation.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {vm.selectedCongregation.bio || 'Esta congregación todavía no agregó una biografía.'}
              </Typography>

              {vm.announcementsError && (
                <Alert severity="error" sx={{ mt: 2 }}>{vm.announcementsError.message}</Alert>
              )}
              {vm.announcements.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <EntityIcon kind="announcements" color="primary" fontSize="small" />
                    <Typography variant="subtitle2">Anuncios compartidos</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {vm.announcements.map((announcement) => (
                      <Paper key={announcement.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography sx={{ fontWeight: 600 }}>{announcement.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{announcement.body}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          )}

          {vm.externalError && <Alert severity="error" sx={{ mb: 2 }}>{vm.externalError.message}</Alert>}
          {!vm.selectedId ? (
            <Alert severity="info">Elegí una congregación para ver sus miembros.</Alert>
          ) : vm.externalLoading && vm.externalProfiles.length === 0 ? (
            <LoadingList rows={3} />
          ) : vm.externalProfiles.length === 0 ? (
            <Alert severity="info">Esta congregación todavía no tiene perfiles visibles.</Alert>
          ) : (
            <Grid container spacing={2}>
              {vm.externalProfiles.map((profile) => (
                <Grid key={profile.userId} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ProfileCard
                    profile={profile}
                    congregationName={vm.selectedCongregation?.name ?? null}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {!vm.verified && vm.tab === 'external' && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
          <EntityIcon kind="groups" color="disabled" fontSize="small" />
          <Typography variant="caption" color="text.secondary">
            La verificación de la congregación habilita esta sección.
          </Typography>
        </Stack>
      )}
    </Box>
  )
}
