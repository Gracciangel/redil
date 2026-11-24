import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { DashboardView } from '@/views/DashboardView'
import { useCongregationHome } from '@/features/congregations/hooks/useCongregationHome'

/**
 * Pantalla principal de la congregación.
 *
 * Es SOLO una view: compone la cabecera, reutiliza `DashboardView` como resumen
 * y ofrece accesos a las secciones ya definidas. No carga datos, no llama a
 * Supabase y no decide permisos: eso vive en hooks y servicios.
 */
export function CongregationHomeView() {
  const vm = useCongregationHome()

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Panel de congregación
        </Typography>
        <Typography variant="h4" component="h1">{vm.congregationName}</Typography>
        <Typography color="text.secondary">
          {vm.adminName ? `Administrado por ${vm.adminName}` : 'Administración de la congregación'}
          {vm.adminEmail ? ` · ${vm.adminEmail}` : ''}
        </Typography>
      </Paper>

      {/* Resumen existente: se reutiliza la pantalla ya definida, sin duplicarla. */}
      <DashboardView />

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>
          Gestión de la congregación
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button component={RouterLink} to="/miembros" variant="outlined" startIcon={<EntityIcon kind="members" />}>
            Miembros
          </Button>
          <Button component={RouterLink} to="/ministerios" variant="outlined" startIcon={<EntityIcon kind="ministries" />}>
            Ministerios
          </Button>
          <Button component={RouterLink} to="/ministerios" variant="outlined" startIcon={<EntityIcon kind="groups" />}>
            Grupos
          </Button>
          <Button component={RouterLink} to="/eventos" variant="outlined" startIcon={<EntityIcon kind="events" />}>
            Eventos
          </Button>
          <Button component={RouterLink} to="/avisos" variant="outlined" startIcon={<EntityIcon kind="announcements" />}>
            Avisos
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
