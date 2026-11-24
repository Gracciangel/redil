import { Navigate } from 'react-router-dom'
import { Alert, Box, Grid, Paper, Stack, Typography } from '@mui/material'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { EventCard } from '@/features/events/components/EventCard'
import { NewsCard } from '@/features/announcements/components/NewsCard'
import { useMemberHome } from '@/features/members/hooks/useMemberHome'

/**
 * Pantalla principal del miembro (R4).
 *
 * Es SOLO una view: presenta el contenido de solo lectura de su congregación.
 * Si no hay membresía, redirige a `/acceso`, donde el modal de R7 es la única
 * UI visible. No ejecuta RPCs ni CRUD: todo viene del hook `useMemberHome`.
 */
export function MemberHomeView() {
  const vm = useMemberHome()

  if (vm.membershipLoading) {
    return <LoadingList rows={4} />
  }

  if (!vm.hasMembership) {
    return <Navigate to="/acceso" replace />
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Mi espacio
        </Typography>
        <Typography variant="h4" component="h1">
          Hola{vm.memberName ? `, ${vm.memberName}` : ''}
        </Typography>
        <Typography color="text.secondary">{vm.membership?.name ?? vm.congregationName}</Typography>
      </Box>

      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error.message}</Alert>}

      {vm.loading && !vm.hasData ? (
        <LoadingList rows={4} />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <CalendarMonthOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>Próximos eventos</Typography>
              </Stack>
              {vm.upcoming.length === 0 ? (
                <EmptyState icon="calendar" title="No hay eventos próximos" description="Cuando tu congregación publique actividades, vas a verlas acá." />
              ) : (
                <Stack spacing={1.25}>
                  {vm.upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <CampaignOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>Últimos avisos</Typography>
              </Stack>
              {vm.latestAnnouncements.length === 0 ? (
                <EmptyState icon="megaphone" title="Todavía no hay avisos" description="Las novedades de tu congregación van a aparecer acá." />
              ) : (
                <Stack spacing={1.25}>
                  {vm.latestAnnouncements.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
