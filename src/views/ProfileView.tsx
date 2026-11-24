import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import PublicIcon from '@mui/icons-material/Public'
import { LoadingList } from '@/components/Feedback'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { LeaveRedilCard } from '@/features/congregations/components/LeaveRedilCard'
import { TenantSessionAlert } from '@/features/congregations/components/TenantSessionAlert'
import { ProfileCongregationLine } from '@/features/profile/components/ProfileCongregationLine'
import { ProfileEditDialog } from '@/features/profile/components/ProfileEditDialog'
import { useProfileEditor } from '@/features/profile/hooks/useProfileEditor'
import { useProfileView } from '@/features/profile/hooks/useProfileView'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Perfil unificado: identidad, biografía, ministerios y grupos en una sola
 * tarjeta. La congregación además administra sus grupos acá y ve un bloque
 * aparte con sus miembros. La edición se hace desde el modal de `useProfileEditor`.
 */
export function ProfileView() {
  const vm = useProfileView()
  const editor = useProfileEditor()

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
              Mi cuenta
            </Typography>
            <Typography variant="h4" component="h1">Perfil</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button component={RouterLink} to="/directorio" variant="outlined" size="small" startIcon={<PublicIcon />}>
              Explorar perfiles
            </Button>
            <Tooltip title="Editar perfil">
              <IconButton onClick={() => editor.openDialog('profile')} aria-label="Editar perfil" color="primary">
                <EditOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'relative',
            height: { xs: 96, sm: 132 },
            backgroundImage: editor.displayBannerUrl
              ? `url("${editor.displayBannerUrl}")`
              : 'linear-gradient(120deg, #1565c0, #42a5f5)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Tooltip title="Cambiar portada">
            <IconButton
              onClick={() => editor.openDialog('banner')}
              aria-label="Cambiar portada"
              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0, 0, 0, 0.45)', color: '#fff', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.65)' } }}
            >
              <PhotoCameraOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2, mt: -5, alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
          <Box sx={{ position: 'relative', flex: '0 0 auto' }}>
            <Avatar
              src={editor.displayPhotoUrl ?? undefined}
              alt={vm.name}
              sx={{ width: 88, height: 88, bgcolor: 'primary.main', fontSize: '1.75rem', border: '3px solid', borderColor: 'background.paper' }}
            >
              {initials(vm.name)}
            </Avatar>
            <Tooltip title="Cambiar foto">
              <IconButton
                onClick={() => editor.openDialog('photo')}
                aria-label="Cambiar foto"
                size="small"
                sx={{ position: 'absolute', bottom: 2, right: -2, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                <PhotoCameraOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ minWidth: 0, pb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {vm.name}
              {vm.verified && <VerifiedBadge size={20} />}
            </Typography>
            {vm.email && <Typography color="text.secondary">{vm.email}</Typography>}
            {vm.isTenant ? (
              <Typography variant="caption" color="text.secondary">Congregación</Typography>
            ) : (
              <ProfileCongregationLine name={vm.congregationName} />
            )}
          </Box>
        </Stack>

        <Divider />

        <Grid container spacing={2} sx={{ p: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>Biografía</Typography>
            <Typography variant="body2" color="text.secondary">
              {editor.displayBio || 'Todavía no agregaste una biografía. Usá el botón de editar para contar algo sobre vos.'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <EntityIcon kind="ministries" color="primary" fontSize="small" />
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>Ministerios y grupos</Typography>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
              {vm.isLeader && <Chip size="small" color="primary" label={`Líder de ${vm.ledCount}`} />}
            </Stack>

            {vm.ministries.length === 0 && vm.groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Todavía no hay ministerios ni grupos asignados.
              </Typography>
            ) : (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                {vm.ministries.map((name) => (
                  <Chip key={`m-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="ministries" />} label={name} />
                ))}
                {vm.groups.map((name) => (
                  <Chip key={`g-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="groups" />} label={name} />
                ))}
              </Stack>
            )}

            {vm.isLeader && (
              <Button component={RouterLink} to="/ministerios" variant="outlined" size="small" sx={{ mt: 1.5 }}>
                Gestionar mis ministerios
              </Button>
            )}

            {vm.isTenant && (
              <>
                <Divider sx={{ my: 2 }} />

                {vm.createNotice && (
                  <Alert severity={vm.createNotice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
                    {vm.createNotice.text}
                  </Alert>
                )}
                <TenantSessionAlert error={vm.tenantMinistriesError} />
                {vm.tenantMinistriesError && (
                  <Alert severity="error" sx={{ mb: 2 }}>{vm.tenantMinistriesError.message}</Alert>
                )}

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Administrar ministerios y grupos de la congregación
                </Typography>
                <Box component="form" onSubmit={(event) => void vm.handleCreateMinistry(event)}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      size="small"
                      label="Nombre"
                      value={vm.newMinistryName}
                      onChange={(e) => vm.setNewMinistryName(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      select
                      size="small"
                      label="Tipo"
                      value={vm.newMinistryIsGroup ? 'group' : 'ministry'}
                      onChange={(e) => vm.setNewMinistryIsGroup(e.target.value === 'group')}
                      sx={{ minWidth: 150 }}
                    >
                      <MenuItem value="ministry">Ministerio</MenuItem>
                      <MenuItem value="group">Grupo</MenuItem>
                    </TextField>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<AddIcon />}
                      disabled={vm.createBusy || !vm.newMinistryName.trim()}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      Crear
                    </Button>
                  </Stack>
                </Box>

                {vm.tenantMinistriesLoading && vm.tenantMinistries.length === 0 ? (
                  <LoadingList rows={2} />
                ) : vm.tenantMinistries.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 2 }}>
                    {vm.tenantMinistries.map((ministry) => (
                      <Chip
                        key={ministry.id}
                        size="small"
                        icon={<EntityIcon kind={ministry.isGroup ? 'groups' : 'ministries'} iconKey={ministry.icon} />}
                        label={`${ministry.name}${ministry.isGroup ? ' (grupo)' : ''}`}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Todavía no hay ministerios ni grupos en esta congregación.
                  </Typography>
                )}

                <Button component={RouterLink} to="/ministerios" variant="outlined" size="small" sx={{ mt: 2 }}>
                  Administrar en Ministerios
                </Button>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      {vm.isTenant && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <EntityIcon kind="members" color="primary" fontSize="small" />
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>Miembros de la congregación</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Las personas se vinculan al canjear tu código de invitación.
          </Typography>
          <Button component={RouterLink} to="/miembros" variant="outlined" size="small" sx={{ mt: 1.5 }}>
            Ver miembros
          </Button>
        </Paper>
      )}

      {vm.isTenant && <LeaveRedilCard />}

      <ProfileEditDialog vm={editor} />
    </Box>
  )
}
