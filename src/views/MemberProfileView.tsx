import { Link as RouterLink, useParams } from 'react-router-dom'
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import { EmptyState, ErrorState, LoadingList } from '@/components/Feedback'
import { DeleteMemberButton } from '@/features/congregations/components/DeleteMemberButton'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { RoleBadge } from '@/features/congregations/components/RoleBadge'
import { useMemberProfileView } from '@/features/social/hooks/useMemberProfileView'

/** Perfil de otro miembro de la congregación. Vista pura: solo presenta el VM. */
export function MemberProfileView() {
  const { userId } = useParams()
  const vm = useMemberProfileView(userId)
  const back = vm.isTenant ? '/miembros' : '/directorio'

  if (vm.loading) return <LoadingList rows={3} />
  if (vm.error) return <ErrorState message={vm.error.message} />
  if (vm.notFound || !vm.profile) {
    return (
      <EmptyState
        icon="users"
        title="Perfil no disponible"
        description="Ese miembro no pertenece a tu congregación o su perfil no está visible."
        action={<Button component={RouterLink} to={back}>Volver</Button>}
      />
    )
  }

  const { profile } = vm
  const fullName = `${profile.name} ${profile.surname}`.trim() || 'Miembro'

  return (
    <Box>
      <Button component={RouterLink} to={back} startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 2 }}>
        Volver
      </Button>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: { xs: 72, sm: 104 }, bgcolor: 'primary.dark' }} />
        <Stack direction="row" spacing={2} sx={{ p: 2, mt: -5, alignItems: 'flex-end' }}>
          <Avatar
            src={profile.photoUrl ?? undefined}
            alt={fullName}
            sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '1.5rem', border: '3px solid', borderColor: 'background.paper' }}
          >
            {fullName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ pb: 0.5 }}>
            <Typography variant="h5" component="h1">{fullName}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <RoleBadge role={profile.role} />
              {profile.ledCount > 0 && <Chip size="small" color="primary" label={`Líder de ${profile.ledCount}`} />}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ p: 2 }}>
          <Typography variant="body1" color="text.secondary">
            {profile.bio || 'Todavía no agregó una biografía.'}
          </Typography>
          {(profile.ministries.length > 0 || profile.groups.length > 0) && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              {profile.ministries.map((name) => (
                <Chip key={`m-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="ministries" />} label={name} />
              ))}
              {profile.groups.map((name) => (
                <Chip key={`g-${name}`} size="small" variant="outlined" icon={<EntityIcon kind="groups" />} label={name} />
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      {vm.isTenant && <DeleteMemberButton userId={profile.userId} name={fullName} />}
    </Box>
  )
}
