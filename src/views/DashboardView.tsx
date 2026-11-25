import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Card, CardActionArea, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import { LoadingList } from '@/components/Feedback'
import { VerseOfDayCard } from '@/features/bible/components/VerseOfDayCard'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { TenantSessionAlert } from '@/features/congregations/components/TenantSessionAlert'
import { useSessionIdentity } from '@/features/profile/hooks/useSessionIdentity'
import { useDashboardView } from '@/features/dashboard/hooks/useDashboardView'
import { useVerseOfDayCard } from '@/features/bible/hooks/useVerseOfDayCard'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 13) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function StatCard({ to, icon, value, label }: { to: string; icon: ReactNode; value: number; label: string }) {
  return (
    <Card variant="outlined">
      <CardActionArea component={RouterLink} to={to} sx={{ p: 2.5, height: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>{value}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  )
}

/**
 * Home: solo las tarjetas que son acceso directo a cada sección. Los listados
 * de eventos y avisos viven en sus propias vistas (y en el Calendario).
 */
export function DashboardView() {
  const identity = useSessionIdentity()
  const vm = useDashboardView()
  const verseOfDay = useVerseOfDayCard()

  return (
    <Box>
      <TenantSessionAlert error={vm.statsError} />
      {vm.error && !vm.hasData && <Alert severity="error" sx={{ mb: 2 }}>{vm.error.message}</Alert>}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>Inicio</Typography>
          <Typography variant="h4" component="h1">{greeting()}</Typography>
          <Typography variant="body2" color="text.secondary">{identity.displayName}</Typography>
        </Box>
        {vm.isTenant && (
          <Tooltip title="Actualizar conteos">
            <span>
              <IconButton onClick={() => void vm.refreshStats()} disabled={vm.statsLoading} aria-label="Actualizar conteos">
                <RefreshOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <VerseOfDayCard {...verseOfDay} />

      {vm.loading && !vm.hasData ? (
        <LoadingList rows={3} />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: vm.isTenant ? 'repeat(5, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {vm.isTenant && (
            <StatCard to="/miembros" icon={<EntityIcon kind="members" />} value={vm.membersCount} label="Miembros" />
          )}
          {vm.isTenant && (
            <>
              <StatCard to="/ministerios" icon={<EntityIcon kind="ministries" />} value={vm.ministriesCount} label="Ministerios" />
              <StatCard to="/ministerios" icon={<EntityIcon kind="groups" />} value={vm.groupsCount} label="Grupos" />
            </>
          )}
          <StatCard to="/eventos" icon={<EntityIcon kind="events" />} value={vm.eventsCount} label="Eventos" />
          <StatCard to="/avisos" icon={<EntityIcon kind="announcements" />} value={vm.announcementsCount} label="Avisos" />
        </Box>
      )}
    </Box>
  )
}
